import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fetchHealth } from './api/client'
import { useAudioStore } from './store/audioStore'
import type { HealthResponse } from './types/api'

vi.mock('./audio/engine', () => ({
  startAudio: vi.fn<() => Promise<void>>().mockResolvedValue(),
  setBpm: vi.fn<(bpm: number) => void>(),
  playTestTone: vi.fn<() => void>(),
}))

vi.mock('./api/client', () => ({
  fetchHealth: vi.fn<typeof fetchHealth>(),
}))

const fetchHealthMock = vi.mocked(fetchHealth)

describe('App', () => {
  beforeEach(() => {
    useAudioStore.setState({ transport: 'stopped', bpm: 120 })
    fetchHealthMock.mockReset()
    fetchHealthMock.mockResolvedValue({ status: 'ok', version: '0.0.0-test' })
  })

  it('should render the initial transport state', async () => {
    // GIVEN / WHEN
    render(<App />)
    // THEN
    expect(screen.getByTestId('transport')).toHaveTextContent('Transport: stopped')
    expect(await screen.findByText('API: ok')).toBeInTheDocument()
  })

  it('should switch to playing when Play is clicked', async () => {
    // GIVEN
    render(<App />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    // THEN
    expect(screen.getByTestId('transport')).toHaveTextContent('Transport: playing')
  })

  it('should show API: ok when the health check resolves', async () => {
    // GIVEN
    const health: HealthResponse = { status: 'ok', version: '1.2.3' }
    fetchHealthMock.mockResolvedValue(health)
    // WHEN
    render(<App />)
    // THEN
    expect(await screen.findByText('API: ok')).toBeInTheDocument()
    expect(screen.getByTestId('health')).toHaveTextContent('API: ok')
  })

  it.each([
    ['ok', { status: 'ok', version: '1.2.3' }],
    ['unreachable', undefined],
  ] as const)('should expose the %s health state on the readout', async (state, health) => {
    // GIVEN
    if (health === undefined) {
      fetchHealthMock.mockRejectedValue(new Error('Health check failed: 503'))
    } else {
      fetchHealthMock.mockResolvedValue(health)
    }
    // WHEN
    render(<App />)
    // THEN
    expect(await screen.findByText(`API: ${state}`)).toHaveAttribute('data-state', state)
  })

  it('should expose the transport state on the readout', async () => {
    // GIVEN
    render(<App />)
    expect(screen.getByTestId('transport')).toHaveAttribute('data-state', 'stopped')
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    // THEN
    expect(screen.getByTestId('transport')).toHaveAttribute('data-state', 'playing')
  })

  it('should show API: unreachable when the health check rejects', async () => {
    // GIVEN
    fetchHealthMock.mockRejectedValue(new Error('Health check failed: 503'))
    // WHEN
    render(<App />)
    // THEN
    expect(await screen.findByText('API: unreachable')).toBeInTheDocument()
    expect(screen.getByTestId('health')).toHaveTextContent('API: unreachable')
  })
})
