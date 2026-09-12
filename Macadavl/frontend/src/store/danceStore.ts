import { create } from 'zustand'
import type { FeatureFrame } from '../features/types'
import { initialFeatureFrame } from '../features/extractor'
import type { ControlFrame } from '../mapping/types'
import type { MappingId } from '../mapping/registry'
import { DEFAULT_MAPPING_ID } from '../mapping/registry'
import type { CameraDevice } from '../pose/camera'
import { DEFAULT_CAMERA_ID } from '../pose/camera'
import type { PoseSourceStatus } from '../pose/types'

/**
 * Every source feeds the same pipeline; only where the frames come from differs.
 * `clip:*` and `camera` run MediaPipe live on the frames being shown, so pose and
 * picture share one clock. `fixture:*` replays landmarks recorded offline (no ML)
 * and exists for deterministic tests and low-power machines.
 */
export const DANCE_SOURCES = {
  'clip:belly-dance': 'Clip · belly dance (live MediaPipe)',
  'clip:hiphop-whip': 'Clip · hip-hop whip (live MediaPipe)',
  camera: 'Camera · live MediaPipe',
  'fixture:belly-dance': 'Replay · belly dance landmarks (no ML, test fixture)',
  'fixture:hiphop-whip': 'Replay · hip-hop whip landmarks (no ML, test fixture)',
} as const

export type DanceSourceId = keyof typeof DANCE_SOURCES

export const isDanceSourceId = (value: string): value is DanceSourceId =>
  Object.hasOwn(DANCE_SOURCES, value)

/** Where ControlFrames go: the built-in Tone.js synth or a local SuperCollider via tools/sc-bridge. */
export const DANCE_ENGINES = {
  tone: 'Tone.js (built-in)',
  osc: 'SuperCollider (local OSC bridge)',
} as const

export type DanceEngineId = keyof typeof DANCE_ENGINES

export const isDanceEngineId = (value: string): value is DanceEngineId =>
  Object.hasOwn(DANCE_ENGINES, value)

export const DANCE_MODES = {
  solo: 'One dancer',
  duet: 'Two dancers (A / B)',
} as const

export type DanceMode = keyof typeof DANCE_MODES

export const isDanceMode = (value: string): value is DanceMode => Object.hasOwn(DANCE_MODES, value)

export type DancerIndex = 0 | 1

export interface DanceState {
  sourceId: DanceSourceId
  mode: DanceMode
  /** `facing:user` | `facing:environment` | `device:<deviceId>`; only used by the camera source. */
  cameraId: string
  cameraDevices: readonly CameraDevice[]
  /** Dancer A's mapping (the only one used in solo mode). */
  mappingId: MappingId
  engineId: DanceEngineId
  /** Dancer B's mapping, duet mode only. */
  mappingIdB: MappingId
  status: PoseSourceStatus
  error: string | null
  recording: boolean
  /** Dancer A's latest frame (the only one used in solo mode). */
  features: FeatureFrame
  control: ControlFrame | null
  /** Dancer B's latest frame, duet mode only. */
  featuresB: FeatureFrame
  controlB: ControlFrame | null
  frameCount: number
  setSource: (sourceId: DanceSourceId) => void
  setMode: (mode: DanceMode) => void
  setCamera: (cameraId: string) => void
  setCameraDevices: (cameraDevices: readonly CameraDevice[]) => void
  setMapping: (mappingId: MappingId, dancer?: DancerIndex) => void
  setEngine: (engineId: DanceEngineId) => void
  setStatus: (status: PoseSourceStatus, error?: string) => void
  setRecording: (recording: boolean) => void
  tick: (features: FeatureFrame, control: ControlFrame) => void
  tickDuet: (a: readonly [FeatureFrame, ControlFrame], b: readonly [FeatureFrame, ControlFrame]) => void
}

export const useDanceStore = create<DanceState>((set) => ({
  sourceId: 'clip:belly-dance',
  mode: 'solo',
  cameraId: DEFAULT_CAMERA_ID,
  cameraDevices: [],
  mappingId: DEFAULT_MAPPING_ID,
  engineId: 'tone',
  mappingIdB: DEFAULT_MAPPING_ID,
  status: 'idle',
  error: null,
  recording: false,
  features: initialFeatureFrame(),
  control: null,
  featuresB: initialFeatureFrame(),
  controlB: null,
  frameCount: 0,
  setSource: (sourceId) => set({ sourceId }),
  setMode: (mode) => set({ mode }),
  setCamera: (cameraId) => set({ cameraId }),
  setCameraDevices: (cameraDevices) => set({ cameraDevices }),
  setMapping: (mappingId, dancer = 0) => set(dancer === 0 ? { mappingId } : { mappingIdB: mappingId }),
  setEngine: (engineId) => set({ engineId }),
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setRecording: (recording) => set({ recording }),
  tick: (features, control) =>
    set((state) => ({ features, control, frameCount: state.frameCount + 1 })),
  tickDuet: ([features, control], [featuresB, controlB]) =>
    set((state) => ({ features, control, featuresB, controlB, frameCount: state.frameCount + 1 })),
}))
