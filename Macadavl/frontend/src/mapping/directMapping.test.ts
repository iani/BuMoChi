import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import { createDirectMapping } from './directMapping'
import type { ControlParams } from './types'

const r = (v: number): number => Math.round(v * 1e6) / 1e6

const round = (p: ControlParams): ControlParams => ({
  intensity: r(p.intensity),
  brightness: r(p.brightness),
  pitch: r(p.pitch),
  width: r(p.width),
  pan: r(p.pan),
  density: r(p.density),
  space: r(p.space),
})

const features = (overrides: Partial<FeatureFrame>): FeatureFrame => ({
  ...initialFeatureFrame(),
  present: true,
  stillness: 0,
  ...overrides,
})

describe('createDirectMapping', () => {
  it('should map each feature to its control parameter', () => {
    // GIVEN
    const mapping = createDirectMapping()
    // WHEN
    const frame = mapping.map(
      features({
        t: 10,
        energy: 1,
        upperEnergy: 0.5,
        handHeight: 0.75,
        armSpread: 1,
        torsoLean: -1,
        lowerEnergy: 0.25,
        stillness: 1,
      }),
    )
    // THEN
    expect(frame.t).toBe(10)
    const expected: ControlParams = {
      intensity: 1,
      brightness: 0.6,
      pitch: 0.75,
      width: 1,
      pan: 0,
      density: 0.4,
      space: 0.9,
    }
    expect(round(frame.params)).toStrictEqual(expected)
  })

  it('should silence intensity and emit no events when the dancer is absent', () => {
    // GIVEN
    const mapping = createDirectMapping()
    // WHEN
    const frame = mapping.map(features({ present: false, energy: 1, sharpness: 1 }))
    // THEN
    expect(frame.params.intensity).toBe(0)
    expect(frame.events).toStrictEqual([])
  })

  it('should emit a hit on a sharpness spike and respect the cooldown', () => {
    // GIVEN
    const mapping = createDirectMapping()
    // WHEN
    const first = mapping.map(features({ t: 0, sharpness: 0.9 }))
    const tooSoon = mapping.map(features({ t: 100, sharpness: 0.9 }))
    const later = mapping.map(features({ t: 400, sharpness: 0.9 }))
    // THEN
    expect(first.events).toStrictEqual([{ kind: 'hit', strength: 0.9, t: 0 }])
    expect(tooSoon.events).toStrictEqual([])
    expect(later.events.map((e) => e.kind)).toStrictEqual(['hit'])
  })

  it('should emit freeze once when stillness rises and release once when it drops', () => {
    // GIVEN
    const mapping = createDirectMapping()
    // WHEN
    const kinds = [0.9, 0.95, 0.6, 0.3, 0.1].map((stillness, i) =>
      mapping.map(features({ t: i * 100, stillness })).events.map((e) => e.kind),
    )
    // THEN
    expect(kinds).toStrictEqual([['freeze'], [], [], ['release'], []])
  })

  it('should forget hit and freeze state on reset()', () => {
    // GIVEN
    const mapping = createDirectMapping()
    mapping.map(features({ t: 0, sharpness: 0.9, stillness: 0.9 }))
    // WHEN
    mapping.reset()
    const frame = mapping.map(features({ t: 50, sharpness: 0.9, stillness: 0.9 }))
    // THEN
    expect(frame.events.map((e) => e.kind)).toStrictEqual(['hit', 'freeze'])
  })
})
