import type { DanceAudioEngine } from '../audio/danceEngine'
import { FeatureExtractor } from '../features/extractor'
import type { FeatureFrame } from '../features/types'
import type { ControlFrame, Mapping } from '../mapping/types'
import type { PoseFrame, PoseSource } from '../pose/types'

export interface PipelineTick {
  pose: PoseFrame
  features: FeatureFrame
  control: ControlFrame
}

export interface PipelineOptions {
  source: PoseSource
  mapping: Mapping
  engine: DanceAudioEngine
  onTick?: (tick: PipelineTick) => void
  extractor?: FeatureExtractor
}

/**
 * Wires source → features → mapping → engine. Each stage is injected, so the
 * same runner serves the live camera, the mock video and the deterministic
 * fixture replay used in tests.
 */
export class DancePipeline {
  private readonly options: PipelineOptions
  private readonly extractor: FeatureExtractor
  private activeMapping: Mapping
  private running = false

  constructor(options: PipelineOptions) {
    this.options = options
    this.extractor = options.extractor ?? new FeatureExtractor()
    this.activeMapping = options.mapping
  }

  get isRunning(): boolean {
    return this.running
  }

  get mapping(): Mapping {
    return this.activeMapping
  }

  setMapping(mapping: Mapping): void {
    mapping.reset()
    this.activeMapping = mapping
  }

  async start(): Promise<void> {
    if (this.running) {
      return
    }
    this.running = true
    this.extractor.reset()
    this.activeMapping.reset()
    await this.options.engine.start()
    await this.options.source.start((pose) => this.handle(pose))
  }

  stop(): void {
    if (!this.running) {
      return
    }
    this.running = false
    this.options.source.stop()
    this.options.engine.stop()
  }

  private handle(pose: PoseFrame): void {
    if (!this.running) {
      return
    }
    const features = this.extractor.push(pose)
    const control = this.activeMapping.map(features)
    this.options.engine.apply(control)
    this.options.onTick?.({ pose, features, control })
  }
}
