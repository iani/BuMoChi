import type { Scheduler } from '../pose/fixture'
import type { ImageLandmark, PoseFixture, PoseFixtureFrame, PoseFrame } from '../pose/types'
import { LANDMARK, POSE_LANDMARK_COUNT } from '../pose/types'

export interface StandingPoseOptions {
  /** Horizontal centre of the hips, 0..1. */
  x?: number
  /** Wrist height relative to the hips: 0 = at the hips, 1 = well above the head. */
  handsUp?: number
  /** Distance between the wrists in shoulder widths. */
  spread?: number
}

/**
 * Synthetic upright dancer in normalised image space: shoulders at y=0.35,
 * hips at y=0.55 (torso 0.2), shoulder width 0.2. Everything else hangs from
 * those anchors so single-feature tests can move one part at a time.
 */
export const standingPose = (options: StandingPoseOptions = {}): ImageLandmark[] => {
  const x = options.x ?? 0.5
  const handsUp = options.handsUp ?? 0
  const spread = options.spread ?? 1
  const lm: ImageLandmark[] = Array.from({ length: POSE_LANDMARK_COUNT }, () => ({
    x,
    y: 0.5,
    z: 0,
    visibility: 1,
  }))
  const set = (i: number, px: number, py: number): void => {
    lm[i] = { x: px, y: py, z: 0, visibility: 1 }
  }
  set(LANDMARK.nose, x, 0.2)
  set(LANDMARK.leftShoulder, x + 0.1, 0.35)
  set(LANDMARK.rightShoulder, x - 0.1, 0.35)
  set(LANDMARK.leftHip, x + 0.07, 0.55)
  set(LANDMARK.rightHip, x - 0.07, 0.55)
  set(LANDMARK.leftElbow, x + 0.12, 0.47)
  set(LANDMARK.rightElbow, x - 0.12, 0.47)
  set(LANDMARK.leftWrist, x + 0.1 * spread, 0.55 - handsUp * 0.32)
  set(LANDMARK.rightWrist, x - 0.1 * spread, 0.55 - handsUp * 0.32)
  set(LANDMARK.leftKnee, x + 0.06, 0.75)
  set(LANDMARK.rightKnee, x - 0.06, 0.75)
  set(LANDMARK.leftAnkle, x + 0.06, 0.95)
  set(LANDMARK.rightAnkle, x - 0.06, 0.95)
  return lm
}

export const poseFrame = (t: number, landmarks: ImageLandmark[] | null = standingPose()): PoseFrame => ({
  t,
  landmarks,
  world: null,
})

export const fixtureFrame = (t: number, landmarks: ImageLandmark[] = standingPose()): PoseFixtureFrame => ({
  t,
  landmarks: landmarks.map((p) => [p.x, p.y, p.z, p.visibility]),
  world: null,
})

export const makeFixture = (frames: readonly PoseFixtureFrame[], sampleFps = 10): PoseFixture => ({
  version: 1,
  source: 'synthetic',
  license: 'CC0',
  video: { width: 640, height: 360, fps: 30 },
  sampleFps,
  frames,
})

export interface FakeClock extends Scheduler {
  advance: (ms: number) => void
}

/** Deterministic replacement for setTimeout/performance.now: timers fire in due order on `advance`. */
export const fakeClock = (): FakeClock => {
  let time = 0
  let nextId = 1
  const timers = new Map<number, { due: number; fn: () => void }>()
  return {
    now: () => time,
    setTimeout: (fn, ms) => {
      const id = nextId++
      timers.set(id, { due: time + ms, fn })
      return id
    },
    clearTimeout: (id) => {
      timers.delete(id)
    },
    advance: (ms) => {
      const target = time + ms
      const earliest = (): [number, { due: number; fn: () => void }] | undefined =>
        [...timers.entries()].toSorted((a, b) => a[1].due - b[1].due)[0]
      let next = earliest()
      while (next !== undefined && next[1].due <= target) {
        time = next[1].due
        timers.delete(next[0])
        next[1].fn()
        next = earliest()
      }
      time = target
    },
  }
}
