import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControlFrame } from '../mapping/types'
import { DEFAULT_CONTROL_PARAMS } from '../mapping/types'
import {
  OSC_DEFAULT_URL,
  createOscDanceEngine,
  isOscMessage,
  type OscSocket,
  type OscSocketEvent,
} from './oscEngine'

class FakeSocket implements OscSocket {
  readonly url: string
  readyState = 0
  readonly sent: string[] = []
  closed = false
  private readonly listeners: Record<OscSocketEvent, Set<() => void>> = {
    open: new Set(),
    error: new Set(),
    close: new Set(),
  }

  constructor(url: string) {
    this.url = url
  }

  addEventListener(type: OscSocketEvent, listener: () => void): void {
    this.listeners[type].add(listener)
  }

  removeEventListener(type: OscSocketEvent, listener: () => void): void {
    this.listeners[type].delete(listener)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
    this.readyState = 3
  }

  open(): void {
    this.readyState = 1
    this.emit('open')
  }

  fail(): void {
    this.emit('error')
    this.emit('close')
  }

  private emit(type: OscSocketEvent): void {
    // snapshot: a listener may remove itself while being called
    const snapshot = Array.from(this.listeners[type])
    for (const listener of snapshot) {
      listener()
    }
  }
}

const frame = (overrides: Partial<ControlFrame> = {}): ControlFrame => ({
  t: 0,
  params: { ...DEFAULT_CONTROL_PARAMS },
  events: [],
  ...overrides,
})

const parseAll = (socket: FakeSocket): { address: string; args: readonly (string | number)[] }[] =>
  socket.sent.map((raw) => {
    const parsed: unknown = JSON.parse(raw)
    if (!isOscMessage(parsed)) {
      throw new Error(`not an OSC message: ${raw}`)
    }
    return parsed
  })

describe('oscEngine', () => {
  let sockets: FakeSocket[]
  const socketFactory = (url: string): OscSocket => {
    const socket = new FakeSocket(url)
    sockets.push(socket)
    return socket
  }
  const connect = async (options: { dancer?: 'A' | 'B'; url?: string } = {}) => {
    const engine = createOscDanceEngine({ ...options, socketFactory })
    const started = engine.start()
    const socket = sockets[0]
    if (socket === undefined) {
      throw new Error('no socket opened')
    }
    socket.open()
    await started
    return { engine, socket }
  }

  beforeEach(() => {
    sockets = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should open the default bridge URL and resolve start() once the socket is open', async () => {
    // GIVEN
    const engine = createOscDanceEngine({ socketFactory })
    // WHEN
    const started = engine.start()
    sockets[0]?.open()
    await started
    // THEN
    expect(engine.id).toBe('osc')
    expect(sockets[0]?.url).toBe(OSC_DEFAULT_URL)
    expect(OSC_DEFAULT_URL).toBe('ws://localhost:57130')
  })

  it('should reject start() with a readable message when the socket errors', async () => {
    // GIVEN
    const engine = createOscDanceEngine({ url: 'ws://localhost:1', socketFactory })
    // WHEN
    const started = engine.start()
    sockets[0]?.fail()
    // THEN
    await expect(started).rejects.toThrow(/SuperCollider bridge.*ws:\/\/localhost:1.*tools\/sc-bridge/)
  })

  it('should reject start() when the socket does not open within the connect timeout', async () => {
    // GIVEN
    const engine = createOscDanceEngine({ socketFactory })
    // WHEN
    const started = engine.start()
    const rejection = started.then(
      () => 'resolved',
      (error: unknown) => (error instanceof Error ? error.message : 'unknown'),
    )
    await vi.advanceTimersByTimeAsync(2100)
    // THEN
    expect(await rejection).toMatch(/timed out/)
    expect(sockets[0]?.closed).toBe(true)
  })

  it('should send the 7 params in the documented order as one JSON message', async () => {
    // GIVEN
    const { engine, socket } = await connect()
    // WHEN
    engine.apply(
      frame({
        params: {
          intensity: 0.1,
          brightness: 0.2,
          pitch: 0.3,
          width: 0.4,
          pan: 0.5,
          density: 0.6,
          space: 0.7,
        },
      }),
    )
    // THEN
    expect(parseAll(socket)).toStrictEqual([
      { address: '/dance/A/params', args: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7] },
    ])
  })

  it.each([
    ['hit', 0.9],
    ['accent', 0.5],
    ['sweep', 1],
    ['freeze', 0.2],
    ['release', 0],
  ] as const)('should forward a %s event as ["%s", strength] after the params', async (kind, strength) => {
    // GIVEN
    const { engine, socket } = await connect()
    // WHEN
    engine.apply(frame({ events: [{ kind, strength, t: 10 }] }))
    // THEN
    const messages = parseAll(socket)
    expect(messages.map((m) => m.address)).toStrictEqual(['/dance/A/params', '/dance/A/event'])
    expect(messages[1]?.args).toStrictEqual([kind, strength])
  })

  it('should address dancer B when configured', async () => {
    // GIVEN
    const { engine, socket } = await connect({ dancer: 'B' })
    // WHEN
    engine.apply(frame({ events: [{ kind: 'hit', strength: 1, t: 0 }] }))
    engine.stop()
    // THEN
    expect(parseAll(socket).map((m) => m.address)).toStrictEqual([
      '/dance/B/params',
      '/dance/B/event',
      '/dance/B/stop',
    ])
  })

  it('should drop params frames arriving faster than 60 per second but never drop events', async () => {
    // GIVEN
    const { engine, socket } = await connect()
    // WHEN two frames land within the same 1/60 s window
    engine.apply(frame({ t: 0 }))
    engine.apply(frame({ t: 5, events: [{ kind: 'hit', strength: 1, t: 5 }] }))
    await vi.advanceTimersByTimeAsync(17)
    engine.apply(frame({ t: 20 }))
    // THEN
    expect(parseAll(socket).map((m) => m.address)).toStrictEqual([
      '/dance/A/params',
      '/dance/A/event',
      '/dance/A/params',
    ])
  })

  it('should send /stop on stop() and close the socket on dispose()', async () => {
    // GIVEN
    const { engine, socket } = await connect()
    // WHEN
    engine.stop()
    engine.dispose()
    // THEN
    expect(parseAll(socket)).toStrictEqual([{ address: '/dance/A/stop', args: [] }])
    expect(socket.closed).toBe(true)
  })

  it('should not send anything before the socket is open or after it is closed', () => {
    // GIVEN
    const engine = createOscDanceEngine({ socketFactory })
    void engine.start().catch(() => null)
    const socket = sockets[0]
    // WHEN
    engine.apply(frame())
    socket?.open()
    engine.dispose()
    engine.apply(frame())
    // THEN
    expect(socket?.sent).toStrictEqual([])
  })

  it('should return null from captureStream()', async () => {
    // GIVEN
    const { engine } = await connect()
    // WHEN / THEN
    expect(engine.captureStream()).toBeNull()
  })
})
