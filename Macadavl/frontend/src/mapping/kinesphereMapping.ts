import type { FeatureFrame } from '../features/types'
import { clamp01, createFreezeGate, createHitGate, ema, HIT_THRESHOLD } from './shared'
import type { ControlFrame, Mapping, MusicEvent } from './types'

const CENTRE_ALPHA = 0.005
const PAN_SLEW = 0.05
const TRAVEL_ALPHA = 0.1
const TRAVEL_GAIN = 40
const EXPANSION_ALPHA = 0.3
const CONFIDENCE_FLOOR = 0.5
const OPEN_ON = 0.7
const OPEN_OFF = 0.5
const REACH_ON = 0.85
const REACH_OFF = 0.7
const OPEN_COOLDOWN_MS = 400

/**
 * Sonifies the dancer's use of space (Laban's kinesphere): where they stand
 * relative to their own centre pans the sound, how far they reach opens the
 * width and brightness, height lifts the register, and travelling across the
 * stage fills the room with reverb. Opening the arms wide is a sweep, a high
 * reach an accent.
 */
export const createKinesphereMapping = (): Mapping => {
  const hits = createHitGate()
  const freeze = createFreezeGate()
  let centreX: number | null = null
  let pan = 0.5
  let lastX: number | null = null
  let travel = 0
  let expansion = 0
  let open = false
  let lastOpenT = -Infinity
  let reaching = false

  return {
    id: 'kinesphere',
    label: 'Kinesphere · your use of space',
    description:
      'Left/right of your own centre pans the sound, reaching out widens and ' +
      'brightens it, height and hands set the register, travelling across the stage ' +
      'fills the room with reverb; opening wide sweeps, a high reach accents.',
    reset: () => {
      hits.reset()
      freeze.reset()
      centreX = null
      pan = 0.5
      lastX = null
      travel = 0
      expansion = 0
      open = false
      lastOpenT = -Infinity
      reaching = false
    },
    map: (f: FeatureFrame): ControlFrame => {
      const events: MusicEvent[] = []
      if (f.present) {
        centreX = centreX === null ? f.positionX : ema(centreX, f.positionX, CENTRE_ALPHA)
        const targetPan = clamp01(0.5 + (f.positionX - centreX) * 2)
        pan += Math.max(-PAN_SLEW, Math.min(PAN_SLEW, targetPan - pan))
        travel = ema(travel, lastX === null ? 0 : clamp01(Math.abs(f.positionX - lastX) * TRAVEL_GAIN), TRAVEL_ALPHA)
        lastX = f.positionX
        if (f.confidence >= CONFIDENCE_FLOOR) {
          expansion = ema(expansion, clamp01(0.6 * f.armSpread + 0.4 * f.stanceWidth), EXPANSION_ALPHA)
        }

        if (!open && f.armSpread > OPEN_ON && f.t - lastOpenT > OPEN_COOLDOWN_MS) {
          open = true
          lastOpenT = f.t
          events.push({ kind: 'sweep', strength: f.armSpread, t: f.t })
        } else if (open && f.armSpread < OPEN_OFF) {
          open = false
        }
        if (!reaching && f.handHeight > REACH_ON) {
          reaching = true
          events.push({ kind: 'accent', strength: f.handHeight, t: f.t })
        } else if (reaching && f.handHeight < REACH_OFF) {
          reaching = false
        }

        hits.fire(f, HIT_THRESHOLD, events)
        freeze.update(f, events)
      } else {
        travel = ema(travel, 0, TRAVEL_ALPHA)
      }

      return {
        t: f.t,
        events,
        params: {
          intensity: f.present ? 0.15 + 0.6 * f.energy + 0.25 * expansion : 0,
          brightness: clamp01(0.2 + 0.5 * expansion + 0.3 * f.upperEnergy),
          pitch: clamp01(0.6 * f.handHeight + 0.4 * (1 - f.positionY)),
          width: 0.2 + 0.8 * expansion,
          pan,
          density: 0.2 + 0.5 * f.lowerEnergy + 0.3 * travel,
          space: clamp01(0.15 + 0.5 * travel + 0.35 * f.stillness),
        },
      }
    },
  }
}
