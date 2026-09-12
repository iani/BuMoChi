import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import { createEffortMapping } from './effortMapping'
import type { ControlFrame, Mapping } from './types'

const features = (overrides: Partial<FeatureFrame>): FeatureFrame => ({
  ...initialFeatureFrame(),
  present: true,
  stillness: 0,
  ...overrides,
})

const settle = (mapping: Mapping, frame: Partial<FeatureFrame>, frames = 60): ControlFrame => {
  let last = mapping.map(features({ ...frame, t: 0 }))
  for (let i = 1; i < frames; i += 1) {
    last = mapping.map(features({ ...frame, t: i * 33 }))
  }
  return last
}

describe('createEffortMapping', () => {
  it('should push strong, low, wide movement into a heavy low register and light movement into a high one', () => {
    // GIVEN
    const strong = createEffortMapping()
    const light = createEffortMapping()
    // WHEN
    const heavy = settle(strong, { lowerEnergy: 1, positionY: 1, stanceWidth: 1, energy: 0.5 })
    const floating = settle(light, { lowerEnergy: 0, positionY: 0, stanceWidth: 0, energy: 0.5, handHeight: 0.2 })
    // THEN
    expect(heavy.params.pitch).toBeLessThan(floating.params.pitch)
    expect(heavy.params.intensity).toBeGreaterThan(floating.params.intensity)
    expect(heavy.params.brightness).toBeGreaterThan(floating.params.brightness)
  })

  it('should widen the stereo image for symmetric, spread movement and narrow it for one-sided movement', () => {
    // GIVEN
    const indirect = createEffortMapping()
    const direct = createEffortMapping()
    // WHEN
    const wide = settle(indirect, { symmetry: 0, armSpread: 1 })
    const narrow = settle(direct, { symmetry: 1, armSpread: 0 })
    // THEN
    expect(wide.params.width).toBeCloseTo(1, 1)
    expect(narrow.params.width).toBeCloseTo(0.2, 1)
  })

  it('should dry the reverb when sharpness jitters (bound flow) and open it for steady movement', () => {
    // GIVEN
    const jittery = createEffortMapping()
    const steady = createEffortMapping()
    // WHEN
    let bound: ControlFrame = jittery.map(features({ t: 0 }))
    for (let i = 1; i < 60; i += 1) {
      bound = jittery.map(features({ t: i * 33, sharpness: i % 2 === 0 ? 1 : 0 }))
    }
    const free = settle(steady, { sharpness: 0.3 })
    // THEN
    expect(bound.params.space).toBeLessThan(free.params.space)
  })

  it('should add an accent to a hit only while the weight quality is strong', () => {
    // GIVEN
    const strong = createEffortMapping()
    const light = createEffortMapping()
    settle(strong, { lowerEnergy: 1, positionY: 1, stanceWidth: 1 })
    settle(light, { lowerEnergy: 0, positionY: 0, stanceWidth: 0 })
    // WHEN
    const strongEvents = strong.map(features({ t: 5000, sharpness: 0.9, lowerEnergy: 1, positionY: 1, stanceWidth: 1 })).events
    const lightEvents = light.map(features({ t: 5000, sharpness: 0.9 })).events
    // THEN
    expect(strongEvents.map((e) => e.kind)).toStrictEqual(['hit', 'accent'])
    expect(lightEvents.map((e) => e.kind)).toStrictEqual(['hit'])
  })

  it('should silence intensity and emit no events while the dancer is absent', () => {
    // GIVEN
    const mapping = createEffortMapping()
    // WHEN
    const frame = mapping.map(features({ present: false, energy: 1, sharpness: 1 }))
    // THEN
    expect(frame.params.intensity).toBe(0)
    expect(frame.events).toStrictEqual([])
  })

  it('should forget the smoothed qualities on reset', () => {
    // GIVEN
    const mapping = createEffortMapping()
    const fresh = createEffortMapping()
    settle(mapping, { lowerEnergy: 1, positionY: 1, stanceWidth: 1, sharpness: 1 })
    // WHEN
    mapping.reset()
    // THEN
    expect(mapping.map(features({ t: 0 }))).toStrictEqual(fresh.map(features({ t: 0 })))
  })
})
