import { describe, expect, it, vi } from 'vitest'
import { fetchHealth, isHealthResponse, resolveApiBase } from './client'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status })

describe('fetchHealth', () => {
  it('should return the parsed health payload', async () => {
    // GIVEN
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ status: 'ok', version: '0.1.0' }),
    )
    // WHEN
    const health = await fetchHealth(fetchMock)
    // THEN
    expect(health).toStrictEqual({ status: 'ok', version: '0.1.0' })
    expect(fetchMock).toHaveBeenCalledWith('/api/health')
  })

  it('should throw on non-2xx responses', async () => {
    // GIVEN
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('nope', { status: 503 }))
    // WHEN / THEN
    await expect(fetchHealth(fetchMock)).rejects.toThrow('503')
  })

  it('should throw when the payload does not match the HealthResponse contract', async () => {
    // GIVEN
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status: 'degraded' }))
    // WHEN / THEN
    await expect(fetchHealth(fetchMock)).rejects.toThrow('Unexpected health payload')
  })
})

describe('resolveApiBase', () => {
  it.each<[string, string | undefined, string]>([
    ['the same-origin default when unset', undefined, '/api'],
    ['the same-origin default when blank', '   ', '/api'],
    ['an absolute URL as-is', 'https://api.example.com/api', 'https://api.example.com/api'],
    ['an absolute URL without its trailing slash', 'https://api.example.com/api/', 'https://api.example.com/api'],
    ['a trimmed value', ' https://api.example.com/api ', 'https://api.example.com/api'],
  ])('should return %s', (_label, value, expected) => {
    expect(resolveApiBase(value)).toBe(expected)
  })
})

describe('isHealthResponse', () => {
  it.each<[string, unknown, boolean]>([
    ['a valid payload', { status: 'ok', version: '1.0.0' }, true],
    ['a wrong status literal', { status: 'ok!', version: '1.0.0' }, false],
    ['a missing version', { status: 'ok' }, false],
    ['a non-string version', { status: 'ok', version: 1 }, false],
    ['null', null, false],
    ['a string', 'ok', false],
  ])('should return %s for %s', (_label, value, expected) => {
    expect(isHealthResponse(value)).toBe(expected)
  })
})
