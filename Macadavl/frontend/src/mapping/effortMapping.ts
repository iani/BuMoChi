import type { FeatureFrame } from '../features/types'
import { clamp01, createFreezeGate, createHitGate, ema, HIT_THRESHOLD } from './shared'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const QUALITY_ALPHA = 0.2
const TIME_VARIANCE_ALPHA = 0.1
const ACCENT_WEIGHT = 0.6

/**
 * Laban Effort qualities (Time, Weight, Space, Flow) are estimated from the
 * frame and each one colours several parameters at once (convergent mapping),
 * so the dancer hears *how* they move rather than *where* their limbs are.
 */
export const createEffortMapping = (): Mapping => {
  const hits = createHitGate()
  const freeze = createFreezeGate()
  let sharpnessMean = 0
  let timeVariance = 0
  let weight = 0
  let space = 0
  let flow = 1
  let densityTime = 0

  return {
    id: 'effort-voice',
    label: 'Effort Voice · Laban qualities',
    description:
      'Strong/light weight sets loudness and register, sudden/sustained time sets ' +
      'attack brightness and note density, direct/indirect space sets stereo width, ' +
      'bound/free flow sets reverb; strong hits become accents.',
    reset: () => {
      hits.reset()
      freeze.reset()
      sharpnessMean = 0
      timeVariance = 0
      weight = 0
      space = 0
      flow = 1
      densityTime = 0
    },
    map: (f: FeatureFrame): ControlFrame => {
      const events: MusicEvent[] = []
      const time = f.sharpness
      sharpnessMean = ema(sharpnessMean, f.sharpness, QUALITY_ALPHA)
      timeVariance = ema(timeVariance, Math.abs(f.sharpness - sharpnessMean), TIME_VARIANCE_ALPHA)
      weight = ema(weight, clamp01(0.5 * f.lowerEnergy + 0.3 * f.positionY + 0.2 * f.stanceWidth), QUALITY_ALPHA)
      space = ema(space, clamp01(0.6 * (1 - Math.abs(f.symmetry)) + 0.4 * f.armSpread), QUALITY_ALPHA)
      flow = ema(flow, clamp01(1 - 2 * timeVariance) * (1 - 0.5 * f.stillness), QUALITY_ALPHA)
      densityTime = ema(densityTime, time, QUALITY_ALPHA)

      if (f.present) {
        if (hits.fire(f, HIT_THRESHOLD, events) && weight > ACCENT_WEIGHT) {
          events.push({ kind: 'accent', strength: weight, t: f.t })
        }
        freeze.update(f, events)
      }

      return {
        t: f.t,
        events,
        params: {
          intensity: f.present ? 0.1 + 0.6 * f.energy + 0.3 * weight : 0,
          brightness: clamp01(0.15 + 0.55 * time + 0.3 * weight),
          pitch: clamp01(0.35 + 0.45 * (1 - weight) + 0.2 * f.handHeight),
          width: 0.2 + 0.8 * space,
          pan: clamp01(0.5 + 0.35 * f.torsoLean + 0.15 * f.symmetry),
          density: 0.15 + 0.85 * densityTime,
          space: clamp01(0.15 + 0.65 * flow + 0.2 * f.stillness),
        },
      }
    },
  }
}
