import type { ControlFrame, ControlParams } from '../mapping/types'
import type { DanceAudioEngine } from './danceEngine'

export const OSC_DEFAULT_URL = 'ws://localhost:57130'
export const OSC_CONNECT_TIMEOUT_MS = 2000
export const OSC_MAX_PARAMS_PER_SECOND = 60

export type OscDancer = 'A' | 'B'

/** Order of the floats in `/dance/<dancer>/params`; the SuperCollider side relies on it. */
export const OSC_PARAM_ORDER: readonly (keyof ControlParams)[] = [
  'intensity',
  'brightness',
  'pitch',
  'width',
  'pan',
  'density',
  'space',
]

export interface OscMessage {
  address: string
  args: readonly (string | number)[]
}

export const isOscMessage = (value: unknown): value is OscMessage =>
  typeof value === 'object' &&
  value !== null &&
  'address' in value &&
  typeof value.address === 'string' &&
  'args' in value &&
  Array.isArray(value.args) &&
  value.args.every((arg: unknown) => typeof arg === 'string' || typeof arg === 'number')

/** The subset of `WebSocket` the engine uses, so tests can inject a fake. */
export type OscSocketEvent = 'open' | 'error' | 'close'

export interface OscSocket {
  readyState: number
  addEventListener: (type: OscSocketEvent, listener: () => void) => void
  removeEventListener: (type: OscSocketEvent, listener: () => void) => void
  send: (data: string) => void
  close: () => void
}

const SOCKET_OPEN = 1

export interface OscDanceEngineOptions {
  url?: string
  dancer?: OscDancer
  socketFactory?: (url: string) => OscSocket
}

const defaultSocketFactory = (url: string): OscSocket => new WebSocket(url)

/**
 * Sends every ControlFrame as JSON over a local WebSocket; `tools/sc-bridge`
 * turns each message into an OSC packet for SuperCollider. Params are
 * rate-limited by dropping (never queuing) so the sound follows the dancer
 * with the lowest latency the bridge allows.
 */
export function createOscDanceEngine(options: OscDanceEngineOptions = {}): DanceAudioEngine {
  const url = options.url ?? OSC_DEFAULT_URL
  const dancer = options.dancer ?? 'A'
  const socketFactory = options.socketFactory ?? defaultSocketFactory
  const prefix = `/dance/${dancer}`
  const minParamsIntervalMs = 1000 / OSC_MAX_PARAMS_PER_SECOND

  let socket: OscSocket | null = null
  let open = false
  let lastParamsAt = -Infinity
  let cancelPendingStart: ((reason: Error) => void) | null = null

  const send = (message: OscMessage): void => {
    if (socket === null || !open || socket.readyState !== SOCKET_OPEN) {
      return
    }
    socket.send(JSON.stringify(message))
  }

  let detachListeners: (() => void) | null = null

  const closeSocket = (): void => {
    open = false
    const current = socket
    socket = null
    detachListeners?.()
    detachListeners = null
    current?.close()
  }

  return {
    id: 'osc',
    start: () =>
      new Promise<void>((resolve, reject) => {
        closeSocket()
        const next = socketFactory(url)
        socket = next
        let timer: ReturnType<typeof setTimeout> | null = null
        const settle = (): void => {
          if (timer !== null) {
            clearTimeout(timer)
          }
          cancelPendingStart = null
        }
        const fail = (error: Error): void => {
          settle()
          closeSocket()
          reject(error)
        }
        cancelPendingStart = fail
        timer = setTimeout(() => {
          fail(
            new Error(
              `SuperCollider bridge at ${url} timed out after ${OSC_CONNECT_TIMEOUT_MS} ms — run tools/sc-bridge first`,
            ),
          )
        }, OSC_CONNECT_TIMEOUT_MS)
        const onOpen = (): void => {
          settle()
          open = true
          resolve()
        }
        const onError = (): void => {
          if (!open) {
            fail(new Error(`Could not reach the SuperCollider bridge at ${url} — run tools/sc-bridge first`))
          }
        }
        const onClose = (): void => {
          if (open) {
            open = false
          } else {
            fail(
              new Error(`SuperCollider bridge at ${url} closed before it was ready — run tools/sc-bridge first`),
            )
          }
        }
        next.addEventListener('open', onOpen)
        next.addEventListener('error', onError)
        next.addEventListener('close', onClose)
        detachListeners = () => {
          next.removeEventListener('open', onOpen)
          next.removeEventListener('error', onError)
          next.removeEventListener('close', onClose)
        }
      }),
    apply(frame: ControlFrame) {
      const now = performance.now()
      if (now - lastParamsAt >= minParamsIntervalMs) {
        lastParamsAt = now
        send({ address: `${prefix}/params`, args: OSC_PARAM_ORDER.map((key) => frame.params[key]) })
      }
      for (const event of frame.events) {
        send({ address: `${prefix}/event`, args: [event.kind, event.strength] })
      }
    },
    stop() {
      send({ address: `${prefix}/stop`, args: [] })
    },
    dispose() {
      cancelPendingStart?.(new Error('SuperCollider engine disposed before the bridge connected'))
      closeSocket()
    },
    captureStream: () => null,
  }
}
