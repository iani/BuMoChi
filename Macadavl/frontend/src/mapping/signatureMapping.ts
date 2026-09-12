import type { FeatureFrame } from '../features/types'
import { clamp01, createFreezeGate, createHitGate } from './shared'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const PRIOR_WEIGHT = 60
const PRIOR_MEAN = 0.4
const PRIOR_SIGMA = 0.2
const Z_RANGE = 2
const HIT_SIGMAS = 1.5
const HIT_FLOOR = 0.35
const CODEBOOK_SIZE = 6
const NEW_STATE_DISTANCE = 0.35
const CENTROID_ALPHA = 0.02
const REPEAT_DWELL_MS = 1500
const ECHO_MS = 2000

interface Stat {
  n: number
  mean: number
  m2: number
}

const createStat = (): Stat => ({
  n: PRIOR_WEIGHT,
  mean: PRIOR_MEAN,
  m2: PRIOR_SIGMA * PRIOR_SIGMA * PRIOR_WEIGHT,
})

const push = (s: Stat, x: number): void => {
  s.n += 1
  const delta = x - s.mean
  s.mean += delta / s.n
  s.m2 += delta * (x - s.mean)
}

const sigma = (s: Stat): number => Math.max(0.02, Math.sqrt(s.m2 / s.n))

/** Where the value sits inside the dancer's own range: 0.5 = their usual, 0/1 = ±2σ. */
const norm = (s: Stat, x: number): number => clamp01(0.5 + (x - s.mean) / sigma(s) / (2 * Z_RANGE))

type Point = [number, number, number, number]

const toPoint = (f: FeatureFrame): Point => [f.energy, f.armSpread, f.handHeight, f.lowerEnergy]

const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3])

const nudge = (centroid: Point, towards: Point): void => {
  centroid[0] += CENTROID_ALPHA * (towards[0] - centroid[0])
  centroid[1] += CENTROID_ALPHA * (towards[1] - centroid[1])
  centroid[2] += CENTROID_ALPHA * (towards[2] - centroid[2])
  centroid[3] += CENTROID_ALPHA * (towards[3] - centroid[3])
}

/**
 * Hears the dancer against *themselves*: every parameter is driven by how far
 * the current frame deviates from this session's running personal norm, so a
 * subtle mover and an explosive one both fill the whole range. A small codebook
 * of recurring movement states grows as the dancer shows new vocabulary
 * (sweep) and answers a returned state with an accent and an echoing room.
 */
export const createSignatureMapping = (): Mapping => {
  const hits = createHitGate()
  const freeze = createFreezeGate()
  let energy = createStat()
  let sharpness = createStat()
  let handHeight = createStat()
  let armSpread = createStat()
  let codebook: Point[] = []
  let seen = new Set<number>()
  let currentState = -1
  let stateSince = 0
  let announced = false
  let echoUntil = -Infinity

  return {
    id: 'signature',
    label: 'Signature · you vs. your own norm',
    description:
      'Learns your personal range as you dance and plays how far you stray from it, ' +
      'not absolute size; new movement vocabulary sweeps in, returning to a pose ' +
      'you already showed answers with an accent and an echoing room.',
    reset: () => {
      hits.reset()
      freeze.reset()
      energy = createStat()
      sharpness = createStat()
      handHeight = createStat()
      armSpread = createStat()
      codebook = []
      seen = new Set<number>()
      currentState = -1
      stateSince = 0
      announced = false
      echoUntil = -Infinity
    },
    map: (f: FeatureFrame): ControlFrame => {
      const events: MusicEvent[] = []
      if (f.present) {
        push(energy, f.energy)
        push(sharpness, f.sharpness)
        push(handHeight, f.handHeight)
        push(armSpread, f.armSpread)

        const point = toPoint(f)
        let nearest = -1
        let nearestDistance = Infinity
        codebook.forEach((centroid, index) => {
          const d = distance(point, centroid)
          if (d < nearestDistance) {
            nearestDistance = d
            nearest = index
          }
        })
        if (nearest === -1 || (nearestDistance > NEW_STATE_DISTANCE && codebook.length < CODEBOOK_SIZE)) {
          codebook.push([...point])
          nearest = codebook.length - 1
          if (codebook.length > 1) {
            events.push({ kind: 'sweep', strength: clamp01(nearestDistance), t: f.t })
          }
        } else {
          const centroid = codebook[nearest]
          if (centroid !== undefined) {
            nudge(centroid, point)
          }
        }
        if (nearest !== currentState) {
          if (currentState !== -1) {
            seen.add(currentState)
          }
          currentState = nearest
          stateSince = f.t
          announced = false
        } else if (!announced && seen.has(nearest) && f.t - stateSince >= REPEAT_DWELL_MS) {
          announced = true
          echoUntil = f.t + ECHO_MS
          events.push({ kind: 'accent', strength: 0.6 + 0.4 * f.energy, t: f.t })
        }

        hits.fire(f, Math.max(HIT_FLOOR, sharpness.mean + HIT_SIGMAS * sigma(sharpness)), events)
        freeze.update(f, events)
      }

      const echo = f.t < echoUntil ? 0.3 : 0
      return {
        t: f.t,
        events,
        params: {
          intensity: f.present ? 0.1 + 0.9 * (0.7 * norm(energy, f.energy) + 0.3 * f.energy) : 0,
          brightness: clamp01(0.2 + 0.5 * norm(sharpness, f.sharpness) + 0.3 * f.upperEnergy),
          pitch: norm(handHeight, f.handHeight),
          width: 0.3 + 0.7 * norm(armSpread, f.armSpread),
          pan: 0.5 + 0.5 * f.torsoLean,
          density: 0.15 + 0.5 * f.lowerEnergy + 0.35 * (codebook.length / CODEBOOK_SIZE),
          space: clamp01(0.2 + 0.5 * f.stillness + echo),
        },
      }
    },
  }
}
