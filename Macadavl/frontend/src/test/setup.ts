import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

type ConsoleMethod = 'error' | 'warn'
const WATCHED: readonly ConsoleMethod[] = ['error', 'warn']

let leaked: string[] = []

beforeEach(() => {
  leaked = []
  for (const method of WATCHED) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      leaked.push(`console.${method}: ${args.map(String).join(' ')}`)
    })
  }
})

afterEach(() => {
  vi.restoreAllMocks()
  if (leaked.length > 0) {
    const messages = leaked.join('\n')
    leaked = []
    throw new Error(`Unexpected console output during test (mock it explicitly if intended):\n${messages}`)
  }
})
