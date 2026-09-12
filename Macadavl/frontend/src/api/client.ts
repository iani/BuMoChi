import type { HealthResponse } from '../types/api'

const DEFAULT_API_BASE = '/api'

export const resolveApiBase = (configured: string | undefined): string => {
  const trimmed = configured?.trim() ?? ''
  return trimmed === '' ? DEFAULT_API_BASE : trimmed.replace(/\/+$/, '')
}

export const API_BASE = resolveApiBase(import.meta.env.VITE_API_URL)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const isHealthResponse = (value: unknown): value is HealthResponse =>
  isRecord(value) && value['status'] === 'ok' && typeof value['version'] === 'string'

export async function fetchHealth(fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  const res = await fetchImpl(`${API_BASE}/health`)
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }
  const body: unknown = await res.json()
  if (!isHealthResponse(body)) {
    throw new Error('Unexpected health payload')
  }
  return body
}
