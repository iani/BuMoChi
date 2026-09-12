import type {
  ImageLandmark,
  ImageLandmarkTuple,
  PoseFixture,
  PoseFixtureFrame,
  PoseFrame,
  PoseSource,
  WorldLandmark,
  WorldLandmarkTuple,
} from './types'
import { POSE_LANDMARK_COUNT } from './types'

export const FIXTURE_BASE = '/fixtures/pose'

export const POSE_FIXTURES = {
  'belly-dance': `${FIXTURE_BASE}/belly-dance.json`,
  'hiphop-whip': `${FIXTURE_BASE}/hiphop-whip.json`,
} as const

export type PoseFixtureId = keyof typeof POSE_FIXTURES

/** The Wikimedia clips the fixtures were extracted from (480p transcodes), drawn under the replayed skeleton. */
export const POSE_FIXTURE_VIDEOS: Readonly<Record<PoseFixtureId, string>> = {
  'belly-dance':
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/68/German_Belly_Dancer_Jana_Scheiermann%2C_Leverkusen%2C_9th_November_2024.webm/German_Belly_Dancer_Jana_Scheiermann%2C_Leverkusen%2C_9th_November_2024.webm.480p.vp9.webm',
  'hiphop-whip':
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/08/Watch_Me_Whip_-_Tutorial.webm/Watch_Me_Whip_-_Tutorial.webm.480p.vp9.webm',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNumberTuple = (value: unknown, length: number): boolean =>
  Array.isArray(value) && value.length === length && value.every((n) => typeof n === 'number')

const isLandmarkList = (value: unknown, arity: number): boolean =>
  value === null ||
  (Array.isArray(value) &&
    value.length === POSE_LANDMARK_COUNT &&
    value.every((p) => isNumberTuple(p, arity)))

const isFixtureFrame = (value: unknown): value is PoseFixtureFrame =>
  isRecord(value) &&
  typeof value['t'] === 'number' &&
  isLandmarkList(value['landmarks'], 4) &&
  isLandmarkList(value['world'], 3)

export const isPoseFixture = (value: unknown): value is PoseFixture => {
  if (!isRecord(value) || value['version'] !== 1) {
    return false
  }
  const video = value['video']
  return (
    typeof value['source'] === 'string' &&
    typeof value['license'] === 'string' &&
    isRecord(video) &&
    typeof video['width'] === 'number' &&
    typeof video['height'] === 'number' &&
    typeof video['fps'] === 'number' &&
    typeof value['sampleFps'] === 'number' &&
    Array.isArray(value['frames']) &&
    value['frames'].every(isFixtureFrame)
  )
}

export async function loadPoseFixture(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PoseFixture> {
  const res = await fetchImpl(url)
  if (!res.ok) {
    throw new Error(`Pose fixture load failed: ${res.status}`)
  }
  const body: unknown = await res.json()
  if (!isPoseFixture(body)) {
    throw new Error('Unexpected pose fixture payload')
  }
  return body
}

const toImageLandmark = ([x, y, z, visibility]: ImageLandmarkTuple): ImageLandmark => ({
  x,
  y,
  z,
  visibility,
})

const toWorldLandmark = ([x, y, z]: WorldLandmarkTuple): WorldLandmark => ({ x, y, z })

export const toPoseFrame = (frame: PoseFixtureFrame): PoseFrame => ({
  t: frame.t,
  landmarks: frame.landmarks === null ? null : frame.landmarks.map(toImageLandmark),
  world: frame.world === null ? null : frame.world.map(toWorldLandmark),
})

export interface Scheduler {
  setTimeout: (fn: () => void, ms: number) => number
  clearTimeout: (id: number) => void
  now: () => number
}

const realScheduler: Scheduler = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id),
  now: () => performance.now(),
}

export interface FixtureVideo {
  element: HTMLVideoElement
  url: string
}

export interface FixturePoseSourceOptions {
  loop?: boolean
  scheduler?: Scheduler
  /** The clip the landmarks came from; decorative only, replay timing never depends on it. */
  video?: FixtureVideo
}

/** How far the decorative clip may drift from the replayed landmarks before it is re-seeked. */
export const VIDEO_DRIFT_TOLERANCE_MS = 200

/**
 * Replays a recorded fixture at its original timing (drift-corrected against
 * the scheduler clock). Deterministic and ML-free, so it is the source used by
 * unit and Playwright tests and by the dev "mock video" mode. When given the
 * source clip it plays it underneath, re-seeks it to 0 on every lap and
 * whenever it drifts (slow stream start, stalls) so the skeleton stays on the
 * dancer.
 */
export class FixturePoseSource implements PoseSource {
  readonly kind = 'fixture'
  readonly videoElement: HTMLVideoElement | null
  readonly frameAspect: number
  private timer: number | null = null
  private readonly fixture: PoseFixture
  private readonly loop: boolean
  private readonly scheduler: Scheduler
  private readonly video: FixtureVideo | null

  constructor(fixture: PoseFixture, options: FixturePoseSourceOptions = {}) {
    this.fixture = fixture
    this.loop = options.loop ?? true
    this.scheduler = options.scheduler ?? realScheduler
    this.video = options.video ?? null
    this.videoElement = this.video?.element ?? null
    this.frameAspect = fixture.video.width / fixture.video.height
  }

  private seekVideo(ms: number): void {
    if (this.video === null) {
      return
    }
    const { element } = this.video
    element.currentTime = ms / 1000
    element.play().catch(() => {
      // Decorative: a blocked or unreachable clip must not stop the replay.
    })
  }

  private syncVideo(clipMs: number): void {
    if (this.video === null) {
      return
    }
    const { element } = this.video
    if (element.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return
    }
    if (Math.abs(element.currentTime * 1000 - clipMs) > VIDEO_DRIFT_TOLERANCE_MS) {
      this.seekVideo(clipMs)
    }
  }

  start(onFrame: (frame: PoseFrame) => void): Promise<void> {
    const frames = this.fixture.frames
    if (frames.length === 0) {
      return Promise.resolve()
    }
    const firstT = frames[0]?.t ?? 0
    const lastT = frames[frames.length - 1]?.t ?? 0
    const period = lastT - firstT + 1000 / this.fixture.sampleFps
    let index = 0
    let lap = 0
    const startedAt = this.scheduler.now()
    if (this.video !== null) {
      const { element, url } = this.video
      element.muted = true
      element.playsInline = true
      element.crossOrigin = 'anonymous'
      element.loop = true
      element.src = url
      this.seekVideo(0)
    }

    const emit = (): void => {
      const frame = frames[index]
      if (frame === undefined) {
        return
      }
      if (index === 0 && lap > 0) {
        this.seekVideo(0)
      } else {
        this.syncVideo(frame.t - firstT)
      }
      onFrame({ ...toPoseFrame(frame), t: frame.t - firstT + lap * period })
      index += 1
      if (index >= frames.length) {
        if (!this.loop) {
          this.timer = null
          return
        }
        index = 0
        lap += 1
      }
      const next = frames[index]
      if (next === undefined) {
        return
      }
      const due = startedAt + next.t - firstT + lap * period
      this.timer = this.scheduler.setTimeout(emit, Math.max(0, due - this.scheduler.now()))
    }

    emit()
    return Promise.resolve()
  }

  stop(): void {
    if (this.timer !== null) {
      this.scheduler.clearTimeout(this.timer)
      this.timer = null
    }
    this.video?.element.pause()
  }
}
