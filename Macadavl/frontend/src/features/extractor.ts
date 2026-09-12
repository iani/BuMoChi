import type { ImageLandmark, PoseFrame } from '../pose/types'
import { LANDMARK } from '../pose/types'
import type { FeatureExtractorOptions, FeatureFrame } from './types'

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
const clamp11 = (v: number): number => Math.min(1, Math.max(-1, v))
/** 1 - e^(-x): maps [0,∞) onto [0,1) with 0.63 at x = 1. */
const squash = (v: number): number => 1 - Math.exp(-Math.max(0, v))

const UPPER = [LANDMARK.leftWrist, LANDMARK.rightWrist, LANDMARK.leftElbow, LANDMARK.rightElbow]
const LOWER = [LANDMARK.leftKnee, LANDMARK.rightKnee, LANDMARK.leftAnkle, LANDMARK.rightAnkle]
const LEFT = [LANDMARK.leftWrist, LANDMARK.leftElbow, LANDMARK.leftKnee, LANDMARK.leftAnkle]
const RIGHT = [LANDMARK.rightWrist, LANDMARK.rightElbow, LANDMARK.rightKnee, LANDMARK.rightAnkle]
const CORE = [LANDMARK.leftShoulder, LANDMARK.rightShoulder, LANDMARK.leftHip, LANDMARK.rightHip]
const TRACKED = [...UPPER, ...LOWER]

const dist = (a: ImageLandmark, b: ImageLandmark): number => Math.hypot(a.x - b.x, a.y - b.y)

const mid = (a: ImageLandmark, b: ImageLandmark): { x: number; y: number } => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
})

export const initialFeatureFrame = (t = 0): FeatureFrame => ({
  t,
  present: false,
  confidence: 0,
  leftHandHeight: 0,
  rightHandHeight: 0,
  handHeight: 0,
  armSpread: 0,
  torsoLean: 0,
  positionX: 0.5,
  positionY: 0.5,
  stanceWidth: 0,
  energy: 0,
  upperEnergy: 0,
  lowerEnergy: 0,
  sharpness: 0,
  stillness: 1,
  symmetry: 0,
})

interface Body {
  lm: readonly ImageLandmark[]
  shoulderWidth: number
  torso: number
  hip: { x: number; y: number }
  shoulder: { x: number; y: number }
}

const at = (lm: readonly ImageLandmark[], i: number): ImageLandmark =>
  lm[i] ?? { x: 0, y: 0, z: 0, visibility: 0 }

const measure = (lm: readonly ImageLandmark[]): Body => {
  const ls = at(lm, LANDMARK.leftShoulder)
  const rs = at(lm, LANDMARK.rightShoulder)
  const lh = at(lm, LANDMARK.leftHip)
  const rh = at(lm, LANDMARK.rightHip)
  const shoulder = mid(ls, rs)
  const hip = mid(lh, rh)
  return {
    lm,
    shoulderWidth: Math.max(dist(ls, rs), 1e-3),
    torso: Math.max(Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y), 1e-3),
    hip,
    shoulder,
  }
}

/**
 * Stateful per-frame feature extraction. Feed pose frames in time order; each
 * call returns a complete FeatureFrame. Pure apart from its own history, so it
 * is unit-tested against the recorded fixtures.
 */
export class FeatureExtractor {
  private prev: Body | null = null
  private prevT = 0
  private prevSpeed = 0
  private last: FeatureFrame = initialFeatureFrame()
  private readonly alpha: number
  private readonly energyScale: number
  private readonly stillnessThreshold: number

  constructor(options: FeatureExtractorOptions = {}) {
    this.alpha = options.smoothing ?? 0.35
    this.energyScale = options.energyScale ?? 2.5
    this.stillnessThreshold = options.stillnessThreshold ?? 0.35
  }

  reset(): void {
    this.prev = null
    this.prevT = 0
    this.prevSpeed = 0
    this.last = initialFeatureFrame()
  }

  get current(): FeatureFrame {
    return this.last
  }

  push(frame: PoseFrame): FeatureFrame {
    if (frame.landmarks === null) {
      this.last = { ...this.last, t: frame.t, present: false, confidence: 0 }
      this.prev = null
      return this.last
    }
    const body = measure(frame.landmarks)
    const lm = body.lm
    const s = (prevValue: number, next: number): number =>
      prevValue + this.alpha * (next - prevValue)

    const handHeightOf = (i: number): number =>
      clamp01((body.hip.y - at(lm, i).y) / body.torso / 1.6)
    const leftHandHeight = s(this.last.leftHandHeight, handHeightOf(LANDMARK.leftWrist))
    const rightHandHeight = s(this.last.rightHandHeight, handHeightOf(LANDMARK.rightWrist))
    const armSpread = s(
      this.last.armSpread,
      clamp01(dist(at(lm, LANDMARK.leftWrist), at(lm, LANDMARK.rightWrist)) / body.shoulderWidth / 3),
    )
    const ls = at(lm, LANDMARK.leftShoulder)
    const rs = at(lm, LANDMARK.rightShoulder)
    const torsoLean = s(this.last.torsoLean, clamp11((rs.y - ls.y) / body.shoulderWidth))
    const stanceWidth = s(
      this.last.stanceWidth,
      clamp01(dist(at(lm, LANDMARK.leftAnkle), at(lm, LANDMARK.rightAnkle)) / body.shoulderWidth / 2),
    )
    const confidence = CORE.reduce((sum, i) => sum + at(lm, i).visibility, 0) / CORE.length
    const positionX = s(this.last.positionX, clamp01(body.hip.x))
    const positionY = s(this.last.positionY, clamp01(body.hip.y))

    let energy = this.last.energy
    let upperEnergy = this.last.upperEnergy
    let lowerEnergy = this.last.lowerEnergy
    let sharpness = this.last.sharpness
    let symmetry = this.last.symmetry
    let stillness = this.last.stillness

    const prev = this.prev
    const dt = (frame.t - this.prevT) / 1000
    if (prev !== null && dt > 0) {
      const speedOf = (indices: readonly number[]): number =>
        indices.reduce((sum, i) => sum + dist(at(lm, i), at(prev.lm, i)), 0) /
        indices.length /
        body.torso /
        dt
      const speed = speedOf(TRACKED)
      const upper = speedOf(UPPER)
      const lower = speedOf(LOWER)
      const left = speedOf(LEFT)
      const right = speedOf(RIGHT)
      energy = s(energy, squash(speed / this.energyScale))
      upperEnergy = s(upperEnergy, squash(upper / this.energyScale))
      lowerEnergy = s(lowerEnergy, squash(lower / this.energyScale))
      const accel = Math.abs(speed - this.prevSpeed) / dt
      sharpness = s(sharpness, squash(accel / (this.energyScale * 8)))
      symmetry = s(symmetry, left + right > 1e-6 ? clamp11((right - left) / (left + right)) : 0)
      const stillNow = speed < this.stillnessThreshold ? 1 : 0
      stillness = s(stillness, stillNow)
      this.prevSpeed = speed
    }

    this.prev = body
    this.prevT = frame.t
    this.last = {
      t: frame.t,
      present: true,
      confidence,
      leftHandHeight,
      rightHandHeight,
      handHeight: Math.max(leftHandHeight, rightHandHeight),
      armSpread,
      torsoLean,
      positionX,
      positionY,
      stanceWidth,
      energy,
      upperEnergy,
      lowerEnergy,
      sharpness,
      stillness,
      symmetry,
    }
    return this.last
  }
}
