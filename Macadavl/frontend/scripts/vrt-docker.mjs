#!/usr/bin/env node
// Regenerates VRT baselines inside the pinned Playwright image so renders match CI.
// The image tag is derived from the exact @playwright/test version in package.json.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(resolve(frontendDir, 'package.json'), 'utf8'))
const version = pkg.devDependencies?.['@playwright/test'] ?? pkg.dependencies?.['@playwright/test']

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    `@playwright/test must be pinned to an exact version in package.json (found: ${version})`,
  )
  process.exit(1)
}

const image = `mcr.microsoft.com/playwright:v${version}-noble`
const extraArgs = process.argv.slice(2)
const inner = [
  'npm ci',
  `npx playwright test --project=vrt --update-snapshots ${extraArgs.join(' ')}`.trim(),
].join(' && ')

// Run as the host user so node_modules/, test-results/ and the baselines stay writable on the host.
const { uid, gid } = userInfo()
const userArgs = uid >= 0 && gid >= 0 ? ['--user', `${uid}:${gid}`, '-e', 'HOME=/tmp'] : []

console.log(`Updating VRT baselines in ${image}`)
const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    ...userArgs,
    '-e',
    'CI=1',
    '-v',
    `${frontendDir}:/work`,
    '-w',
    '/work',
    image,
    'bash',
    '-lc',
    inner,
  ],
  { stdio: 'inherit' },
)

if (result.error) {
  console.error(`Failed to run docker: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
