import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import { createDirectMapping } from '../mapping/directMapping'
import { poseFrame } from '../test/pose'
import { DuetTimelineRecorder, TimelineRecorder, timelineToBlob, type TimelineEntry } from './timeline'

const entry = (t: number): TimelineEntry => {
  const features = { ...initialFeatureFrame(t), present: true }
  return { pose: poseFrame(t), features, control: createDirectMapping().map(features) }
}

describe('TimelineRecorder', () => {
  it('should ignore entries before start and after stop', () => {
    // GIVEN
    const recorder = new TimelineRecorder('fixture', 'direct-v0', () => new Date('2026-09-12T06:00:00Z'))
    recorder.push(entry(0))
    // WHEN
    recorder.start()
    recorder.push(entry(100))
    recorder.push(entry(200))
    const timeline = recorder.stop()
    recorder.push(entry(300))
    // THEN
    expect(recorder.isRecording).toBe(false)
    expect(timeline).toStrictEqual({
      version: 1,
      sourceKind: 'fixture',
      mappingId: 'direct-v0',
      startedAt: '2026-09-12T06:00:00.000Z',
      entries: [entry(100), entry(200)],
    })
  })

  it('should clear previous entries on a new start', () => {
    // GIVEN
    const recorder = new TimelineRecorder('camera', 'direct-v0')
    recorder.start()
    recorder.push(entry(0))
    recorder.stop()
    // WHEN
    recorder.start()
    // THEN
    expect(recorder.isRecording).toBe(true)
    expect(recorder.length).toBe(0)
  })
})

describe('DuetTimelineRecorder', () => {
  it('should record both dancers per tick with one mapping id each, as a version 2 file', () => {
    // GIVEN
    const recorder = new DuetTimelineRecorder(
      'camera',
      ['direct-v0', 'kinesphere'],
      () => new Date('2026-09-12T06:00:00Z'),
    )
    // WHEN
    recorder.start()
    recorder.push({ t: 100, dancers: [entry(100), entry(100)] })
    const timeline = recorder.stop()
    recorder.push({ t: 200, dancers: [entry(200), entry(200)] })
    // THEN
    expect(timeline).toStrictEqual({
      version: 2,
      sourceKind: 'camera',
      mappingIds: ['direct-v0', 'kinesphere'],
      startedAt: '2026-09-12T06:00:00.000Z',
      entries: [{ t: 100, dancers: [entry(100), entry(100)] }],
    })
  })
})

describe('timelineToBlob', () => {
  it('should serialise the timeline as JSON', async () => {
    // GIVEN
    const recorder = new TimelineRecorder('fixture', 'direct-v0')
    recorder.start()
    recorder.push(entry(0))
    const timeline = recorder.stop()
    // WHEN
    const blob = timelineToBlob(timeline)
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''))
      reader.addEventListener('error', () => reject(new Error('read failed')))
      reader.readAsText(blob)
    })
    // THEN
    expect(blob.type).toBe('application/json')
    expect(JSON.parse(text)).toStrictEqual(JSON.parse(JSON.stringify(timeline)))
  })
})
