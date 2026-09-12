import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type {
  MultiPoseFrame,
  MultiPoseSource,
  PoseFrame,
  PoseSource,
  PoseSourceKind,
} from './types'

const TASKS_VISION_VERSION = '1.0.1'
export const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
export const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

export type MediaPipeInput =
  | { kind: 'video'; url: string }
  | { kind: 'camera'; constraints: MediaTrackConstraints }

export interface MediaPipeSourceOptions {
  /** How many people to look for per frame (default 1). */
  numPoses?: number
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null
/** The shared landmarker demands strictly increasing timestamps across every source that ever used it. */
let lastDetectTimestamp = -1

/** One landmarker per page: the WASM + model download is ~18 MB. */
export function getPoseLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= FilesetResolver.forVisionTasks(WASM_BASE).then((vision) =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
    }),
  )
  return landmarkerPromise
}

const waitForVideo = (video: HTMLVideoElement): Promise<void> =>
  new Promise((resolve, reject) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve()
      return
    }
    video.addEventListener('loadeddata', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error('Video failed to load')), {
      once: true,
    })
  })

/**
 * Runs MediaPipe Pose on a <video> element fed either by a remote clip (the
 * dev "mock camera") or by the user's webcam. Frames are timestamped with the
 * video's own clock so downstream features are independent of render rate.
 */
export class MediaPipePoseSource implements PoseSource, MultiPoseSource {
  readonly kind: PoseSourceKind
  readonly videoElement: HTMLVideoElement
  /** Landmarks are normalised to the <video> frame, whose size is only known once it plays. */
  readonly frameAspect = null
  readonly numPoses: number
  private rafId: number | null = null
  private stream: MediaStream | null = null
  private readonly input: MediaPipeInput

  constructor(
    input: MediaPipeInput,
    video: HTMLVideoElement = document.createElement('video'),
    options: MediaPipeSourceOptions = {},
  ) {
    this.input = input
    this.kind = input.kind
    this.videoElement = video
    this.numPoses = options.numPoses ?? 1
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
  }

  start(onFrame: (frame: PoseFrame) => void): Promise<void> {
    return this.startMulti((frame) => {
      const first = frame.poses[0]
      onFrame({
        t: frame.t,
        landmarks: first?.landmarks ?? null,
        world: first?.world ?? null,
      })
    })
  }

  async startMulti(onFrame: (frame: MultiPoseFrame) => void): Promise<void> {
    const video = this.videoElement
    if (this.input.kind === 'camera') {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: this.input.constraints,
        audio: false,
      })
      video.srcObject = this.stream
    } else {
      video.loop = true
      video.src = this.input.url
    }
    const [landmarker] = await Promise.all([getPoseLandmarker(), waitForVideo(video)])
    await landmarker.setOptions({ numPoses: this.numPoses })
    await video.play()

    // A looping clip rewinds and a restarted source begins at 0: both are
    // rebased onto the landmarker's monotonic clock.
    let lastRaw = -1
    let offset: number | null = null
    const tick = (): void => {
      const raw = Math.round(
        this.input.kind === 'camera' ? performance.now() : video.currentTime * 1000,
      )
      if (offset === null || raw < lastRaw) {
        offset = lastDetectTimestamp + 1 - raw
      }
      lastRaw = raw
      const timestamp = raw + offset
      if (timestamp > lastDetectTimestamp && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        lastDetectTimestamp = timestamp
        const result = landmarker.detectForVideo(video, timestamp)
        onFrame({
          t: timestamp,
          poses: result.landmarks.map((landmarks, i) => ({
            landmarks,
            world: result.worldLandmarks[i] ?? null,
          })),
        })
      }
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.videoElement.pause()
    if (this.stream !== null) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
      this.stream = null
      this.videoElement.srcObject = null
    }
  }
}
