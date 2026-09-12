import { beforeEach, describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import { createDirectMapping } from '../mapping/directMapping'
import { isDanceEngineId, isDanceSourceId, useDanceStore } from './danceStore'

describe('danceStore', () => {
  beforeEach(() => {
    useDanceStore.setState({
      sourceId: 'fixture:belly-dance',
      mode: 'solo',
      cameraId: 'facing:user',
      cameraDevices: [],
      mappingId: 'direct-v0',
      engineId: 'tone',
      mappingIdB: 'direct-v0',
      status: 'idle',
      error: null,
      recording: false,
      features: initialFeatureFrame(),
      control: null,
      featuresB: initialFeatureFrame(),
      controlB: null,
      frameCount: 0,
    })
  })

  it('should count frames and expose the latest features and control on tick', () => {
    // GIVEN
    const features = { ...initialFeatureFrame(100), present: true, energy: 0.5 }
    const control = createDirectMapping().map(features)
    // WHEN
    useDanceStore.getState().tick(features, control)
    useDanceStore.getState().tick(features, control)
    // THEN
    const state = useDanceStore.getState()
    expect(state.frameCount).toBe(2)
    expect(state.features).toStrictEqual(features)
    expect(state.control).toStrictEqual(control)
  })

  it('should keep dancer A and dancer B frames apart on a duet tick', () => {
    // GIVEN
    const a = { ...initialFeatureFrame(100), present: true, energy: 0.2 }
    const b = { ...initialFeatureFrame(100), present: true, energy: 0.9 }
    const controlA = createDirectMapping().map(a)
    const controlB = createDirectMapping().map(b)
    // WHEN
    useDanceStore.getState().tickDuet([a, controlA], [b, controlB])
    // THEN
    expect(useDanceStore.getState()).toMatchObject({
      features: a,
      control: controlA,
      featuresB: b,
      controlB,
      frameCount: 1,
    })
  })

  it('should set the mapping of the requested dancer only', () => {
    // WHEN
    useDanceStore.getState().setMapping('kinesphere', 1)
    useDanceStore.getState().setMapping('signature')
    // THEN
    expect(useDanceStore.getState()).toMatchObject({ mappingId: 'signature', mappingIdB: 'kinesphere' })
  })

  it('should clear the error when a status without one is set', () => {
    // GIVEN
    useDanceStore.getState().setStatus('error', 'boom')
    expect(useDanceStore.getState().error).toBe('boom')
    // WHEN
    useDanceStore.getState().setStatus('running')
    // THEN
    expect(useDanceStore.getState()).toMatchObject({ status: 'running', error: null })
  })

  it('should remember the picked camera and the enumerated devices', () => {
    // WHEN
    useDanceStore.getState().setCamera('device:abc')
    useDanceStore.getState().setCameraDevices([{ deviceId: 'abc', label: 'USB Camera' }])
    // THEN
    expect(useDanceStore.getState()).toMatchObject({
      cameraId: 'device:abc',
      cameraDevices: [{ deviceId: 'abc', label: 'USB Camera' }],
    })
  })

  it('should default to the built-in Tone.js engine and remember a picked engine', () => {
    // GIVEN
    expect(useDanceStore.getState().engineId).toBe('tone')
    // WHEN
    useDanceStore.getState().setEngine('osc')
    // THEN
    expect(useDanceStore.getState().engineId).toBe('osc')
  })

  it.each([
    ['tone', true],
    ['osc', true],
    ['supercollider', false],
    ['toString', false],
  ])('should classify %s as a dance engine id: %s', (value, expected) => {
    // WHEN / THEN
    expect(isDanceEngineId(value)).toBe(expected)
  })

  it.each([
    ['clip:belly-dance', true],
    ['clip:hiphop-whip', true],
    ['camera', true],
    ['fixture:belly-dance', true],
    ['video:demo', false],
    ['toString', false],
    ['tiktok', false],
  ])('should classify %s as a dance source id: %s', (value, expected) => {
    // WHEN / THEN
    expect(isDanceSourceId(value)).toBe(expected)
  })
})
