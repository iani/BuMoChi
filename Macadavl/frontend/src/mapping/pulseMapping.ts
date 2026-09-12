import type { FeatureFrame } from '../features/types'
import { clamp01, createFreezeGate, createHitGate, ema } from './shared'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const WINDOW_MS = 4000
const ANALYSIS_EVERY_MS = 250
const MIN_SAMPLES = 60
const MIN_SPAN_MS = 2400
const MIN_LAG_MS = 300
const MAX_LAG_MS = 1200
const PERIOD_ALPHA = 0.3
const PERIOD_JUMP = 0.15
const CLARITY_ACCEPT = 0.4
const PHASE_ALPHA = 0.1
const HIT_THRESHOLD = 0.45
const ON_BEAT_MS = 40
const DEFER_MS = 130
const BEATS_PER_BAR = 4

interface Sample {
  t: number
  v: number
}

interface PeriodEstimate {
  periodMs: number
  clarity: number
}

/** Normalised autocorrelation over the lag range, assuming near-uniform sampling. */
export const estimatePeriod = (samples: readonly Sample[]): PeriodEstimate | null => {
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (first === undefined || last === undefined || samples.length < MIN_SAMPLES || last.t - first.t < MIN_SPAN_MS) {
    return null
  }
  const dt = (last.t - first.t) / (samples.length - 1)
  const mean = samples.reduce((sum, s) => sum + s.v, 0) / samples.length
  const centred = samples.map((s) => s.v - mean)
  const variance = centred.reduce((sum, v) => sum + v * v, 0)
  if (variance < 1e-9) {
    return null
  }
  let bestLag = 0
  let bestR = -Infinity
  const minLag = Math.max(1, Math.ceil(MIN_LAG_MS / dt))
  const maxLag = Math.min(centred.length - 2, Math.floor(MAX_LAG_MS / dt))
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let acc = 0
    for (let i = 0; i + lag < centred.length; i += 1) {
      acc += (centred[i] ?? 0) * (centred[i + lag] ?? 0)
    }
    const r = acc / variance
    if (r > bestR) {
      bestR = r
      bestLag = lag
    }
  }
  if (bestLag === 0) {
    return null
  }
  return { periodMs: bestLag * dt, clarity: clamp01((bestR - 0.3) / 0.5) }
}

/**
 * The dancer's own arm oscillation becomes the beat: the dominant period of
 * hand height is tracked by autocorrelation, phase-locked on upward crossings,
 * and percussive hits are snapped to the nearest half-beat so the music lands
 * *with* the movement instead of on a fixed click.
 */
export const createPulseMapping = (): Mapping => {
  const hits = createHitGate()
  const freeze = createFreezeGate()
  let samples: Sample[] = []
  let lastAnalysisT = -Infinity
  let periodMs: number | null = null
  let clarity = 0
  let handMean = 0
  let wasAbove = false
  let anchorT = 0
  let beatCount = 0
  let pendingHit: MusicEvent | null = null

  const nearestSlot = (t: number, period: number): number => {
    const half = period / 2
    return anchorT + Math.round((t - anchorT) / half) * half
  }

  return {
    id: 'own-pulse',
    label: 'Own Pulse · beat from your swing',
    description:
      'The period of your hand swing becomes the tempo: early hits wait for the next ' +
      'half-beat, every fourth beat is accented, a clearer pulse plays denser and ' +
      'brighter, and a tempo jump is announced with a sweep.',
    reset: () => {
      hits.reset()
      freeze.reset()
      samples = []
      lastAnalysisT = -Infinity
      periodMs = null
      clarity = 0
      handMean = 0
      wasAbove = false
      anchorT = 0
      beatCount = 0
      pendingHit = null
    },
    map: (f: FeatureFrame): ControlFrame => {
      const events: MusicEvent[] = []
      if (f.present) {
        samples.push({ t: f.t, v: f.handHeight })
        samples = samples.filter((s) => f.t - s.t <= WINDOW_MS)
        if (f.t - lastAnalysisT >= ANALYSIS_EVERY_MS) {
          lastAnalysisT = f.t
          const estimate = estimatePeriod(samples)
          if (estimate !== null) {
            clarity = estimate.clarity
            if (clarity > CLARITY_ACCEPT) {
              if (periodMs === null) {
                periodMs = estimate.periodMs
              } else if (Math.abs(estimate.periodMs - periodMs) / periodMs < PERIOD_JUMP) {
                periodMs = ema(periodMs, estimate.periodMs, PERIOD_ALPHA)
              } else {
                events.push({
                  kind: 'sweep',
                  strength: clamp01(Math.abs(estimate.periodMs - periodMs) / periodMs),
                  t: f.t,
                })
                periodMs = estimate.periodMs
              }
            }
          } else {
            clarity = 0
          }
        }

        handMean = ema(handMean, f.handHeight, PHASE_ALPHA)
        const above = f.handHeight > handMean
        if (above && !wasAbove && periodMs !== null) {
          anchorT = f.t
          beatCount += 1
          if (beatCount % BEATS_PER_BAR === 1) {
            events.push({ kind: 'accent', strength: 0.5 + 0.5 * f.lowerEnergy, t: f.t })
          }
        }
        wasAbove = above

        if (pendingHit !== null && f.t >= pendingHit.t) {
          events.push({ ...pendingHit, t: f.t })
          pendingHit = null
        }

        const candidate: MusicEvent[] = []
        if (hits.fire(f, HIT_THRESHOLD, candidate)) {
          const hit = candidate[0]
          if (hit !== undefined) {
            if (periodMs === null) {
              events.push(hit)
            } else {
              const slot = nearestSlot(f.t, periodMs)
              const nextSlot = slot > f.t ? slot : slot + periodMs / 2
              if (slot <= f.t && f.t - slot <= ON_BEAT_MS) {
                events.push(hit)
              } else if (nextSlot - f.t <= DEFER_MS) {
                pendingHit = { ...hit, t: nextSlot }
              }
            }
          }
        }
        freeze.update(f, events)
      }

      return {
        t: f.t,
        events,
        params: {
          intensity: f.present ? 0.15 + 0.85 * f.energy : 0,
          brightness: clamp01(0.2 + 0.6 * clarity + 0.2 * f.upperEnergy),
          pitch: f.handHeight,
          width: 0.3 + 0.7 * f.armSpread,
          pan: 0.5 + 0.5 * f.torsoLean,
          density: 0.2 + 0.8 * clarity,
          space: 0.2 + 0.7 * f.stillness,
        },
      }
    },
  }
}
