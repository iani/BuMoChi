import { defineConfig, devices } from '@playwright/test'

const PORT_WEB = 5173
const IS_CI = process.env['CI'] !== undefined && process.env['CI'] !== ''
const PORT_API = 8000

/**
 * Project filters from the CLI, mirroring Playwright's variadic `--project <name...>` /
 * `--project=<name>` option (every value up to the next `-` flag; empty = all projects).
 */
function selectedProjects(argv: readonly string[]): string[] {
  const names: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--project=')) {
      names.push(arg.slice('--project='.length))
    } else if (arg === '--project') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        names.push(argv[++i])
      }
    }
  }
  return names
}

/** Playwright-style project matching: literal characters plus `*` wildcards. */
function matchesProject(filter: string, name: string): boolean {
  const pattern = filter
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${pattern}$`).test(name)
}

const projectFilters = selectedProjects(process.argv)
// The ui/vrt layers mock every /api call, so uvicorn only starts when e2e is (or may be) selected.
const needsBackend =
  projectFilters.length === 0 || projectFilters.some((filter) => matchesProject(filter, 'e2e'))

const webServer: NonNullable<Parameters<typeof defineConfig>[0]['webServer']> = [
  {
    command: `npm run dev -- --port ${PORT_WEB} --strictPort`,
    url: `http://localhost:${PORT_WEB}`,
    reuseExistingServer: !IS_CI,
    stdout: 'pipe',
  },
]
if (needsBackend) {
  webServer.push({
    command: `. .venv/bin/activate && uvicorn app.main:app --port ${PORT_API}`,
    cwd: '../backend',
    url: `http://localhost:${PORT_API}/api/health`,
    reuseExistingServer: !IS_CI,
    stdout: 'pipe',
  })
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 1 : undefined,
  reporter: IS_CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }]],
  snapshotPathTemplate: 'tests/vrt/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORT_WEB}`,
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'ui', testDir: './tests/ui' },
    {
      name: 'vrt',
      testDir: './tests/vrt',
      use: { contextOptions: { reducedMotion: 'reduce' } },
    },
    { name: 'e2e', testDir: './tests/e2e' },
  ],
  webServer,
})
