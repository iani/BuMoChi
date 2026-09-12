import { describe, expect, it, vi } from 'vitest'
import { createNullEngine } from '../audio/danceEngine'
import type { ControlFrame, Mapping } from '../mapping/types'
import { createDirectMapping } from '../mapping/directMapping'
import type { MultiPoseFrame, MultiPoseSource, PoseDetection, PoseFrame } from '../pose/types'
import { standingPose } from '../test/pose'
import { DuetPipeline, type DuetTick } from './duet'

interface ManualDuetSource extends MultiPoseSource {
  emit: (frame: MultiPoseFrame) => void
}

const manualSource = (): ManualDuetSource => {
  let handler: ((frame: MultiPoseFrame) => void) | null = null
  return {
    kind: 'fixture',
    numPoses: 2,
    videoElement: null,
    frameAspect: null,
    start: vi.fn<(onFrame: (frame: PoseFrame) => void) => Promise<void>>(() => Promise.resolve()),
    startMulti: vi.fn<(onFrame: (frame: MultiPoseFrame) => void) => Promise<void>>((onFrame) => {
      handler = onFrame
      return Promise.resolve()
    }),
    stop: vi.fn<() => void>(),
    emit: (frame) => handler?.(frame),
  }
}

const person = (x: number, handsUp = 0): PoseDetection => ({
  landmarks: standingPose({ x, handsUp }),
  world: null,
})

const alwaysFreezing = (): Mapping => {
  const base = createDirectMapping()
  return {
    ...base,
    map: (f) => ({ ...base.map(f), events: [{ kind: 'freeze', strength: 1, t: f.t }] }),
  }
}

const build = () => {
  const source = manualSource()
  const appliedA: ControlFrame[] = []
  const appliedB: ControlFrame[] = []
  const ticks: DuetTick[] = []
  const pipeline = new DuetPipeline({
    source,
    lanes: [
      { mapping: createDirectMapping(), engine: createNullEngine({ onApply: (f) => appliedA.push(f) }) },
      { mapping: createDirectMapping(), engine: createNullEngine({ onApply: (f) => appliedB.push(f) }) },
    ],
    onTick: (t) => ticks.push(t),
  })
  return { source, appliedA, appliedB, ticks, pipeline }
}

/** Three consecutive frames: what the tracker needs before it trusts a newcomer. */
const settle = (source: ReturnType<typeof manualSource>, poses: PoseDetection[]): void => {
  ;[0, 33, 66].forEach((t) => source.emit({ t, poses }))
}

describe('DuetPipeline', () => {
  it('should feed the left dancer to lane A and the right dancer to lane B, each through its own extractor and mapping', async () => {
    // GIVEN
    const { source, appliedA, appliedB, ticks, pipeline } = build()
    // WHEN
    await pipeline.start()
    settle(source, [person(0.8, 1), person(0.2, 0)])
    source.emit({ t: 100, poses: [person(0.8, 1), person(0.2, 0)] })
    // THEN
    expect(source.startMulti).toHaveBeenCalledTimes(1)
    expect(appliedA).toHaveLength(4)
    expect(appliedB).toHaveLength(4)
    const last = ticks.at(-1)
    expect(last?.t).toBe(100)
    expect(last?.lanes[0]?.features.positionX).toBeLessThan(0.5)
    expect(last?.lanes[1]?.features.positionX).toBeGreaterThan(0.5)
    expect(last?.lanes[1]?.features.handHeight).toBeGreaterThan(last?.lanes[0]?.features.handHeight ?? 1)
    expect(last?.lanes[1]?.control.params.pitch).toBe(last?.lanes[1]?.features.handHeight)
  })

  it('should keep the remaining dancer in their lane and mark the other lane absent when one leaves', async () => {
    // GIVEN
    const { source, ticks, pipeline } = build()
    await pipeline.start()
    settle(source, [person(0.2), person(0.8)])
    // WHEN
    source.emit({ t: 100, poses: [person(0.81)] })
    // THEN
    const last = ticks.at(-1)
    expect(last?.lanes[0]?.features.present).toBe(false)
    expect(last?.lanes[0]?.pose.landmarks).toBeNull()
    expect(last?.lanes[1]?.features.present).toBe(true)
  })

  it('should drop the events a mapping fires for an absent dancer, keeping them for the present one', async () => {
    // GIVEN
    const source = manualSource()
    const ticks: DuetTick[] = []
    const pipeline = new DuetPipeline({
      source,
      lanes: [
        { mapping: alwaysFreezing(), engine: createNullEngine() },
        { mapping: alwaysFreezing(), engine: createNullEngine() },
      ],
      onTick: (t) => ticks.push(t),
    })
    await pipeline.start()
    // WHEN
    settle(source, [person(0.2)])
    // THEN
    const last = ticks.at(-1)
    expect(last?.lanes[0]?.control.events.map((e) => e.kind)).toStrictEqual(['freeze'])
    expect(last?.lanes[1]?.control.events).toStrictEqual([])
  })

  it('should keep lane B absent when the detector reports a second person for a single frame', async () => {
    // GIVEN
    const { source, ticks, pipeline } = build()
    await pipeline.start()
    settle(source, [person(0.2)])
    // WHEN
    source.emit({ t: 100, poses: [person(0.2), person(0.7)] })
    // THEN
    const last = ticks.at(-1)
    expect(last?.lanes[0]?.features.present).toBe(true)
    expect(last?.lanes[1]?.features.present).toBe(false)
  })

  it('should swap only the requested lane mapping and reset it', async () => {
    // GIVEN
    const { source, appliedB, pipeline } = build()
    await pipeline.start()
    const replacement = createDirectMapping()
    const reset = vi.spyOn(replacement, 'reset')
    // WHEN
    pipeline.setMapping(1, replacement)
    source.emit({ t: 0, poses: [person(0.2), person(0.8)] })
    // THEN
    expect(reset).toHaveBeenCalledTimes(1)
    expect(pipeline.mappingFor(1)).toBe(replacement)
    expect(pipeline.mappingFor(0)).not.toBe(replacement)
    expect(appliedB).toHaveLength(1)
  })

  it('should stop both engines and the source, and ignore frames afterwards', async () => {
    // GIVEN
    const { source, appliedA, appliedB, pipeline } = build()
    const stopA = vi.spyOn(pipeline.lanes[0].engine, 'stop')
    const stopB = vi.spyOn(pipeline.lanes[1].engine, 'stop')
    await pipeline.start()
    // WHEN
    pipeline.stop()
    source.emit({ t: 0, poses: [person(0.2), person(0.8)] })
    // THEN
    expect(pipeline.isRunning).toBe(false)
    expect(source.stop).toHaveBeenCalledTimes(1)
    expect(stopA).toHaveBeenCalledTimes(1)
    expect(stopB).toHaveBeenCalledTimes(1)
    expect(appliedA).toHaveLength(0)
    expect(appliedB).toHaveLength(0)
  })
})
