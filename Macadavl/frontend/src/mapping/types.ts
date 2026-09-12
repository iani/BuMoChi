import type { FeatureFrame } from '../features/types'

/**
 * The one deliberately open seam of the pipeline: a Mapping turns movement
 * features into a ControlFrame that the audio engine and visuals consume.
 * Everything upstream (pose, features) and downstream (engine, canvas,
 * recorder) is fixed; swap or add mappings in `mapping/registry.ts`.
 *
 * A mapping may be a direct feature→parameter function, a state machine
 * (recognise a movement state, then act), or anything in between — it only
 * has to be deterministic given the frames it has seen.
 */

/** Continuous synth/visual parameters, all nominal [0,1]. */
export interface ControlParams {
  /** Master loudness. */
  intensity: number
  /** Timbre brightness (filter cutoff). */
  brightness: number
  /** Melodic register / pitch height. */
  pitch: number
  /** Stereo width / spread. */
  width: number
  /** Stereo position, 0 = left, 1 = right. */
  pan: number
  /** Rhythmic density of the generated pattern. */
  density: number
  /** Reverb / space amount. */
  space: number
}

export type ControlParamId = keyof ControlParams

export type MusicEventKind = 'hit' | 'accent' | 'sweep' | 'freeze' | 'release'

/** A discrete musical gesture; `strength` is nominal [0,1]. */
export interface MusicEvent {
  kind: MusicEventKind
  strength: number
  /** Source time in ms. */
  t: number
}

export interface ControlFrame {
  t: number
  params: ControlParams
  events: readonly MusicEvent[]
}

export interface Mapping {
  readonly id: string
  readonly label: string
  readonly description: string
  /** Called once per feature frame, in order. */
  map: (features: FeatureFrame) => ControlFrame
  reset: () => void
}

export const DEFAULT_CONTROL_PARAMS: ControlParams = {
  intensity: 0,
  brightness: 0.5,
  pitch: 0.5,
  width: 0.5,
  pan: 0.5,
  density: 0.3,
  space: 0.3,
}
