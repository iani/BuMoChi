import { describe, expect, it } from 'vitest'
import { fakeClock, fixtureFrame, makeFixture, standingPose } from '../test/pose'
import { DuetFixturePoseSource, placeInHalf } from './duetFixture'
import { detectionCentre } from './tracker'
import type { MultiPoseFrame, PoseFrame } from './types'

describe('placeInHalf', () => {
  it('should squeeze a full-frame pose into the left or right half of a widescreen stage', () => {
    // GIVEN
    const pose = standingPose({ x: 0.5 })
    // WHEN
    const left = placeInHalf(pose, 0)
    const right = placeInHalf(pose, 1)
    // THEN
    expect(detectionCentre({ landmarks: left, world: null }).x).toBeCloseTo(0.25)
    expect(detectionCentre({ landmarks: right, world: null }).x).toBeCloseTo(0.75)
    expect(left[0]?.y).toBe(pose[0]?.y)
  })
})

describe('DuetFixturePoseSource', () => {
  const left = makeFixture([fixtureFrame(0), fixtureFrame(100), fixtureFrame(200)])
  const right = makeFixture([
    fixtureFrame(0, standingPose({ handsUp: 1 })),
    { t: 150, landmarks: null, world: null },
  ])

  it('should emit both dancers side by side on the left fixture clock, sampling the right fixture by time', () => {
    // GIVEN
    const scheduler = fakeClock()
    const source = new DuetFixturePoseSource(left, right, { scheduler, loop: false })
    const frames: MultiPoseFrame[] = []
    // WHEN
    void source.startMulti((f) => frames.push(f))
    scheduler.advance(1000)
    // THEN
    expect(frames.map((f) => f.t)).toStrictEqual([0, 100, 200])
    expect(frames.map((f) => f.poses.length)).toStrictEqual([2, 2, 1])
    const first = frames[0]
    expect(first?.poses.map((p) => detectionCentre(p).x)).toStrictEqual([0.25, 0.75])
    expect(source.numPoses).toBe(2)
    expect(source.frameAspect).toBe(16 / 9)
  })

  it('should expose the left dancer alone through the single-pose start()', () => {
    // GIVEN
    const scheduler = fakeClock()
    const source = new DuetFixturePoseSource(left, right, { scheduler, loop: false })
    const frames: PoseFrame[] = []
    // WHEN
    void source.start((f) => frames.push(f))
    scheduler.advance(1000)
    // THEN
    expect(frames).toHaveLength(3)
    expect(frames.map((f) => (f.landmarks === null ? null : detectionCentre({ landmarks: f.landmarks, world: null }).x))).toStrictEqual([0.25, 0.25, 0.25])
  })
})
