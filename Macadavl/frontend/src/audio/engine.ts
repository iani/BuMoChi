import * as Tone from 'tone'
import type { ControlParams } from '../mapping/types'
import { DEFAULT_CONTROL_PARAMS } from '../mapping/types'
import type { DanceAudioEngine } from './danceEngine'

/**
 * Thin wrapper around Tone.js so components never touch the global
 * AudioContext directly. Browsers require a user gesture before audio can
 * start, so `startAudio` must be called from an event handler.
 */
export async function startAudio(): Promise<void> {
  await Tone.start()
}

export function setBpm(bpm: number): void {
  Tone.getTransport().bpm.value = bpm
}

export function setMasterVolumeDb(db: number): void {
  Tone.getDestination().volume.value = db
}

export function playTestTone(note = 'C4', duration = '8n'): void {
  const synth = new Tone.Synth().toDestination()
  synth.triggerAttackRelease(note, duration)
}

const SCALE = ['C', 'D', 'Eb', 'F', 'G', 'Bb'] as const
const CHORD_HOLD_S = 0.4
const OCTAVES = [2, 3, 4, 5] as const
const PAD_CHORDS: readonly (readonly string[])[] = [
  ['C3', 'G3', 'Eb4'],
  ['F3', 'C4', 'Ab4'],
  ['G3', 'D4', 'Bb4'],
  ['Eb3', 'Bb3', 'G4'],
]

/** Voice B sits a fifth above A with squarer timbres so two dancers stay tellable apart. */
export type ToneVoice = 'A' | 'B'

export interface ToneDanceEngineOptions {
  voice?: ToneVoice
}

const VOICE_B_TRANSPOSE = 7

/** One recording tap shared by every engine on the page, so a duet records as one mix. */
let sharedTap: MediaStreamAudioDestinationNode | null = null

const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.min(1, Math.max(0, t))
const pick = <T>(list: readonly T[], t: number): T | undefined =>
  list[Math.min(list.length - 1, Math.max(0, Math.floor(t * list.length)))]

/**
 * Tone.js implementation of the dance engine: a filtered pad that follows the
 * continuous parameters, a 16th-note pattern gated by `density`, percussive
 * `hit` events and a swell on `freeze`/`release`.
 */
export function createToneDanceEngine(options: ToneDanceEngineOptions = {}): DanceAudioEngine {
  const voice = options.voice ?? 'A'
  const note = (name: string): string =>
    voice === 'A' ? name : Tone.Frequency(name).transpose(VOICE_B_TRANSPOSE).toNote()
  const master = new Tone.Gain(0)
  const reverb = new Tone.Freeverb({ roomSize: 0.6, wet: 0.3 })
  const widener = new Tone.StereoWidener(0.5)
  const panner = new Tone.Panner(0)
  const filter = new Tone.Filter({ type: 'lowpass', frequency: 800, rolloff: -24, Q: 1 })
  const pad = new Tone.PolySynth({
    maxPolyphony: 16,
    voice: Tone.Synth,
    options: {
      oscillator: { type: voice === 'A' ? 'fatsawtooth' : 'fatsquare' },
      envelope: { attack: 0.8, decay: 0.3, sustain: 0.8, release: 1.2 },
    },
    volume: -14,
  })
  const pluck = new Tone.Synth({
    oscillator: { type: voice === 'A' ? 'triangle' : 'square' },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.05, release: 0.3 },
    volume: -8,
  })
  const kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 6, volume: -4 })
  const snap = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0 },
    volume: -12,
  })

  pad.chain(filter, panner, widener, reverb, master)
  pluck.chain(filter, panner, widener, reverb, master)
  kick.connect(master)
  snap.chain(reverb, master)
  master.toDestination()

  let params: ControlParams = DEFAULT_CONTROL_PARAMS
  let chordIndex = -1
  let lastChordAt = -Infinity
  let lastKick = 0
  let lastSnap = 0
  let lastPluck = 0
  let step = 0
  let tapped = false

  const loop = new Tone.Loop((time) => {
    step = (step + 1) % 16
    const gate = step % 4 === 0 ? 0.15 : 0.55
    if (params.density > gate && params.intensity > 0.05) {
      const scaleNote = pick(SCALE, ((step * 5) % SCALE.length) / SCALE.length) ?? 'C'
      const octave = pick(OCTAVES, params.pitch) ?? 4
      // A stalled main thread (MediaPipe) delivers ticks in the past; a past time is clamped
      // to "now" by Tone, and two clamped ticks would collide on the same start time.
      lastPluck = Math.max(time, Tone.now(), lastPluck + 0.001)
      pluck.triggerAttackRelease(
        note(`${scaleNote}${octave}`),
        '16n',
        lastPluck,
        lerp(0.2, 0.9, params.density),
      )
    }
  }, '16n')

  return {
    id: 'tone',
    async start() {
      await Tone.start()
      const transport = Tone.getTransport()
      transport.bpm.value = 112
      loop.start(0)
      transport.start()
    },
    apply(frame) {
      params = frame.params
      const now = Tone.now()
      const kickAt = (name: string, duration: string, velocity: number): void => {
        lastKick = Math.max(now, lastKick + 0.001)
        kick.triggerAttackRelease(note(name), duration, lastKick, velocity)
      }
      const snapAt = (duration: string, velocity: number): void => {
        lastSnap = Math.max(now, lastSnap + 0.001)
        snap.triggerAttackRelease(duration, lastSnap, velocity)
      }
      const ramp = 0.08
      master.gain.rampTo(lerp(0, 0.9, params.intensity), ramp, now)
      filter.frequency.rampTo(lerp(250, 6000, params.brightness ** 1.5), ramp, now)
      panner.pan.rampTo(lerp(-0.8, 0.8, params.pan), ramp, now)
      widener.width.rampTo(lerp(0.2, 1, params.width), ramp, now)
      reverb.wet.rampTo(lerp(0.1, 0.6, params.space), 0.3, now)

      const nextChord = Math.min(PAD_CHORDS.length - 1, Math.floor(params.pitch * PAD_CHORDS.length))
      if (nextChord !== chordIndex && params.intensity > 0.05 && now - lastChordAt > CHORD_HOLD_S) {
        lastChordAt = now
        const previous = PAD_CHORDS[chordIndex]
        if (previous !== undefined) {
          pad.triggerRelease(previous.map(note), now)
        }
        const chord = PAD_CHORDS[nextChord]
        if (chord !== undefined) {
          pad.triggerAttack(chord.map(note), now, lerp(0.3, 0.8, params.intensity))
        }
        chordIndex = nextChord
      }

      for (const event of frame.events) {
        switch (event.kind) {
          case 'hit':
            kickAt('C1', '8n', lerp(0.4, 1, event.strength))
            snapAt('16n', lerp(0.2, 0.8, event.strength))
            break
          case 'accent':
            snapAt('8n', event.strength)
            break
          case 'sweep':
            filter.frequency.rampTo(8000, 0.4, now)
            break
          case 'freeze':
            reverb.wet.rampTo(0.85, 0.5, now)
            filter.frequency.rampTo(300, 1.2, now)
            break
          case 'release':
            filter.frequency.rampTo(5000, 0.3, now)
            kickAt('G1', '4n', 0.9)
            break
        }
      }
    },
    stop() {
      const now = Tone.now()
      master.gain.rampTo(0, 0.2, now)
      pad.releaseAll(now)
      chordIndex = -1
      loop.stop()
      Tone.getTransport().stop()
    },
    dispose() {
      loop.dispose()
      for (const node of [pad, pluck, kick, snap, filter, panner, widener, reverb, master]) {
        node.dispose()
      }
    },
    captureStream() {
      sharedTap ??= Tone.getContext().createMediaStreamDestination()
      if (!tapped) {
        master.connect(sharedTap)
        tapped = true
      }
      return sharedTap.stream
    },
  }
}
