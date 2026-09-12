import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import { createKinesphereMapping } from './kinesphereMapping'
import type { ControlFrame, Mapping } from './types'

const features = (overrides: Partial<FeatureFrame>): FeatureFrame => ({
  ...initialFeatureFrame(),
  present: true,
  confidence: 1,
  stillness: 0,
  ...overrides,
})

const settle = (mapping: Mapping, frame: Partial<FeatureFrame>, frames = 60, from = 0): ControlFrame => {
  let last = mapping.map(features({ ...frame, t: from }))
  for (let i = 1; i < frames; i += 1) {
    last = mapping.map(features({ ...frame, t: from + i * 33 }))
  }
  return last
}

describe('createKinesphereMapping', () => {
  it('should pan relative to the dancer’s own centre and slew back towards it when they return', () => {
    // GIVEN
    const mapping = createKinesphereMapping()
    const home = settle(mapping, { positionX: 0.3 })
    // WHEN
    const stepped = settle(mapping, { positionX: 0.55 }, 60, 2000)
    const back = settle(mapping, { positionX: 0.3 }, 60, 4000)
    // THEN
    expect(home.params.pan).toBeCloseTo(0.5, 1)
    expect(stepped.params.pan).toBeGreaterThan(0.85)
    expect(back.params.pan).toBeLessThan(0.5)
    expect(back.params.pan).toBeGreaterThan(0.35)
  })

  it('should widen and brighten as the dancer expands into the space', () => {
    // GIVEN
    const closed = createKinesphereMapping()
    const opened = createKinesphereMapping()
    // WHEN
    const small = settle(closed, { armSpread: 0.1, stanceWidth: 0.1 })
    const large = settle(opened, { armSpread: 0.9, stanceWidth: 0.9 })
    // THEN
    expect(large.params.width).toBeGreaterThan(small.params.width + 0.5)
    expect(large.params.brightness).toBeGreaterThan(small.params.brightness)
  })

  it('should hold the last expansion while pose confidence is low', () => {
    // GIVEN
    const mapping = createKinesphereMapping()
    const wide = settle(mapping, { armSpread: 0.9, stanceWidth: 0.9 })
    // WHEN
    const doubtful = settle(mapping, { armSpread: 0, stanceWidth: 0, confidence: 0.2 }, 30, 2000)
    // THEN
    expect(doubtful.params.width).toBeCloseTo(wide.params.width, 5)
  })

  it('should fill the room with reverb while travelling and dry it when standing', () => {
    // GIVEN
    const mapping = createKinesphereMapping()
    const standing = settle(mapping, { positionX: 0.5 })
    // WHEN
    let moving = standing
    for (let i = 0; i < 60; i += 1) {
      moving = mapping.map(features({ t: 2000 + i * 33, positionX: 0.5 + 0.02 * (i % 2 === 0 ? 1 : -1) }))
    }
    // THEN
    expect(moving.params.space).toBeGreaterThan(standing.params.space + 0.2)
    expect(moving.params.density).toBeGreaterThan(standing.params.density)
  })

  it('should sweep once when the arms open wide and accent once on a high reach', () => {
    // GIVEN
    const mapping = createKinesphereMapping()
    mapping.map(features({ t: 0, armSpread: 0.2, handHeight: 0.2 }))
    // WHEN
    const opening = mapping.map(features({ t: 33, armSpread: 0.8, handHeight: 0.9 }))
    const held = mapping.map(features({ t: 66, armSpread: 0.9, handHeight: 0.95 }))
    mapping.map(features({ t: 99, armSpread: 0.3, handHeight: 0.3 }))
    const reopened = mapping.map(features({ t: 600, armSpread: 0.8, handHeight: 0.9 }))
    // THEN
    expect(opening.events.map((e) => e.kind)).toStrictEqual(['sweep', 'accent'])
    expect(held.events).toStrictEqual([])
    expect(reopened.events.map((e) => e.kind)).toStrictEqual(['sweep', 'accent'])
  })

  it('should silence intensity while the dancer is absent and re-centre on reset', () => {
    // GIVEN
    const mapping = createKinesphereMapping()
    settle(mapping, { positionX: 0.8 })
    // WHEN
    const absent = mapping.map(features({ present: false, t: 5000 }))
    mapping.reset()
    const fresh = mapping.map(features({ t: 0, positionX: 0.2 }))
    // THEN
    expect(absent.params.intensity).toBe(0)
    expect(fresh.params.pan).toBeCloseTo(0.5, 5)
  })
})
