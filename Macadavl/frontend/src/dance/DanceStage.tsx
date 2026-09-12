import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import type { DanceAudioEngine } from '../audio/danceEngine'
import { createNullEngine } from '../audio/danceEngine'
import { createToneDanceEngine, type ToneVoice } from '../audio/engine'
import { createOscDanceEngine } from '../audio/oscEngine'
import type { FeatureFrame } from '../features/types'
import { MAPPING_INFOS, createMapping, isMappingId, type MappingId } from '../mapping/registry'
import type { ControlFrame } from '../mapping/types'
import { DuetPipeline, type DuetTick } from '../pipeline/duet'
import { DancePipeline, type PipelineTick } from '../pipeline/pipeline'
import { CAMERA_FACINGS, cameraIdForDevice, listCameras } from '../pose/camera'
import { createDuetPoseSource, createPoseSource } from '../pose/sources'
import { downloadBlob, startStageRecording, type StageRecording } from '../recording/mediaRecorder'
import {
  DuetTimelineRecorder,
  TimelineRecorder,
  timelineToBlob,
  type DuetTimeline,
  type Timeline,
} from '../recording/timeline'
import {
  DANCE_ENGINES,
  DANCE_MODES,
  DANCE_SOURCES,
  isDanceEngineId,
  isDanceMode,
  isDanceSourceId,
  useDanceStore,
  type DancerIndex,
} from '../store/danceStore'
import {
  clearScene,
  drawStage,
  emptyScene,
  type StageDancer,
  type StagePalette,
  type StageScene,
} from '../visuals/stage'

const DANCER_GUIDE_URL =
  'https://github.com/openhackbot/ai-and-music-2026/blob/main/docs/DANCER-GUIDE.md'

const FEATURE_READOUT: readonly (readonly [keyof FeatureFrame, string])[] = [
  ['energy', 'energy'],
  ['upperEnergy', 'upper'],
  ['lowerEnergy', 'lower'],
  ['sharpness', 'sharpness'],
  ['stillness', 'stillness'],
  ['handHeight', 'hands'],
  ['armSpread', 'spread'],
  ['torsoLean', 'lean'],
  ['stanceWidth', 'stance'],
  ['symmetry', 'symmetry'],
  ['confidence', 'confidence'],
]

const readPalette = (el: HTMLElement): StagePalette => {
  const css = getComputedStyle(el)
  const v = (name: string, fallback: string): string => css.getPropertyValue(name).trim() || fallback
  return {
    bg: v('--bg', '#16140f'),
    ink: v('--ink', '#f1ebdd'),
    muted: v('--muted', '#a69c88'),
    a1: v('--a1', '#c8472b'),
    a2: v('--a2', '#c9a227'),
    a3: v('--a3', '#7fb3a8'),
    a4: v('--a4', '#d9a441'),
  }
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toFixed(2)

const OSC_HINT = 'Run tools/sc-bridge and SuperCollider first — see docs/SUPERCOLLIDER.md'

const controlSummary = (control: ControlFrame | null): string =>
  control === null
    ? 'control: —'
    : `intensity ${fmt(control.params.intensity)} · pitch ${fmt(control.params.pitch)} · density ${fmt(control.params.density)}`

const eventLabel = (control: ControlFrame): string | null => {
  const event = control.events[0]
  return event === undefined ? null : `${event.kind} @ ${Math.round(event.t)} ms`
}

const applyTick = (dancer: StageDancer, tick: PipelineTick): void => {
  dancer.pose = tick.pose
  dancer.features = tick.features
  dancer.control = tick.control
  if (tick.control.events.some((e) => e.kind === 'hit')) {
    dancer.pulse = 1
  }
}

type Running =
  | { kind: 'solo'; pipeline: DancePipeline; engine: DanceAudioEngine }
  | { kind: 'duet'; pipeline: DuetPipeline; engines: readonly [DanceAudioEngine, DanceAudioEngine] }

type Recorder = TimelineRecorder | DuetTimelineRecorder

export interface DanceStageProps {
  /** Injected for tests; defaults to the Tone.js engine (voice B a fifth up in duet mode). */
  createEngine?: (voice: ToneVoice) => DanceAudioEngine
  muted?: boolean
}

const MAPPING_LABELS: readonly [string, string] = ['mapping', 'mapping B']

interface MappingSelectProps {
  dancer: DancerIndex
  value: MappingId
  caption: string
  onChange: (id: MappingId) => void
}

function MappingSelect({ dancer, value, caption, onChange }: MappingSelectProps): JSX.Element {
  return (
    <label>
      {caption}
      <select
        aria-label={MAPPING_LABELS[dancer]}
        value={value}
        onChange={(e) => {
          if (isMappingId(e.target.value)) {
            onChange(e.target.value)
          }
        }}
      >
        {MAPPING_INFOS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface DancerReadoutProps {
  dancer: DancerIndex
  features: FeatureFrame
  control: ControlFrame | null
  lastEvent: string
  mappingId: MappingId
  duet: boolean
}

function DancerReadout({
  dancer,
  features,
  control,
  lastEvent,
  mappingId,
  duet,
}: DancerReadoutProps): JSX.Element {
  const suffix = dancer === 0 ? '' : '-b'
  const name = duet ? `Dancer ${dancer === 0 ? 'A' : 'B'}` : 'Feature readout'
  return (
    <section className="panel" aria-label={name} data-dancer={dancer === 0 ? 'A' : 'B'}>
      {duet ? <h2 className="dancer-title">{name}</h2> : null}
      <dl className="features" data-testid={`features${suffix}`} data-present={features.present}>
        {FEATURE_READOUT.map(([key, label]) => (
          <div key={key} className="feature">
            <dt>{label}</dt>
            <dd data-testid={`feature-${key}${suffix}`}>{fmt(Number(features[key]))}</dd>
          </div>
        ))}
      </dl>
      <p className="readout" data-testid={`control-readout${suffix}`}>
        <span>{controlSummary(control)}</span>
        <span data-testid={`last-event${suffix}`}>event: {lastEvent}</span>
      </p>
      <p className="readout">
        <span>
          Mapping: <em>{MAPPING_INFOS.find((m) => m.id === mappingId)?.description}</em>
        </span>
      </p>
    </section>
  )
}

export function DanceStage({ createEngine, muted = false }: DanceStageProps): JSX.Element {
  const sourceId = useDanceStore((s) => s.sourceId)
  const mode = useDanceStore((s) => s.mode)
  const cameraId = useDanceStore((s) => s.cameraId)
  const cameraDevices = useDanceStore((s) => s.cameraDevices)
  const mappingId = useDanceStore((s) => s.mappingId)
  const engineId = useDanceStore((s) => s.engineId)
  const mappingIdB = useDanceStore((s) => s.mappingIdB)
  const status = useDanceStore((s) => s.status)
  const error = useDanceStore((s) => s.error)
  const recording = useDanceStore((s) => s.recording)
  const features = useDanceStore((s) => s.features)
  const control = useDanceStore((s) => s.control)
  const featuresB = useDanceStore((s) => s.featuresB)
  const controlB = useDanceStore((s) => s.controlB)
  const frameCount = useDanceStore((s) => s.frameCount)
  const setSource = useDanceStore((s) => s.setSource)
  const setMode = useDanceStore((s) => s.setMode)
  const setCamera = useDanceStore((s) => s.setCamera)
  const setCameraDevices = useDanceStore((s) => s.setCameraDevices)
  const setMapping = useDanceStore((s) => s.setMapping)
  const setEngine = useDanceStore((s) => s.setEngine)
  const setStatus = useDanceStore((s) => s.setStatus)
  const setRecording = useDanceStore((s) => s.setRecording)
  const tick = useDanceStore((s) => s.tick)
  const tickDuet = useDanceStore((s) => s.tickDuet)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneRef = useRef<StageScene>(emptyScene())
  const runningRef = useRef<Running | null>(null)
  const timelineRef = useRef<Recorder | null>(null)
  const mediaRef = useRef<StageRecording | null>(null)
  const [lastEvent, setLastEvent] = useState<string>('—')
  const [lastEventB, setLastEventB] = useState<string>('—')
  const duet = mode === 'duet'

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d') ?? null
    let raf = 0
    if (canvas !== null && ctx !== null) {
      const palette = readPalette(canvas)
      const frame = (): void => {
        const scene = sceneRef.current
        for (const dancer of scene.dancers) {
          dancer.pulse *= 0.9
        }
        drawStage(ctx, canvas.width, canvas.height, scene, palette)
        raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }
    return () => cancelAnimationFrame(raf)
  }, [])

  const stop = useCallback((): void => {
    const running = runningRef.current
    if (running === null) {
      return
    }
    running.pipeline.stop()
    if (running.kind === 'solo') {
      running.engine.dispose()
    } else {
      for (const engine of running.engines) {
        engine.dispose()
      }
    }
    runningRef.current = null
    clearScene(sceneRef.current)
    setStatus('ended')
  }, [setStatus])

  useEffect(() => stop, [stop])

  const onTick = useCallback(
    (t: PipelineTick): void => {
      applyTick(sceneRef.current.dancers[0], t)
      const label = eventLabel(t.control)
      if (label !== null) {
        setLastEvent(label)
      } else if (!t.features.present) {
        setLastEvent('—')
      }
      const recorder = timelineRef.current
      if (recorder instanceof TimelineRecorder) {
        recorder.push(t)
      }
      tick(t.features, t.control)
    },
    [tick],
  )

  const onDuetTick = useCallback(
    (t: DuetTick): void => {
      const [a, b] = t.lanes
      applyTick(sceneRef.current.dancers[0], a)
      applyTick(sceneRef.current.dancers[1], b)
      const labelA = eventLabel(a.control)
      if (labelA !== null) {
        setLastEvent(labelA)
      } else if (!a.features.present) {
        setLastEvent('—')
      }
      const labelB = eventLabel(b.control)
      if (labelB !== null) {
        setLastEventB(labelB)
      } else if (!b.features.present) {
        setLastEventB('—')
      }
      const recorder = timelineRef.current
      if (recorder instanceof DuetTimelineRecorder) {
        recorder.push({ t: t.t, dancers: [a, b] })
      }
      tickDuet([a.features, a.control], [b.features, b.control])
    },
    [tickDuet],
  )

  const start = async (): Promise<void> => {
    setStatus('starting')
    setLastEvent('—')
    setLastEventB('—')
    try {
      const defaultFactory = (voice: ToneVoice): DanceAudioEngine =>
        engineId === 'osc' ? createOscDanceEngine({ dancer: voice }) : createToneDanceEngine({ voice })
      const factory = createEngine ?? (muted ? () => createNullEngine() : defaultFactory)
      let running: Running
      if (duet) {
        const source = await createDuetPoseSource(sourceId, cameraId)
        const engines: readonly [DanceAudioEngine, DanceAudioEngine] = [factory('A'), factory('B')]
        const pipeline = new DuetPipeline({
          source,
          lanes: [
            { mapping: createMapping(mappingId), engine: engines[0] },
            { mapping: createMapping(mappingIdB), engine: engines[1] },
          ],
          onTick: onDuetTick,
        })
        running = { kind: 'duet', pipeline, engines }
        clearScene(sceneRef.current)
        sceneRef.current.video = source.videoElement
        sceneRef.current.frameAspect = source.frameAspect
      } else {
        const source = await createPoseSource(sourceId, cameraId)
        const engine = factory('A')
        const pipeline = new DancePipeline({ source, mapping: createMapping(mappingId), engine, onTick })
        running = { kind: 'solo', pipeline, engine }
        clearScene(sceneRef.current)
        sceneRef.current.video = source.videoElement
        sceneRef.current.frameAspect = source.frameAspect
      }
      runningRef.current = running
      await running.pipeline.start()
      setStatus('running')
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : String(err))
      return
    }
    if (sourceId === 'camera') {
      try {
        setCameraDevices(await listCameras())
      } catch {
        // Picker refresh only: the stream is already running with the chosen constraints.
      }
    }
  }

  const changeMapping = (dancer: DancerIndex, id: MappingId): void => {
    setMapping(id, dancer)
    const running = runningRef.current
    if (running === null) {
      return
    }
    if (running.kind === 'duet') {
      running.pipeline.setMapping(dancer, createMapping(id))
    } else if (dancer === 0) {
      running.pipeline.setMapping(createMapping(id))
    }
  }

  const captureAudio = (): MediaStream | null => {
    const running = runningRef.current
    if (running === null) {
      return null
    }
    if (running.kind === 'solo') {
      return running.engine.captureStream()
    }
    // Both Tone voices share one tap, so the first non-null stream carries the mix.
    return running.engines[0].captureStream() ?? running.engines[1].captureStream()
  }

  const toggleRecording = async (): Promise<void> => {
    if (!recording) {
      const timeline: Recorder = duet
        ? new DuetTimelineRecorder(sourceId, [mappingId, mappingIdB])
        : new TimelineRecorder(sourceId, mappingId)
      timeline.start()
      timelineRef.current = timeline
      const canvas = canvasRef.current
      mediaRef.current = canvas === null ? null : startStageRecording(canvas, captureAudio())
      setRecording(true)
      return
    }
    setRecording(false)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const timeline: Timeline | DuetTimeline | undefined = timelineRef.current?.stop()
    timelineRef.current = null
    if (timeline !== undefined) {
      downloadBlob(timelineToBlob(timeline), `dance-timeline-${stamp}.json`)
    }
    const media = mediaRef.current
    mediaRef.current = null
    if (media !== null) {
      downloadBlob(await media.stop(), `dance-stage-${stamp}.webm`)
    }
  }

  const busy = status === 'starting' || status === 'running'

  return (
    <main className="stage" data-mode={mode}>
      <h1>Dance Stage</h1>
      <p className="eyebrow">Movement → features → mapping → sound</p>
      <section className="panel" aria-label="Pipeline controls">
        <label>
          Source
          <select
            aria-label="source"
            value={sourceId}
            disabled={busy}
            onChange={(e) => {
              if (isDanceSourceId(e.target.value)) {
                setSource(e.target.value)
              }
            }}
          >
            {Object.entries(DANCE_SOURCES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dancers
          <select
            aria-label="dancers"
            value={mode}
            disabled={busy}
            onChange={(e) => {
              if (isDanceMode(e.target.value)) {
                setMode(e.target.value)
              }
            }}
          >
            {Object.entries(DANCE_MODES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {sourceId === 'camera' && (
          <label>
            Camera
            <select
              aria-label="camera"
              value={cameraId}
              disabled={busy}
              onChange={(e) => setCamera(e.target.value)}
            >
              {Object.entries(CAMERA_FACINGS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
              {cameraDevices.map((d) => (
                <option key={d.deviceId} value={cameraIdForDevice(d.deviceId)}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <MappingSelect
          dancer={0}
          value={mappingId}
          caption={duet ? 'Mapping · dancer A' : 'Mapping'}
          onChange={(id) => changeMapping(0, id)}
        />
        {duet ? (
          <MappingSelect
            dancer={1}
            value={mappingIdB}
            caption="Mapping · dancer B"
            onChange={(id) => changeMapping(1, id)}
          />
        ) : null}
        <label>
          Engine
          <select
            aria-label="engine"
            value={engineId}
            disabled={busy}
            onChange={(e) => {
              if (isDanceEngineId(e.target.value)) {
                setEngine(e.target.value)
              }
            }}
          >
            {Object.entries(DANCE_ENGINES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {engineId === 'osc' && (
          <p className="readout">
            <span>{OSC_HINT}</span>
          </p>
        )}
        <div className="transport">
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              void start()
            }}
          >
            Start
          </button>
          <button disabled={!busy} onClick={stop}>
            Stop
          </button>
          <button
            disabled={status !== 'running'}
            aria-pressed={recording}
            onClick={() => {
              void toggleRecording()
            }}
          >
            {recording ? 'Stop recording' : 'Record'}
          </button>
        </div>
        <p className="readout" data-testid="pipeline-status" data-state={status}>
          <span>Pipeline: {status}</span>
          <span data-testid="frame-count">{frameCount} frames</span>
        </p>
        {duet ? (
          <p className="readout">
            <span>
              Duet: the leftmost person on first sight is <strong>A</strong> (teal), the other{' '}
              <strong>B</strong> (gold); each keeps their seat while visible. B's voice sits a fifth up.
            </span>
          </p>
        ) : null}
        {error !== null ? (
          <p role="alert" className="readout" data-state="unreachable">
            {error}
          </p>
        ) : null}
      </section>
      <canvas
        ref={canvasRef}
        className="stage-canvas"
        width={960}
        height={540}
        aria-label="Dance stage visualisation"
      >
        Live visualisation of the dancer, their movement energy and the sound parameters.
      </canvas>
      <div className="readouts">
        <DancerReadout
          dancer={0}
          features={features}
          control={control}
          lastEvent={lastEvent}
          mappingId={mappingId}
          duet={duet}
        />
        {duet ? (
          <DancerReadout
            dancer={1}
            features={featuresB}
            control={controlB}
            lastEvent={lastEventB}
            mappingId={mappingIdB}
            duet
          />
        ) : null}
      </div>
      <p className="nav nav-secondary">
        <a href={DANCER_GUIDE_URL} target="_blank" rel="noreferrer">
          Dancer's guide: setup, what the system hears, one profile per mapping →
        </a>
      </p>
    </main>
  )
}
