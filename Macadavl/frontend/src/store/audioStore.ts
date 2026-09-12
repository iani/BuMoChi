import { create } from 'zustand'

export type TransportState = 'stopped' | 'playing' | 'paused'

export interface AudioState {
  transport: TransportState
  bpm: number
  masterVolumeDb: number
  setTransport: (transport: TransportState) => void
  setBpm: (bpm: number) => void
  setMasterVolumeDb: (db: number) => void
}

export const MIN_BPM = 20
export const MAX_BPM = 300

export const clampBpm = (bpm: number): number =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)))

export const useAudioStore = create<AudioState>((set) => ({
  transport: 'stopped',
  bpm: 120,
  masterVolumeDb: 0,
  setTransport: (transport) => set({ transport }),
  setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
  setMasterVolumeDb: (masterVolumeDb) => set({ masterVolumeDb }),
}))
