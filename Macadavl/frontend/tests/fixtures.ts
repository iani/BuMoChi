import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import type { HealthResponse } from '../src/types/api'

export const DEFAULT_HEALTH: HealthResponse = { status: 'ok', version: '0.0.0-test' }

export interface MockApi {
  /** Fulfil GET /api/health with a typed payload (default {status:'ok',version:'0.0.0-test'}). */
  health: (body?: HealthResponse, status?: number) => Promise<void>
  /** Fulfil an arbitrary API route (path relative to baseURL, e.g. '/api/foo') with typed JSON. */
  json: (path: string, body: unknown, status?: number) => Promise<void>
  /** Fail every unmatched /api/** request so tests can never hit a real backend. */
  blockRest: () => Promise<void>
}

export interface Fixtures {
  mockApi: MockApi
  audioStub: void
}

/**
 * Wraps the browser's AudioContext so Tone.js can run headlessly without an
 * audio device or user gesture: the context always reports `running`,
 * `resume()`/`close()` resolve immediately and a `statechange` event is fired
 * so listeners waiting for the context to start are released. The native
 * implementation is kept underneath because Tone's standardized-audio-context
 * layer validates the real node/prototype shapes at construction time.
 * Serialised into the page via `page.addInitScript`, so it must be
 * self-contained.
 */
function installAudioStub(): void {
  const Native = window.AudioContext

  class StubAudioContext extends Native {
    constructor(options?: AudioContextOptions) {
      super(options)
      queueMicrotask(() => this.dispatchEvent(new Event('statechange')))
    }
    override get state(): AudioContextState {
      return 'running'
    }
    override resume(): Promise<void> {
      this.dispatchEvent(new Event('statechange'))
      return Promise.resolve()
    }
    override suspend(): Promise<void> {
      return Promise.resolve()
    }
    override close(): Promise<void> {
      return Promise.resolve()
    }
  }

  window.AudioContext = StubAudioContext
}

/** Matches backend API requests only — never Vite-served modules such as /src/api/client.ts. */
const isApiRequest = (url: URL): boolean => url.pathname.startsWith('/api/')

function createMockApi(page: Page): MockApi {
  const fulfilJson = async (path: string, body: unknown, status: number) => {
    await page.route(path, (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: body === undefined ? '' : JSON.stringify(body),
      }),
    )
  }

  return {
    health: (body = DEFAULT_HEALTH, status = 200) => fulfilJson('/api/health', body, status),
    json: (path, body, status = 200) => fulfilJson(path, body, status),
    blockRest: async () => {
      await page.route(isApiRequest, (route) => route.abort('connectionrefused'))
    },
  }
}

export const test = base.extend<Fixtures>({
  audioStub: [
    async ({ page }, provide) => {
      await page.addInitScript(installAudioStub)
      await provide()
    },
    { auto: true },
  ],
  mockApi: async ({ page }, provide) => {
    const api = createMockApi(page)
    await api.blockRest()
    await provide(api)
  },
})

export { expect }
