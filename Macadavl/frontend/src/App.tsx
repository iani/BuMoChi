import { useEffect, useState, type JSX } from 'react'
import { fetchHealth } from './api/client'
import { useAudioStore } from './store/audioStore'
import { playTestTone, setBpm as setEngineBpm, startAudio } from './audio/engine'
import { DANCE_ROUTE_HASH } from './dance/route'

type HealthStatus = 'pending' | 'ok' | 'unreachable'

function App(): JSX.Element {
  const transport = useAudioStore((s) => s.transport)
  const bpm = useAudioStore((s) => s.bpm)
  const setTransport = useAudioStore((s) => s.setTransport)
  const setBpm = useAudioStore((s) => s.setBpm)
  const [health, setHealth] = useState<HealthStatus>('pending')

  useEffect(() => {
    let cancelled = false
    fetchHealth().then(
      () => {
        if (!cancelled) {
          setHealth('ok')
        }
      },
      () => {
        if (!cancelled) {
          setHealth('unreachable')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const handlePlay = async () => {
    await startAudio()
    setEngineBpm(bpm)
    playTestTone()
    setTransport('playing')
  }

  return (
    <main>
      <h1>Audio Workbench</h1>
      <p className="eyebrow">AI &amp; Music 2026</p>
      <section className="panel" aria-label="Transport console">
        <p className="readout" data-testid="health" data-state={health}>
          API: {health === 'pending' ? 'checking…' : health}
        </p>
        <p className="readout" data-testid="transport" data-state={transport}>
          Transport: {transport}
        </p>
        <label>
          BPM
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            aria-label="bpm"
          />
        </label>
        <div className="transport">
          <button
            className="primary"
            onClick={() => {
              void handlePlay()
            }}
          >
            Play
          </button>
          <button onClick={() => setTransport('stopped')}>Stop</button>
        </div>
      </section>
      <p className="nav">
        <a href={DANCE_ROUTE_HASH}>Open the Dance Stage →</a>
      </p>
    </main>
  )
}

export default App
