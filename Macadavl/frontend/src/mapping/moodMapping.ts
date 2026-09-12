import type { FeatureFrame } from '../features/types'
import { clamp01, createFreezeGate, createHitGate, ema, HIT_THRESHOLD } from './shared'
import type { ControlFrame, Mapping, MusicEvent } from './types'

export type Mood = 'joy' | 'agitation' | 'sadness' | 'tenderness'

const STATE_ALPHA = 0.08
const JERK_ALPHA = 0.3
const JERK_GAIN = 4
const DEAD_BAND = 0.12
const DWELL_MS = 600

interface Scene {
  intensity: number
  brightness: number
  pitch: number
  widthBase: number
  densityMin: number
  densityMax: number
  space: number
}

const SCENES: Record<Mood, Scene> = {
  joy: { intensity: 0, brightness: 0.3, pitch: 0.2, widthBase: 0.5, densityMin: 0.6, densityMax: 1, space: 0.2 },
  agitation: { intensity: 0.2, brightness: 0.4, pitch: 0, widthBase: 0.3, densityMin: 0.5, densityMax: 0.9, space: 0.1 },
  sadness: { intensity: -0.2, brightness: 0, pitch: -0.25, widthBase: 0.5, densityMin: 0.1, densityMax: 0.3, space: 0.8 },
  tenderness: { intensity: 0, brightness: -0.3, pitch: 0, widthBase: 0.9, densityMin: 0.2, densityMax: 0.4, space: 0.6 },
}

const quadrant = (arousal: number, valence: number): Mood => {
  if (arousal > 0.5) {
    return valence > 0.5 ? 'joy' : 'agitation'
  }
  return valence > 0.5 ? 'tenderness' : 'sadness'
}

/**
 * Places the dancer in Russell's arousal–valence circumplex (arousal from
 * energy and sharpness, valence from smoothness and openness) and switches
 * between four musical scenes with hysteresis and a dwell time, so a mood
 * holds long enough to dance inside it. Parameters keep tracking inside a scene.
 */
export const createMoodMapping = (): Mapping => {
  const hits = createHitGate()
  const freeze = createFreezeGate()
  let arousal = 0.5
  let valence = 0.5
  let jerkiness = 0
  let lastSharpness = 0
  let mood: Mood = 'tenderness'
  let candidate: Mood | null = null
  let candidateSince = 0

  return {
    id: 'mood-rooms',
    label: 'Mood Rooms · arousal × valence scenes',
    description:
      'Energy and sharpness give arousal, smoothness and openness give valence; the ' +
      'dancer moves between four scenes (joy, agitation, sadness, tenderness) that ' +
      'only switch after a steady 600 ms, each change announced by a sweep.',
    reset: () => {
      hits.reset()
      freeze.reset()
      arousal = 0.5
      valence = 0.5
      jerkiness = 0
      lastSharpness = 0
      mood = 'tenderness'
      candidate = null
      candidateSince = 0
    },
    map: (f: FeatureFrame): ControlFrame => {
      const events: MusicEvent[] = []
      jerkiness = ema(jerkiness, clamp01(Math.abs(f.sharpness - lastSharpness) * JERK_GAIN), JERK_ALPHA)
      lastSharpness = f.sharpness
      arousal = ema(arousal, 0.6 * f.energy + 0.4 * f.sharpness, STATE_ALPHA)
      valence = ema(valence, 0.5 * (1 - jerkiness) + 0.3 * f.armSpread + 0.2 * f.handHeight, STATE_ALPHA)

      const decisive = Math.abs(arousal - 0.5) > DEAD_BAND && Math.abs(valence - 0.5) > DEAD_BAND
      const next = decisive ? quadrant(arousal, valence) : null
      if (next === null || next === mood) {
        candidate = null
      } else if (candidate !== next) {
        candidate = next
        candidateSince = f.t
      } else if (f.t - candidateSince >= DWELL_MS) {
        const moved = Math.hypot(arousal - 0.5, valence - 0.5)
        mood = next
        candidate = null
        events.push({ kind: 'sweep', strength: clamp01(moved * 2), t: f.t })
      }

      if (f.present) {
        hits.fire(f, HIT_THRESHOLD, events)
        freeze.update(f, events)
      }

      const scene = SCENES[mood]
      return {
        t: f.t,
        events,
        params: {
          intensity: f.present ? clamp01(0.1 + 0.8 * f.energy + scene.intensity) : 0,
          brightness: clamp01(0.2 + 0.6 * f.upperEnergy + scene.brightness),
          pitch: clamp01(f.handHeight + scene.pitch),
          width: clamp01(scene.widthBase + 0.4 * f.armSpread),
          pan: clamp01(0.5 + 0.5 * f.torsoLean),
          density: scene.densityMin + (scene.densityMax - scene.densityMin) * f.lowerEnergy,
          space: clamp01(scene.space + 0.2 * f.stillness),
        },
      }
    },
  }
}
