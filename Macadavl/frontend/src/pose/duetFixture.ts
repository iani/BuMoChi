import { FixturePoseSource, toPoseFrame, type FixturePoseSourceOptions } from './fixture'
import type {
  ImageLandmark,
  MultiPoseFrame,
  MultiPoseSource,
  PoseDetection,
  PoseFixture,
  PoseFrame,
} from './types'

/** Two portrait clips side by side make a widescreen stage. */
const DUET_STAGE_ASPECT = 16 / 9
const HALF_MARGIN = 0.04

/** Rescales a full-frame pose into the left (0) or right (1) half of the stage. */
export const placeInHalf = (
  landmarks: readonly ImageLandmark[],
  half: 0 | 1,
): readonly ImageLandmark[] => {
  const scale = 0.5 - 2 * HALF_MARGIN
  const offset = half * 0.5 + HALF_MARGIN
  return landmarks.map((p) => ({ ...p, x: offset + p.x * scale }))
}

const framePeriod = (fixture: PoseFixture): number => {
  const first = fixture.frames[0]?.t ?? 0
  const last = fixture.frames[fixture.frames.length - 1]?.t ?? 0
  return last - first + 1000 / fixture.sampleFps
}

/** The frame that is current at clip time `ms` (looping), or undefined for an empty fixture. */
const sampleAt = (fixture: PoseFixture, ms: number): PoseFrame | undefined => {
  const frames = fixture.frames
  const first = frames[0]
  if (first === undefined) {
    return undefined
  }
  const local = first.t + (ms % framePeriod(fixture))
  let current = first
  for (const frame of frames) {
    if (frame.t > local) {
      break
    }
    current = frame
  }
  return toPoseFrame(current)
}

export type DuetFixtureOptions = Pick<FixturePoseSourceOptions, 'loop' | 'scheduler'>

/**
 * Deterministic two-dancer source for tests and low-power machines: replays one
 * fixture as the left dancer on its own clock and samples a second fixture by
 * time as the right dancer, so the pair is stable, ML-free and needs no video.
 */
export class DuetFixturePoseSource implements MultiPoseSource {
  readonly kind = 'fixture'
  readonly numPoses = 2
  readonly videoElement = null
  readonly frameAspect = DUET_STAGE_ASPECT
  private readonly left: FixturePoseSource
  private readonly right: PoseFixture

  constructor(left: PoseFixture, right: PoseFixture, options: DuetFixtureOptions = {}) {
    this.left = new FixturePoseSource(left, options)
    this.right = right
  }

  start(onFrame: (frame: PoseFrame) => void): Promise<void> {
    return this.startMulti((frame) => {
      const first = frame.poses[0]
      onFrame({ t: frame.t, landmarks: first?.landmarks ?? null, world: first?.world ?? null })
    })
  }

  startMulti(onFrame: (frame: MultiPoseFrame) => void): Promise<void> {
    return this.left.start((leftFrame) => {
      const poses: PoseDetection[] = []
      if (leftFrame.landmarks !== null) {
        poses.push({ landmarks: placeInHalf(leftFrame.landmarks, 0), world: leftFrame.world })
      }
      const rightFrame = sampleAt(this.right, leftFrame.t)
      if (rightFrame !== undefined && rightFrame.landmarks !== null) {
        poses.push({ landmarks: placeInHalf(rightFrame.landmarks, 1), world: rightFrame.world })
      }
      onFrame({ t: leftFrame.t, poses })
    })
  }

  stop(): void {
    this.left.stop()
  }
}
