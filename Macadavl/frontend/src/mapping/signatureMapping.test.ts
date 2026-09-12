import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import { createSignatureMapping } from './signatureMapping'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const features = (overrides: Partial<FeatureFrame>): FeatureFrame => ({
  ...initialFeatureFrame(),
  present: true,
  stillness: 0,
  ...overrides,
})

interface Run {
  last: ControlFrame
  events: MusicEvent[]
}

const run = (mapping: Mapping, frame: Partial<FeatureFrame>, from: number, frames: number): Run => {
  const events: MusicEvent[] = []
  let last = mapping.map(features({ ...frame, t: from }))
  events.push(...last.events)
  for (let i = 1; i < frames; i += 1) {
    last = mapping.map(features({ ...frame, t: from + i * 33 }))
    events.push(...last.events)
  }
  return { last, events }
}

const POSE_A: Partial<FeatureFrame> = { energy: 0.2, armSpread: 0.2, handHeight: 0.2, lowerEnergy: 0.2 }
const POSE_B: Partial<FeatureFrame> = { energy: 0.8, armSpread: 0.8, handHeight: 0.8, lowerEnergy: 0.8 }

describe('createSignatureMapping', () => {
  it('should lift a consistently subtle dancer towards mid intensity instead of the absolute low end', () => {
    // GIVEN
    const mapping = createSignatureMapping()
    const first = mapping.map(features({ t: 0, energy: 0.2 }))
    // WHEN
    const { last } = run(mapping, { energy: 0.2 }, 33, 300)
    // THEN
    expect(first.params.intensity).toBeLessThan(0.33)
    expect(last.params.intensity).toBeGreaterThan(0.38)
    expect(last.params.intensity).toBeLessThan(0.55)
  })

  it('should treat a modest burst as a strong deviation once the personal norm is low', () => {
    // GIVEN
    const mapping = createSignatureMapping()
    run(mapping, { energy: 0.2, handHeight: 0.3 }, 0, 300)
    // WHEN
    const burst = mapping.map(features({ t: 10000, energy: 0.5, handHeight: 0.6 }))
    // THEN
    expect(burst.params.intensity).toBeGreaterThan(0.8)
    expect(burst.params.pitch).toBeGreaterThan(0.9)
  })

  it('should fire hits from a personal sharpness threshold rather than a fixed one', () => {
    // GIVEN
    const calm = createSignatureMapping()
    const busy = createSignatureMapping()
    run(calm, { sharpness: 0.05 }, 0, 300)
    run(busy, { sharpness: 0.6 }, 0, 300)
    // WHEN
    const calmHit = calm.map(features({ t: 10000, sharpness: 0.4 })).events
    const busyHit = busy.map(features({ t: 10000, sharpness: 0.4 })).events
    // THEN
    expect(calmHit.map((e) => e.kind)).toStrictEqual(['hit'])
    expect(busyHit).toStrictEqual([])
  })

  it('should sweep when a new movement state appears and grow density with the vocabulary', () => {
    // GIVEN
    const mapping = createSignatureMapping()
    const first = run(mapping, POSE_A, 0, 30)
    // WHEN
    const second = run(mapping, POSE_B, 1000, 30)
    // THEN
    expect(first.events.filter((e) => e.kind === 'sweep')).toStrictEqual([])
    expect(second.events.filter((e) => e.kind === 'sweep')).toHaveLength(1)
    expect(second.last.params.density).toBeGreaterThan(first.last.params.density)
  })

  it('should answer a returned state with one accent and an echoing room after a dwell', () => {
    // GIVEN
    const mapping = createSignatureMapping()
    run(mapping, POSE_A, 0, 60)
    run(mapping, POSE_B, 2000, 60)
    // WHEN
    const back = run(mapping, POSE_A, 4000, 60)
    // THEN
    const accents = back.events.filter((e) => e.kind === 'accent')
    expect(accents).toHaveLength(1)
    expect(accents[0]?.t).toBeGreaterThanOrEqual(4000 + 1500)
    expect(back.last.params.space).toBeCloseTo(0.5, 5)
  })

  it('should silence intensity while absent and forget the profile on reset', () => {
    // GIVEN
    const mapping = createSignatureMapping()
    run(mapping, POSE_B, 0, 300)
    // WHEN
    const absent = mapping.map(features({ present: false, t: 20000 }))
    mapping.reset()
    // THEN
    expect(absent.params.intensity).toBe(0)
    expect(mapping.map(features({ t: 0, energy: 0.2 }))).toStrictEqual(
      createSignatureMapping().map(features({ t: 0, energy: 0.2 })),
    )
  })
})
