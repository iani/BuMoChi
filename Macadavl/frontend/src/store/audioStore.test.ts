import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_BPM, MIN_BPM, clampBpm, useAudioStore } from './audioStore'

describe('audioStore', () => {
  beforeEach(() => {
    useAudioStore.setState({ transport: 'stopped', bpm: 120, masterVolumeDb: 0 })
  })

  it('should start stopped at 120 bpm', () => {
    const { transport, bpm } = useAudioStore.getState()
    expect(transport).toBe('stopped')
    expect(bpm).toBe(120)
  })

  it('should clamp bpm into the supported range', () => {
    useAudioStore.getState().setBpm(5)
    expect(useAudioStore.getState().bpm).toBe(MIN_BPM)
    useAudioStore.getState().setBpm(9999)
    expect(useAudioStore.getState().bpm).toBe(MAX_BPM)
    expect(clampBpm(127.6)).toBe(128)
  })

  it('should update transport state', () => {
    useAudioStore.getState().setTransport('playing')
    expect(useAudioStore.getState().transport).toBe('playing')
  })
})
