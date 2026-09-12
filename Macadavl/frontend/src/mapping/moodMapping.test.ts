import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import { createMoodMapping } from './moodMapping'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const features = (overrides: Partial<FeatureFrame>): FeatureFrame => ({
  ...initialFeatureFrame(),
  present: true,
  stillness: 0,
  ...overrides,
})

type Frame = (i: number) => Partial<FeatureFrame>

const CALM: Frame = () => ({ energy: 0.05, sharpness: 0.05, armSpread: 0.9, handHeight: 0.8 })
const AGITATED: Frame = (i) => ({ energy: 0.95, sharpness: i % 2 === 0 ? 0.9 : 0.3, armSpread: 0.1, handHeight: 0.1 })

interface Run {
  last: ControlFrame
  events: MusicEvent[]
}

const run = (mapping: Mapping, frame: Frame, from: number, frames: number): Run => {
  const events: MusicEvent[] = []
  let last = mapping.map(features({ ...frame(0), t: from }))
  events.push(...last.events)
  for (let i = 1; i < frames; i += 1) {
    last = mapping.map(features({ ...frame(i), t: from + i * 33 }))
    events.push(...last.events)
  }
  return { last, events }
}

describe('createMoodMapping', () => {
  it('should hold the tender scene for calm open movement without emitting a sweep', () => {
    // GIVEN
    const mapping = createMoodMapping()
    // WHEN
    const { last, events } = run(mapping, CALM, 0, 120)
    // THEN
    expect(events.filter((e) => e.kind === 'sweep')).toStrictEqual([])
    expect(last.params.width).toBeGreaterThan(0.85)
    expect(last.params.density).toBeLessThan(0.45)
  })

  it('should switch to the agitated scene after a dwell time and announce it with one sweep', () => {
    // GIVEN
    const mapping = createMoodMapping()
    const calm = run(mapping, CALM, 0, 120).last
    // WHEN
    const { last, events } = run(mapping, AGITATED, 4000, 120)
    // THEN
    const sweeps = events.filter((e) => e.kind === 'sweep')
    expect(sweeps).toHaveLength(1)
    expect(sweeps[0]?.t).toBeGreaterThanOrEqual(4000 + 600)
    expect(last.params.brightness).toBeGreaterThan(calm.params.brightness)
    expect(last.params.space).toBeLessThan(calm.params.space)
    expect(last.params.width).toBeLessThan(calm.params.width)
  })

  it('should ignore a burst shorter than the dwell time', () => {
    // GIVEN
    const mapping = createMoodMapping()
    run(mapping, CALM, 0, 120)
    // WHEN
    const burst = run(mapping, AGITATED, 4000, 12)
    const after = run(mapping, CALM, 4400, 60)
    // THEN
    expect([...burst.events, ...after.events].filter((e) => e.kind === 'sweep')).toStrictEqual([])
  })

  it('should silence intensity while the dancer is absent', () => {
    // GIVEN
    const mapping = createMoodMapping()
    // WHEN
    const frame = mapping.map(features({ present: false, energy: 1 }))
    // THEN
    expect(frame.params.intensity).toBe(0)
    expect(frame.events).toStrictEqual([])
  })

  it('should return to the tender scene on reset', () => {
    // GIVEN
    const mapping = createMoodMapping()
    run(mapping, CALM, 0, 120)
    run(mapping, AGITATED, 4000, 120)
    // WHEN
    mapping.reset()
    // THEN
    expect(mapping.map(features({ t: 0 }))).toStrictEqual(createMoodMapping().map(features({ t: 0 })))
  })
})
