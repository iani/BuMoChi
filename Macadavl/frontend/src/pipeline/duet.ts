import type { DanceAudioEngine } from '../audio/danceEngine'
import { FeatureExtractor } from '../features/extractor'
import type { ControlFrame, Mapping } from '../mapping/types'
import { DancerTracker } from '../pose/tracker'
import type { MultiPoseFrame, MultiPoseSource, PoseFrame } from '../pose/types'
import type { PipelineTick } from './pipeline'

export interface DuetLane {
  mapping: Mapping
  engine: DanceAudioEngine
  extractor?: FeatureExtractor
}

export interface DuetTick {
  t: number
  /** One tick per lane (A, B); an absent dancer yields a pose with null landmarks. */
  lanes: readonly [PipelineTick, PipelineTick]
}

export interface DuetPipelineOptions {
  source: MultiPoseSource
  lanes: readonly [DuetLane, DuetLane]
  onTick?: (tick: DuetTick) => void
  tracker?: DancerTracker
}

interface RunningLane {
  mapping: Mapping
  readonly engine: DanceAudioEngine
  readonly extractor: FeatureExtractor
}

export type LaneIndex = 0 | 1

const runningLane = (lane: DuetLane): RunningLane => ({
  mapping: lane.mapping,
  engine: lane.engine,
  extractor: lane.extractor ?? new FeatureExtractor(),
})

/** ~100 ms at 30 fps: long enough to drop the detector's one-off phantom second person. */
const DEFAULT_CONFIRM_FRAMES = 3

/**
 * Two dancers, one camera: every frame's detections are seated by the tracker,
 * then each seat runs its own features → mapping → engine so the two profiles
 * never share smoothing, pulse or mood state.
 */
export class DuetPipeline {
  readonly lanes: readonly [RunningLane, RunningLane]
  private readonly options: DuetPipelineOptions
  private readonly tracker: DancerTracker
  private running = false

  constructor(options: DuetPipelineOptions) {
    this.options = options
    this.tracker = options.tracker ?? new DancerTracker(2, { confirmFrames: DEFAULT_CONFIRM_FRAMES })
    this.lanes = [runningLane(options.lanes[0]), runningLane(options.lanes[1])]
  }

  get isRunning(): boolean {
    return this.running
  }

  mappingFor(lane: LaneIndex): Mapping {
    return this.lanes[lane].mapping
  }

  setMapping(lane: LaneIndex, mapping: Mapping): void {
    mapping.reset()
    this.lanes[lane].mapping = mapping
  }

  async start(): Promise<void> {
    if (this.running) {
      return
    }
    this.running = true
    this.tracker.reset()
    for (const lane of this.lanes) {
      lane.extractor.reset()
      lane.mapping.reset()
    }
    await Promise.all(this.lanes.map((lane) => lane.engine.start()))
    await this.options.source.startMulti((frame) => this.handle(frame))
  }

  stop(): void {
    if (!this.running) {
      return
    }
    this.running = false
    this.options.source.stop()
    for (const lane of this.lanes) {
      lane.engine.stop()
    }
  }

  private handle(frame: MultiPoseFrame): void {
    if (!this.running) {
      return
    }
    const seats = this.tracker.assign(frame)
    const run = (lane: RunningLane, seat: LaneIndex): PipelineTick => {
      const detection = seats[seat] ?? null
      const pose: PoseFrame = {
        t: frame.t,
        landmarks: detection?.landmarks ?? null,
        world: detection?.world ?? null,
      }
      const features = lane.extractor.push(pose)
      const mapped = lane.mapping.map(features)
      // An empty seat is silence: mappings may still fire stillness events while their state decays.
      const control: ControlFrame = detection === null ? { ...mapped, events: [] } : mapped
      lane.engine.apply(control)
      return { pose, features, control }
    }
    this.options.onTick?.({ t: frame.t, lanes: [run(this.lanes[0], 0), run(this.lanes[1], 1)] })
  }
}
