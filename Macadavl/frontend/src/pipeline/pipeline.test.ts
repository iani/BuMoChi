import { describe, expect, it, vi } from 'vitest'
import { createNullEngine } from '../audio/danceEngine'
import type { ControlFrame } from '../mapping/types'
import { createDirectMapping } from '../mapping/directMapping'
import type { PoseFrame, PoseSource } from '../pose/types'
import { poseFrame, standingPose } from '../test/pose'
import { DancePipeline, type PipelineTick } from './pipeline'

interface ManualSource extends PoseSource {
  emit: (frame: PoseFrame) => void
}

const manualSource = (): ManualSource => {
  let handler: ((frame: PoseFrame) => void) | null = null
  return {
    kind: 'fixture',
    videoElement: null,
    frameAspect: null,
    start: vi.fn<(onFrame: (frame: PoseFrame) => void) => Promise<void>>((onFrame) => {
      handler = onFrame
      return Promise.resolve()
    }),
    stop: vi.fn<() => void>(),
    emit: (frame) => handler?.(frame),
  }
}

describe('DancePipeline', () => {
  it('should start the engine and the source, then route every pose through features and mapping', async () => {
    // GIVEN
    const source = manualSource()
    const applied: ControlFrame[] = []
    const engine = createNullEngine({ onApply: (f) => applied.push(f) })
    const ticks: PipelineTick[] = []
    const pipeline = new DancePipeline({ source, mapping: createDirectMapping(), engine, onTick: (t) => ticks.push(t) })
    // WHEN
    await pipeline.start()
    source.emit(poseFrame(0))
    source.emit(poseFrame(100, standingPose({ handsUp: 1 })))
    // THEN
    expect(pipeline.isRunning).toBe(true)
    expect(source.start).toHaveBeenCalledTimes(1)
    expect(applied).toHaveLength(2)
    expect(ticks[1]?.features.handHeight).toBeGreaterThan(0)
    expect(ticks[1]?.control.params.pitch).toBe(ticks[1]?.features.handHeight)
  })

  it('should reset the mapping on start and ignore frames after stop', async () => {
    // GIVEN
    const source = manualSource()
    const mapping = createDirectMapping()
    const reset = vi.spyOn(mapping, 'reset')
    const onTick = vi.fn<(t: PipelineTick) => void>()
    const pipeline = new DancePipeline({ source, mapping, engine: createNullEngine(), onTick })
    await pipeline.start()
    // WHEN
    pipeline.stop()
    source.emit(poseFrame(0))
    // THEN
    expect(reset).toHaveBeenCalledTimes(1)
    expect(source.stop).toHaveBeenCalledTimes(1)
    expect(pipeline.isRunning).toBe(false)
    expect(onTick).not.toHaveBeenCalled()
  })

  it('should swap the mapping while running, resetting the new one and routing later frames through it', async () => {
    // GIVEN
    const source = manualSource()
    const first = createDirectMapping()
    const second = createDirectMapping()
    const secondReset = vi.spyOn(second, 'reset')
    const secondMap = vi.spyOn(second, 'map')
    const ticks: PipelineTick[] = []
    const pipeline = new DancePipeline({ source, mapping: first, engine: createNullEngine(), onTick: (t) => ticks.push(t) })
    await pipeline.start()
    source.emit(poseFrame(0))
    // WHEN
    pipeline.setMapping(second)
    source.emit(poseFrame(100))
    // THEN
    expect(pipeline.mapping).toBe(second)
    expect(secondReset).toHaveBeenCalledTimes(1)
    expect(secondMap).toHaveBeenCalledTimes(1)
    expect(ticks).toHaveLength(2)
  })

  it('should be idempotent for repeated start and stop calls', async () => {
    // GIVEN
    const source = manualSource()
    const pipeline = new DancePipeline({ source, mapping: createDirectMapping(), engine: createNullEngine() })
    // WHEN
    await pipeline.start()
    await pipeline.start()
    pipeline.stop()
    pipeline.stop()
    // THEN
    expect(source.start).toHaveBeenCalledTimes(1)
    expect(source.stop).toHaveBeenCalledTimes(1)
  })
})
