import { describe, expect, it } from 'vitest'
import { poseFrame, standingPose } from '../test/pose'
import { FeatureExtractor, initialFeatureFrame } from './extractor'
import type { FeatureFrame } from './types'

/** Feed the same landmarks repeatedly so the smoothing converges. */
const settle = (extractor: FeatureExtractor, frames: readonly ReturnType<typeof poseFrame>[]): FeatureFrame => {
  let last = initialFeatureFrame()
  for (const f of frames) {
    last = extractor.push(f)
  }
  return last
}

const still = (count: number, options = {}): ReturnType<typeof poseFrame>[] =>
  Array.from({ length: count }, (_, i) => poseFrame(i * 100, standingPose(options)))

describe('FeatureExtractor', () => {
  it('should report absence and keep the previous values when no dancer is detected', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    settle(extractor, still(5, { handsUp: 1 }))
    // WHEN
    const frame = extractor.push(poseFrame(500, null))
    // THEN
    expect(frame.present).toBe(false)
    expect(frame.confidence).toBe(0)
    expect(frame.t).toBe(500)
    expect(frame.handHeight).toBeGreaterThan(0.5)
  })

  it('should mark a standing dancer as present with full confidence and no energy', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    // WHEN
    const frame = settle(extractor, still(10))
    // THEN
    expect(frame.present).toBe(true)
    expect(frame.confidence).toBe(1)
    expect(frame.energy).toBe(0)
    expect(frame.stillness).toBeGreaterThan(0.9)
    expect(frame.handHeight).toBe(0)
  })

  it('should raise handHeight when the wrists go above the head', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    // WHEN
    const frame = settle(extractor, still(20, { handsUp: 1 }))
    // THEN
    expect(frame.handHeight).toBeGreaterThan(0.9)
    expect(frame.leftHandHeight).toBeCloseTo(frame.rightHandHeight, 5)
  })

  it('should raise armSpread when the wrists move apart', () => {
    // GIVEN
    const narrow = settle(new FeatureExtractor(), still(20, { spread: 0.5 }))
    // WHEN
    const wide = settle(new FeatureExtractor(), still(20, { spread: 3 }))
    // THEN
    expect(wide.armSpread).toBeGreaterThan(narrow.armSpread)
    expect(wide.armSpread).toBeGreaterThan(0.9)
  })

  it('should track the horizontal position of the hips', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    // WHEN
    const frame = settle(extractor, still(20, { x: 0.2 }))
    // THEN
    expect(frame.positionX).toBeCloseTo(0.2, 2)
  })

  it('should produce energy, break stillness and report upper-body dominance when only the arms move', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    settle(extractor, still(5))
    const waving = Array.from({ length: 20 }, (_, i) =>
      poseFrame(500 + i * 100, standingPose({ handsUp: i % 2, spread: 1 + (i % 2) })),
    )
    // WHEN
    const frame = settle(extractor, waving)
    // THEN
    expect(frame.energy).toBeGreaterThan(0.3)
    expect(frame.upperEnergy).toBeGreaterThan(frame.lowerEnergy)
    expect(frame.lowerEnergy).toBe(0)
    expect(frame.stillness).toBeLessThan(0.1)
  })

  it('should report symmetric movement as zero symmetry bias', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    const waving = Array.from({ length: 20 }, (_, i) => poseFrame(i * 100, standingPose({ handsUp: i % 2 })))
    // WHEN
    const frame = settle(extractor, waving)
    // THEN
    expect(frame.symmetry).toBeCloseTo(0, 5)
  })

  it('should spike sharpness on a sudden change of speed', () => {
    // GIVEN
    const extractor = new FeatureExtractor({ smoothing: 1 })
    settle(extractor, still(5))
    // WHEN
    const frame = extractor.push(poseFrame(500, standingPose({ handsUp: 1, spread: 3 })))
    // THEN
    expect(frame.sharpness).toBeGreaterThan(0.5)
  })

  it('should return to the initial frame after reset()', () => {
    // GIVEN
    const extractor = new FeatureExtractor()
    settle(extractor, still(5, { handsUp: 1 }))
    // WHEN
    extractor.reset()
    // THEN
    expect(extractor.current).toStrictEqual(initialFeatureFrame())
  })
})
