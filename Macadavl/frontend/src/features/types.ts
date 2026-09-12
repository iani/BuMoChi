/**
 * Movement features derived from one pose frame plus recent history. All
 * values are normalised to the dancer's own body scale (shoulder width /
 * torso length) so they are comparable across people, distances and cameras.
 *
 * Ranges are nominal [0,1] unless noted; `null` landmarks yield a frame with
 * `present: false` and the previous smoothed values held.
 */
export interface FeatureFrame {
  /** Source time in ms. */
  t: number
  /** Was a pose detected in this frame? */
  present: boolean
  /** Mean visibility of the core landmarks (shoulders, hips, wrists). */
  confidence: number

  /** Left/right wrist height above the hips, in torso lengths, clamped to [0,1]. */
  leftHandHeight: number
  rightHandHeight: number
  /** Highest of the two hands. */
  handHeight: number
  /** Wrist-to-wrist distance in shoulder widths, scaled so 3 → 1. */
  armSpread: number
  /** Shoulder-line tilt in [-1,1]: negative = leaning to the dancer's right. */
  torsoLean: number
  /** Horizontal position of the hip centre in the frame, [0,1] (0 = left edge). */
  positionX: number
  /** Vertical position of the hip centre, [0,1] (0 = top). Jumps read as dips here. */
  positionY: number
  /** Ankle-to-ankle distance in shoulder widths, scaled so 2 → 1. */
  stanceWidth: number

  /** Smoothed overall movement speed (body-scaled units/s), squashed to [0,1]. */
  energy: number
  /** Movement of the upper body only (wrists + elbows), [0,1]. */
  upperEnergy: number
  /** Movement of the lower body only (knees + ankles), [0,1]. */
  lowerEnergy: number
  /** Instantaneous acceleration magnitude, [0,1]; spikes on sharp hits. */
  sharpness: number
  /** 1 while the dancer holds still, decays as movement resumes. */
  stillness: number
  /** Left-vs-right activity balance in [-1,1]: negative = left side moves more. */
  symmetry: number
}

export interface FeatureExtractorOptions {
  /** Exponential smoothing factor for continuous values per frame, (0,1]. */
  smoothing?: number
  /** Velocity (body units/s) that maps to energy ≈ 0.63. */
  energyScale?: number
  /** Below this smoothed speed the dancer counts as still. */
  stillnessThreshold?: number
}
