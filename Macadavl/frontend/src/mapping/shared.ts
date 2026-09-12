import type { FeatureFrame } from '../features/types'
import type { MusicEvent } from './types'

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

export const ema = (prev: number, next: number, alpha: number): number => prev + alpha * (next - prev)

export const HIT_THRESHOLD = 0.55
export const HIT_COOLDOWN_MS = 180
export const FREEZE_ON = 0.85
export const FREEZE_OFF = 0.4

export interface HitGate {
  fire: (f: FeatureFrame, threshold: number, events: MusicEvent[]) => boolean
  reset: () => void
}

/** Sharpness-spike detector with a cooldown; shared by every strategy's percussive layer. */
export const createHitGate = (): HitGate => {
  let lastHitT = -Infinity
  return {
    fire: (f, threshold, events) => {
      if (f.sharpness <= threshold || f.t - lastHitT <= HIT_COOLDOWN_MS) {
        return false
      }
      lastHitT = f.t
      events.push({ kind: 'hit', strength: f.sharpness, t: f.t })
      return true
    },
    reset: () => {
      lastHitT = -Infinity
    },
  }
}

export interface FreezeGate {
  readonly frozen: boolean
  update: (f: FeatureFrame, events: MusicEvent[]) => void
  reset: () => void
}

/** Stillness hysteresis (0.85 on / 0.40 off) emitting freeze and release. */
export const createFreezeGate = (): FreezeGate => {
  let frozen = false
  return {
    get frozen() {
      return frozen
    },
    update: (f, events) => {
      if (!frozen && f.stillness > FREEZE_ON) {
        frozen = true
        events.push({ kind: 'freeze', strength: f.stillness, t: f.t })
      } else if (frozen && f.stillness < FREEZE_OFF) {
        frozen = false
        events.push({ kind: 'release', strength: 1 - f.stillness, t: f.t })
      }
    },
    reset: () => {
      frozen = false
    },
  }
}
