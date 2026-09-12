import type { FeatureFrame } from '../features/types'
import type { ControlFrame } from '../mapping/types'
import type { PoseFrame } from '../pose/types'

export interface TimelineEntry {
  pose: PoseFrame
  features: FeatureFrame
  control: ControlFrame
}

export interface Timeline {
  version: 1
  sourceKind: string
  mappingId: string
  startedAt: string
  entries: readonly TimelineEntry[]
}

/** Two dancers per tick: index 0 is dancer A, index 1 is dancer B. */
export interface DuetTimelineEntry {
  t: number
  dancers: readonly [TimelineEntry, TimelineEntry]
}

export interface DuetTimeline {
  version: 2
  sourceKind: string
  /** Mapping id per dancer, same order as `entries[].dancers`. */
  mappingIds: readonly [string, string]
  startedAt: string
  entries: readonly DuetTimelineEntry[]
}

/** Buffers ticks between start() and stop(); the subclass decides the file shape. */
abstract class EntryBuffer<E> {
  protected entries: E[] = []
  protected startedAt = ''
  private active = false
  private readonly now: () => Date

  constructor(now: () => Date) {
    this.now = now
  }

  get isRecording(): boolean {
    return this.active
  }

  get length(): number {
    return this.entries.length
  }

  start(): void {
    this.entries = []
    this.startedAt = this.now().toISOString()
    this.active = true
  }

  push(entry: E): void {
    if (this.active) {
      this.entries.push(entry)
    }
  }

  protected finish(): void {
    this.active = false
  }
}

/**
 * Captures every pipeline tick so a session can be replayed offline against a
 * new mapping without re-running pose estimation.
 */
export class TimelineRecorder extends EntryBuffer<TimelineEntry> {
  private readonly sourceKind: string
  private readonly mappingId: string

  constructor(sourceKind: string, mappingId: string, now: () => Date = () => new Date()) {
    super(now)
    this.sourceKind = sourceKind
    this.mappingId = mappingId
  }

  stop(): Timeline {
    this.finish()
    return {
      version: 1,
      sourceKind: this.sourceKind,
      mappingId: this.mappingId,
      startedAt: this.startedAt,
      entries: this.entries,
    }
  }
}

/** Same idea for a duet: both dancers' pose, features and control per tick. */
export class DuetTimelineRecorder extends EntryBuffer<DuetTimelineEntry> {
  private readonly sourceKind: string
  private readonly mappingIds: readonly [string, string]

  constructor(
    sourceKind: string,
    mappingIds: readonly [string, string],
    now: () => Date = () => new Date(),
  ) {
    super(now)
    this.sourceKind = sourceKind
    this.mappingIds = mappingIds
  }

  stop(): DuetTimeline {
    this.finish()
    return {
      version: 2,
      sourceKind: this.sourceKind,
      mappingIds: this.mappingIds,
      startedAt: this.startedAt,
      entries: this.entries,
    }
  }
}

export const timelineToBlob = (timeline: Timeline | DuetTimeline): Blob =>
  new Blob([JSON.stringify(timeline)], { type: 'application/json' })
