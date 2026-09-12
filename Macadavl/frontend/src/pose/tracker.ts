import type { MultiPoseFrame, PoseDetection } from './types'
import { LANDMARK } from './types'

export interface Point {
  x: number
  y: number
}

export interface DancerTrackerOptions {
  /** How long an empty seat remembers where its dancer was before anyone may take it. */
  forgetMs?: number
  /** Consecutive frames a newcomer must be seen before their seat is reported; filters one-frame ghosts. */
  confirmFrames?: number
}

interface Seat {
  centre: Point
  lastT: number
  seen: number
}

/** Cost of seating a person in a seat with no memory; above the frame diagonal so a remembered seat always wins. */
const UNKNOWN_SEAT_COST = 1.5
/** Cost of leaving a seat empty while people are unseated; must exceed any seating cost. */
const EMPTY_SEAT_COST = 2
/** Tie-breaker for fresh seats: lower seats first, and the leftmost person takes the lowest seat. */
const LEFT_TO_RIGHT_BIAS = 0.1
/** Two skeletons with every landmark closer than this (frame fraction) are the detector seeing one person twice. */
const DUPLICATE_DISTANCE = 0.05
/** A skeleton this much shorter than the one it sits inside is the detector re-reading part of that body. */
const NESTED_SIZE_RATIO = 0.6
/** A skeleton whose shoulders and hips are this uncertain is a guess at a body that is not there. */
const MIN_TORSO_VISIBILITY = 0.5
const TORSO = [LANDMARK.leftShoulder, LANDMARK.rightShoulder, LANDMARK.leftHip, LANDMARK.rightHip]

export const detectionCentre = (d: PoseDetection): Point => {
  const l = d.landmarks[LANDMARK.leftHip]
  const r = d.landmarks[LANDMARK.rightHip]
  if (l === undefined || r === undefined) {
    return { x: 0.5, y: 0.5 }
  }
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 }
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

const isSolid = (d: PoseDetection): boolean => {
  const seen = TORSO.map((i) => d.landmarks[i]?.visibility ?? 0)
  return seen.reduce((sum, v) => sum + v, 0) / TORSO.length >= MIN_TORSO_VISIBILITY
}

const torsoLength = (d: PoseDetection): number => {
  const s = d.landmarks[LANDMARK.leftShoulder]
  const r = d.landmarks[LANDMARK.rightShoulder]
  const centre = detectionCentre(d)
  if (s === undefined || r === undefined) {
    return 0
  }
  return distance({ x: (s.x + r.x) / 2, y: (s.y + r.y) / 2 }, centre)
}

const contains = (outer: PoseDetection, p: Point): boolean => {
  const xs = outer.landmarks.map((l) => l.x)
  const ys = outer.landmarks.map((l) => l.y)
  return p.x >= Math.min(...xs) && p.x <= Math.max(...xs) && p.y >= Math.min(...ys) && p.y <= Math.max(...ys)
}

/** `small` is a fragment of `large`: much shorter and centred inside its silhouette. */
const isNested = (small: PoseDetection, large: PoseDetection): boolean =>
  torsoLength(small) < NESTED_SIZE_RATIO * torsoLength(large) && contains(large, detectionCentre(small))

const isDuplicate = (a: PoseDetection, b: PoseDetection): boolean => {
  if (a.landmarks.length !== b.landmarks.length || a.landmarks.length === 0) {
    return false
  }
  return a.landmarks.every((la, i) => {
    const lb = b.landmarks[i]
    return lb !== undefined && distance(la, lb) < DUPLICATE_DISTANCE
  })
}

/**
 * Gives every detected person a stable seat (dancer A, dancer B, …) across
 * frames. The detector returns people in arbitrary order, so each frame is
 * matched to the previous frame by hip position: the assignment with the
 * smallest total movement wins, seats that just emptied keep their place for
 * `forgetMs`, and brand-new seats are filled left to right.
 */
export class DancerTracker {
  private readonly seats: (Seat | null)[]
  private readonly forgetMs: number
  private readonly confirmFrames: number

  constructor(slots: number, options: DancerTrackerOptions = {}) {
    this.seats = Array.from({ length: slots }, () => null)
    this.forgetMs = options.forgetMs ?? 1500
    this.confirmFrames = options.confirmFrames ?? 1
  }

  get size(): number {
    return this.seats.length
  }

  reset(): void {
    this.seats.fill(null)
  }

  assign(frame: MultiPoseFrame): readonly (PoseDetection | null)[] {
    const people = frame.poses
      .filter(isSolid)
      .map((pose) => ({ pose, centre: detectionCentre(pose) }))
      .filter((person, i, all) => all.findIndex((o) => isDuplicate(o.pose, person.pose)) === i)
      .filter((person, _i, all) => !all.some((o) => o !== person && isNested(person.pose, o.pose)))
    const cost = (seatIndex: number, personIndex: number): number => {
      const seat = this.seats[seatIndex] ?? null
      const person = people[personIndex]
      if (person === undefined) {
        return EMPTY_SEAT_COST
      }
      if (seat !== null && frame.t - seat.lastT <= this.forgetMs) {
        return distance(seat.centre, person.centre)
      }
      const rank = this.seats.length > 1 ? seatIndex / (this.seats.length - 1) : 0
      const x = person.centre.x
      const sideBias = rank * (1 - x) + (1 - rank) * x
      return UNKNOWN_SEAT_COST + LEFT_TO_RIGHT_BIAS * (sideBias + seatIndex)
    }

    let best: number[] = this.seats.map(() => -1)
    let bestCost = Number.POSITIVE_INFINITY
    const search = (seatIndex: number, used: readonly number[], acc: number): void => {
      if (acc >= bestCost) {
        return
      }
      if (seatIndex === this.seats.length) {
        bestCost = acc
        best = [...used]
        return
      }
      search(seatIndex + 1, [...used, -1], acc + EMPTY_SEAT_COST)
      people.forEach((_p, personIndex) => {
        if (!used.includes(personIndex)) {
          search(seatIndex + 1, [...used, personIndex], acc + cost(seatIndex, personIndex))
        }
      })
    }
    search(0, [], 0)

    const out: (PoseDetection | null)[] = this.seats.map(() => null)
    best.forEach((personIndex, seatIndex) => {
      const person = people[personIndex]
      const previous = this.seats[seatIndex] ?? null
      if (person === undefined) {
        if (previous !== null && (previous.seen < this.confirmFrames || frame.t - previous.lastT > this.forgetMs)) {
          this.seats[seatIndex] = null
        }
        return
      }
      const remembered = previous !== null && frame.t - previous.lastT <= this.forgetMs
      const seen = remembered ? previous.seen + 1 : 1
      this.seats[seatIndex] = { centre: person.centre, lastT: frame.t, seen }
      out[seatIndex] = seen >= this.confirmFrames ? person.pose : null
    })
    this.seats.forEach((seat, seatIndex) => {
      if (seat !== null && seat.seen === this.confirmFrames) {
        this.promote(seatIndex, out)
      }
    })
    return out
  }

  /** A newly confirmed dancer takes the lowest seat nobody holds, so a vanished ghost never leaves seat A empty. */
  private promote(seatIndex: number, out: (PoseDetection | null)[]): void {
    const free = this.seats.findIndex((s, i) => i < seatIndex && s === null)
    if (free === -1) {
      return
    }
    this.seats[free] = this.seats[seatIndex] ?? null
    this.seats[seatIndex] = null
    out[free] = out[seatIndex] ?? null
    out[seatIndex] = null
  }
}
