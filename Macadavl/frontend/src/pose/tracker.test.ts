import { describe, expect, it } from 'vitest'
import { standingPose } from '../test/pose'
import { DancerTracker, detectionCentre } from './tracker'
import type { PoseDetection } from './types'

const person = (x: number, handsUp = 0): PoseDetection => ({
  landmarks: standingPose({ x, handsUp }),
  world: null,
})

describe('detectionCentre', () => {
  it('should return the hip midpoint in normalised frame space', () => {
    // WHEN / THEN
    expect(detectionCentre(person(0.3))).toStrictEqual({ x: 0.3, y: 0.55 })
  })
})

describe('DancerTracker', () => {
  it('should seat the leftmost person as dancer A and the other as dancer B on first sight', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    // WHEN
    const slots = tracker.assign({ t: 0, poses: [person(0.8), person(0.2)] })
    // THEN
    expect(slots.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.2, 0.8])
  })

  it('should keep identities when the detector swaps its output order', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    tracker.assign({ t: 0, poses: [person(0.2), person(0.8)] })
    // WHEN
    const slots = tracker.assign({ t: 66, poses: [person(0.75), person(0.25)] })
    // THEN
    expect(slots.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.25, 0.75])
  })

  it('should keep identities when the dancers cross by following the nearest previous position', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    const xsA = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
    const xsB = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]
    let last: number[] = []
    // WHEN
    xsA.forEach((xa, i) => {
      const xb = xsB[i] ?? 0
      const poses = i % 2 === 0 ? [person(xa), person(xb, 1)] : [person(xb, 1), person(xa)]
      last = tracker.assign({ t: i * 66, poses }).map((d) => (d === null ? -1 : detectionCentre(d).x))
    })
    // THEN
    expect(last).toStrictEqual([0.7, 0.3])
  })

  it('should leave the missing slot empty when only one person is visible', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    tracker.assign({ t: 0, poses: [person(0.2), person(0.8)] })
    // WHEN
    const slots = tracker.assign({ t: 66, poses: [person(0.79)] })
    // THEN
    expect(slots[0]).toBeNull()
    expect(slots[1]).not.toBeNull()
  })

  it('should seat a newcomer in the empty slot whether or not its previous occupant is still remembered', () => {
    // GIVEN
    const tracker = new DancerTracker(2, { forgetMs: 1000 })
    tracker.assign({ t: 0, poses: [person(0.2), person(0.8)] })
    tracker.assign({ t: 66, poses: [person(0.8)] })
    // WHEN
    const tooSoon = tracker.assign({ t: 500, poses: [person(0.8), person(0.6)] })
    const later = tracker.assign({ t: 1200, poses: [person(0.8), person(0.6)] })
    // THEN
    expect(tooSoon.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.6, 0.8])
    expect(later.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.6, 0.8])
  })

  it('should keep a lone dancer in seat A when they jump across the stage while remembered', () => {
    // GIVEN
    const tracker = new DancerTracker(2, { forgetMs: 1500 })
    tracker.assign({ t: 0, poses: [person(0.15)] })
    // WHEN
    const slots = tracker.assign({ t: 66, poses: [person(0.95)] })
    // THEN
    expect(slots[0]).not.toBeNull()
    expect(slots[1]).toBeNull()
  })

  it('should reseat a lone dancer in seat A after every seat has been forgotten', () => {
    // GIVEN
    const tracker = new DancerTracker(2, { forgetMs: 1000 })
    tracker.assign({ t: 0, poses: [person(0.15)] })
    tracker.assign({ t: 66, poses: [] })
    // WHEN
    const slots = tracker.assign({ t: 3000, poses: [person(0.95)] })
    // THEN
    expect(slots[0]).not.toBeNull()
    expect(slots[1]).toBeNull()
  })

  it('should treat two detections on top of each other as one person, so a ghost never takes seat B', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    tracker.assign({ t: 0, poses: [person(0.4)] })
    // WHEN
    const slots = tracker.assign({ t: 33, poses: [person(0.41), person(0.43)] })
    // THEN
    expect(slots[0]).not.toBeNull()
    expect(slots[1]).toBeNull()
  })

  it('should report a newcomer only after confirmFrames consecutive sightings, dropping one-frame ghosts', () => {
    // GIVEN
    const tracker = new DancerTracker(2, { confirmFrames: 3 })
    tracker.assign({ t: 0, poses: [person(0.2)] })
    tracker.assign({ t: 33, poses: [person(0.2)] })
    tracker.assign({ t: 66, poses: [person(0.2)] })
    // WHEN
    const ghost = tracker.assign({ t: 99, poses: [person(0.2), person(0.7)] })
    const gone = tracker.assign({ t: 132, poses: [person(0.2)] })
    const first = tracker.assign({ t: 165, poses: [person(0.2), person(0.8)] })
    const second = tracker.assign({ t: 198, poses: [person(0.2), person(0.8)] })
    const third = tracker.assign({ t: 231, poses: [person(0.2), person(0.8)] })
    // THEN
    expect([ghost[1], gone[1], first[1], second[1]]).toStrictEqual([null, null, null, null])
    expect(third[0]).not.toBeNull()
    expect(third[1]).not.toBeNull()
  })

  it('should ignore a skeleton whose shoulders and hips are barely visible', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    const faint: PoseDetection = {
      landmarks: standingPose({ x: 0.7 }).map((l) => ({ x: l.x, y: l.y, z: l.z, visibility: 0.2 })),
      world: null,
    }
    // WHEN
    const slots = tracker.assign({ t: 0, poses: [person(0.3), faint] })
    // THEN
    expect(slots[0]).not.toBeNull()
    expect(slots[1]).toBeNull()
  })

  it('should drop a much smaller skeleton nested inside a dancer, so a fragment of one body never becomes B', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    const full = standingPose({ x: 0.5 })
    const fragment: PoseDetection = {
      landmarks: full.map((l) => ({ x: 0.5 + (l.x - 0.5) * 0.3, y: 0.4 + (l.y - 0.45) * 0.3, z: l.z, visibility: 1 })),
      world: null,
    }
    // WHEN
    const slots = tracker.assign({ t: 0, poses: [fragment, { landmarks: full, world: null }] })
    // THEN
    expect(slots[0]).toStrictEqual({ landmarks: full, world: null })
    expect(slots[1]).toBeNull()
  })

  it('should move a dancer down to seat A when the ghost that briefly held it vanishes before confirmation', () => {
    // GIVEN
    const tracker = new DancerTracker(2, { confirmFrames: 3 })
    tracker.assign({ t: 0, poses: [person(0.3, 1), person(0.7)] })
    tracker.assign({ t: 33, poses: [person(0.3, 1), person(0.7)] })
    // WHEN
    const confirmed = tracker.assign({ t: 66, poses: [person(0.7)] })
    const later = tracker.assign({ t: 99, poses: [person(0.71)] })
    // THEN
    expect(confirmed.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.7, null])
    expect(later.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.71, null])
  })

  it('should ignore extra people beyond the number of slots', () => {
    // GIVEN
    const tracker = new DancerTracker(1)
    // WHEN
    const slots = tracker.assign({ t: 0, poses: [person(0.9), person(0.1)] })
    // THEN
    expect(slots.map((d) => (d === null ? null : detectionCentre(d).x))).toStrictEqual([0.1])
  })

  it('should forget every seat on reset', () => {
    // GIVEN
    const tracker = new DancerTracker(2)
    tracker.assign({ t: 0, poses: [person(0.2), person(0.8)] })
    // WHEN
    tracker.reset()
    const slots = tracker.assign({ t: 5000, poses: [person(0.9)] })
    // THEN
    expect(slots[0]).not.toBeNull()
    expect(slots[1]).toBeNull()
  })
})
