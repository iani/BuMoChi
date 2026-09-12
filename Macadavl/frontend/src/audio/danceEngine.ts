import type { ControlFrame } from '../mapping/types'

/**
 * Engine adapter seam. The pipeline only ever talks to this interface; the
 * Tone.js implementation lives in `engine.ts`. A SuperCollider/SuperSonic or
 * other backend can be dropped in by implementing it and swapping the factory.
 */
export interface DanceAudioEngine {
  readonly id: string
  /** Must be called from a user gesture (browser autoplay policy). */
  start: () => Promise<void>
  /** Apply one control frame; called at feature rate (~15–60 Hz). */
  apply: (frame: ControlFrame) => void
  /** Silence everything, keep the graph alive. */
  stop: () => void
  /** Release resources. */
  dispose: () => void
  /** Master output as a MediaStream, for recording. `null` if unsupported. */
  captureStream: () => MediaStream | null
}

export interface NullEngineOptions {
  onApply?: (frame: ControlFrame) => void
  onStop?: () => void
}

/** Silent engine for tests and for running the pipeline without audio. */
export const createNullEngine = (options: NullEngineOptions = {}): DanceAudioEngine => ({
  id: 'null',
  start: () => Promise.resolve(),
  apply: (frame) => options.onApply?.(frame),
  stop: () => options.onStop?.(),
  dispose: () => {},
  captureStream: () => null,
})
