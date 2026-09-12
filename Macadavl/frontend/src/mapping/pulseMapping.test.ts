import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import { createPulseMapping, estimatePeriod } from './pulseMapping'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const DT = 25
const PERIOD = 500

const features = (overrides: Partial<FeatureFrame>): FeatureFrame => ({
  ...initialFeatureFrame(),
  present: true,
  stillness: 0,
  ...overrides,
})

const swing = (t: number): number => 0.5 + 0.4 * Math.sin((2 * Math.PI * t) / PERIOD)

interface Run {
  last: ControlFrame
  events: MusicEvent[]
}

const runSwing = (mapping: Mapping, from: number, until: number, extra: (t: number) => Partial<FeatureFrame>): Run => {
  const events: MusicEvent[] = []
  let last: ControlFrame | null = null
  for (let t = from; t < until; t += DT) {
    last = mapping.map(features({ t, handHeight: swing(t), ...extra(t) }))
    events.push(...last.events)
  }
  if (last === null) {
    throw new Error('empty run')
  }
  return { last, events }
}

describe('estimatePeriod', () => {
  it('should recover the period of a sinusoid within the lag range', () => {
    // GIVEN
    const samples = Array.from({ length: 160 }, (_, i) => ({ t: i * DT, v: swing(i * DT) }))
    // WHEN
    const estimate = estimatePeriod(samples)
    // THEN
    expect(estimate?.periodMs).toBeCloseTo(PERIOD, -1)
    expect(estimate?.clarity).toBeGreaterThan(0.8)
  })

  it('should return null for too few samples or a flat signal', () => {
    // GIVEN
    const few = Array.from({ length: 10 }, (_, i) => ({ t: i * DT, v: swing(i * DT) }))
    const flat = Array.from({ length: 160 }, (_, i) => ({ t: i * DT, v: 0.5 }))
    // WHEN / THEN
    expect(estimatePeriod(few)).toBeNull()
    expect(estimatePeriod(flat)).toBeNull()
  })
})

describe('createPulseMapping', () => {
  it('should raise density and brightness once a steady swing is detected', () => {
    // GIVEN
    const mapping = createPulseMapping()
    const early = mapping.map(features({ t: 0, handHeight: swing(0) }))
    // WHEN
    const { last } = runSwing(mapping, DT, 6000, () => ({}))
    // THEN
    expect(early.params.density).toBeCloseTo(0.2, 5)
    expect(last.params.density).toBeGreaterThan(0.7)
    expect(last.params.brightness).toBeGreaterThan(early.params.brightness)
  })

  it('should accent every fourth upward swing once the pulse is locked', () => {
    // GIVEN
    const mapping = createPulseMapping()
    runSwing(mapping, 0, 4000, () => ({}))
    // WHEN
    const { events } = runSwing(mapping, 4000, 8000, () => ({}))
    // THEN
    const accents = events.filter((e) => e.kind === 'accent').map((e) => e.t)
    expect(accents.length).toBeGreaterThanOrEqual(1)
    expect(accents.length).toBeLessThanOrEqual(3)
    for (let i = 1; i < accents.length; i += 1) {
      expect((accents[i] ?? 0) - (accents[i - 1] ?? 0)).toBeCloseTo(4 * PERIOD, -2)
    }
  })

  it('should snap continuous sharpness spikes onto the half-beat grid of the swing', () => {
    // GIVEN
    const mapping = createPulseMapping()
    runSwing(mapping, 0, 4000, () => ({}))
    // WHEN
    const { events } = runSwing(mapping, 4000, 8000, () => ({ sharpness: 0.9 }))
    // THEN
    const hits = events.filter((e) => e.kind === 'hit').map((e) => e.t)
    expect(hits.length).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < hits.length; i += 1) {
      const gap = ((hits[i] ?? 0) - (hits[i - 1] ?? 0)) % (PERIOD / 2)
      expect(Math.min(gap, PERIOD / 2 - gap)).toBeLessThanOrEqual(2 * DT)
    }
  })

  it('should emit free-running hits before any pulse is known', () => {
    // GIVEN
    const mapping = createPulseMapping()
    // WHEN
    const frame = mapping.map(features({ t: 0, sharpness: 0.9 }))
    // THEN
    expect(frame.events.map((e) => e.kind)).toStrictEqual(['hit'])
  })

  it('should announce a tempo jump with a sweep', () => {
    // GIVEN
    const mapping = createPulseMapping()
    runSwing(mapping, 0, 5000, () => ({}))
    // WHEN
    const events: MusicEvent[] = []
    for (let t = 5000; t < 12000; t += DT) {
      const frame = mapping.map(features({ t, handHeight: 0.5 + 0.4 * Math.sin((2 * Math.PI * t) / 900) }))
      events.push(...frame.events)
    }
    // THEN
    expect(events.filter((e) => e.kind === 'sweep').length).toBeGreaterThanOrEqual(1)
  })

  it('should drop the pulse, buffer and pending events on reset', () => {
    // GIVEN
    const mapping = createPulseMapping()
    runSwing(mapping, 0, 6000, () => ({ sharpness: 0.9 }))
    // WHEN
    mapping.reset()
    const frame = mapping.map(features({ t: 0, handHeight: swing(0) }))
    // THEN
    expect(frame).toStrictEqual(createPulseMapping().map(features({ t: 0, handHeight: swing(0) })))
    expect(frame.params.density).toBeCloseTo(0.2, 5)
  })
})
