/**
 * Pose layer contract: what every pose source (camera, video file, recorded
 * fixture) emits, and the on-disk fixture format produced by
 * tools/pose/extract_landmarks.py.
 *
 * Landmark indices follow the MediaPipe Pose 33-point topology.
 */

export const POSE_LANDMARK_COUNT = 33

export const LANDMARK = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const

export type LandmarkName = keyof typeof LANDMARK

/** Skeleton edges (pairs of landmark indices) for drawing. */
export const POSE_CONNECTIONS: readonly (readonly [number, number])[] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [28, 30],
  [30, 32],
  [0, 11],
  [0, 12],
]

/** Image-space landmark: x/y normalised to [0,1] of the frame, z relative depth, visibility [0,1]. */
export interface ImageLandmark {
  x: number
  y: number
  z: number
  visibility: number
}

/** World-space landmark in metres, origin at the hip centre. */
export interface WorldLandmark {
  x: number
  y: number
  z: number
}

/** One detected (or missed) pose at source time `t` in milliseconds. */
export interface PoseFrame {
  t: number
  landmarks: readonly ImageLandmark[] | null
  world: readonly WorldLandmark[] | null
}

/** One person found in a frame. */
export interface PoseDetection {
  landmarks: readonly ImageLandmark[]
  world: readonly WorldLandmark[] | null
}

/** Every person found at source time `t`, in detector order (not stable across frames). */
export interface MultiPoseFrame {
  t: number
  poses: readonly PoseDetection[]
}

export type PoseSourceKind = 'camera' | 'video' | 'fixture'

export type PoseSourceStatus = 'idle' | 'starting' | 'running' | 'ended' | 'error'

/**
 * A stream of pose frames. Implementations: CameraPoseSource (getUserMedia +
 * MediaPipe), VideoPoseSource (a <video> URL + MediaPipe) and
 * FixturePoseSource (replays a recorded fixture, no ML, deterministic).
 */
export interface PoseSource {
  readonly kind: PoseSourceKind
  /** Begins emitting frames; resolves once the first frame can be produced. */
  start: (onFrame: (frame: PoseFrame) => void) => Promise<void>
  stop: () => void
  /** The element to draw underneath the skeleton, when the source has one. */
  readonly videoElement: HTMLVideoElement | null
  /** width / height of the frame the landmarks are normalised to; null until the source knows it. */
  readonly frameAspect: number | null
}

/** A source that can report several people per frame (duet mode). */
export interface MultiPoseSource extends PoseSource {
  /** How many people the source looks for per frame. */
  readonly numPoses: number
  startMulti: (onFrame: (frame: MultiPoseFrame) => void) => Promise<void>
}

export const isMultiPoseSource = (source: PoseSource): source is MultiPoseSource =>
  'startMulti' in source && typeof source.startMulti === 'function'

// ---------------------------------------------------------------------------
// Fixture file format (frontend/public/fixtures/pose/*.json)
// ---------------------------------------------------------------------------

/** `[x, y, z, visibility]` */
export type ImageLandmarkTuple = readonly [number, number, number, number]
/** `[x, y, z]` in metres */
export type WorldLandmarkTuple = readonly [number, number, number]

export interface PoseFixtureFrame {
  t: number
  landmarks: readonly ImageLandmarkTuple[] | null
  world: readonly WorldLandmarkTuple[] | null
}

export interface PoseFixtureVideo {
  width: number
  height: number
  fps: number
}

export interface PoseFixture {
  version: 1
  /** Where the clip came from (URL + author); the clip itself is never committed. */
  source: string
  license: string
  video: PoseFixtureVideo
  sampleFps: number
  frames: readonly PoseFixtureFrame[]
}
