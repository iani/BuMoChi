import type { FeatureFrame } from '../features/types'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const HIT_THRESHOLD = 0.55
const HIT_COOLDOWN_MS = 180
const FREEZE_ON = 0.85
const FREEZE_OFF = 0.4

/**
 * Baseline placeholder mapping: every feature drives one parameter directly.
 * It exists so the pipeline is audible end to end; the real mapping (direct,
 * state-based or hybrid) is the decision still open — replace via the
 * registry rather than editing this in place, so both stay comparable.
 */
export const createDirectMapping = (): Mapping => {
  let lastHitT = -Infinity
  let frozen = false

  return {
    id: 'direct-v0',
    label: 'Direct (placeholder)',
    description:
      'energy→intensity, hand height→pitch, arm spread→width, torso lean→pan, ' +
      'upper energy→brightness, lower energy→density, stillness→space; ' +
      'sharpness spikes→hit, stillness→freeze/release.',
    reset: () => {
      lastHitT = -Infinity
      frozen = false
    },
    map: (f: FeatureFrame): ControlFrame => {
      const events: MusicEvent[] = []
      if (f.present) {
        if (f.sharpness > HIT_THRESHOLD && f.t - lastHitT > HIT_COOLDOWN_MS) {
          lastHitT = f.t
          events.push({ kind: 'hit', strength: f.sharpness, t: f.t })
        }
        if (!frozen && f.stillness > FREEZE_ON) {
          frozen = true
          events.push({ kind: 'freeze', strength: f.stillness, t: f.t })
        } else if (frozen && f.stillness < FREEZE_OFF) {
          frozen = false
          events.push({ kind: 'release', strength: 1 - f.stillness, t: f.t })
        }
      }
      return {
        t: f.t,
        events,
        params: {
          intensity: f.present ? 0.15 + 0.85 * f.energy : 0,
          brightness: 0.2 + 0.8 * f.upperEnergy,
          pitch: f.handHeight,
          width: 0.3 + 0.7 * f.armSpread,
          pan: 0.5 + 0.5 * f.torsoLean,
          density: 0.2 + 0.8 * f.lowerEnergy,
          space: 0.2 + 0.7 * f.stillness,
        },
      }
    },
  }
}
