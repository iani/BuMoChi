#!/usr/bin/env node
// Mechanical checks for test conventions that oxlint cannot express (see AGENTS.md §2/§5).
// Exit 1 with a file:line list on any violation.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname

const walk = (dir) => {
  let out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (name === 'node_modules' || name.endsWith('-snapshots')) {
      continue
    }
    if (statSync(p).isDirectory()) {
      out = out.concat(walk(p))
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p)
    }
  }
  return out
}

const exists = (p) => {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}

const unitTests = walk(join(root, 'src')).filter((f) => /\.test\.tsx?$/.test(f))
const pw = exists(join(root, 'tests')) ? walk(join(root, 'tests')) : []
const pwUi = pw.filter((f) => f.includes('/tests/ui/'))
const pwVrt = pw.filter((f) => f.includes('/tests/vrt/'))
const pwE2e = pw.filter((f) => f.includes('/tests/e2e/'))

/** @type {{scope: string[], pattern: RegExp, message: string, allow?: RegExp}[]} */
const rules = [
  { scope: unitTests, pattern: /\bfireEvent\b/, message: 'fireEvent in unit test — use userEvent' },
  {
    scope: [...unitTests, ...pw],
    pattern: /\b(it|test|describe)\.only\(/,
    message: 'focused test',
  },
  {
    scope: [...unitTests, ...pw],
    pattern: /\b(?:(?:it|test|describe)\.(?:skip|fixme|todo)\(|x(?:it|test|describe)\()/,
    message:
      'skipped test — needs explicit @_lllum approval: add `// skip-approved: <PR/issue URL>` on the line',
    allow: /\/\/\s*skip-approved:\s*https?:\/\/\S+/,
  },
  {
    scope: [...unitTests, ...pw],
    pattern: /\b(it|test)\(\s*['"`](?!should\b)/,
    message: 'test name must start with "should"',
  },
  { scope: pw, pattern: /waitForTimeout\(/, message: 'waitForTimeout — use an auto-retrying expect(locator)' },
  {
    scope: pw,
    pattern: /\.locator\(\s*['"`](?:[.#]|\/\/|xpath=)/,
    message: 'CSS/XPath locator — use getByRole/getByLabel/getByText/getByTestId',
  },
  { scope: pwE2e, pattern: /\b(page\.route|page\.unroute|mockApi)\b/, message: 'mocking in E2E — E2E hits the real backend' },
  { scope: pwE2e, pattern: /page\.clock\./, message: 'page.clock in E2E — wait for real responses instead' },
  {
    scope: [...pwUi, ...pwE2e],
    pattern: /toHaveScreenshot\(/,
    message: 'toHaveScreenshot outside tests/vrt/ — VRT specs live in tests/vrt/',
  },
  {
    scope: [...pwUi, ...pwVrt],
    pattern: /from\s+['"]@playwright\/test['"]/,
    message: "import test/expect from '../fixtures', not '@playwright/test'",
  },
]

const violations = []
for (const { scope, pattern, message, allow } of rules) {
  for (const file of scope) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((rawLine, i) => {
      const escape = allow ?? /\/\/\s*hygiene-ignore\b/
      if (escape.test(rawLine)) {
        return
      }
      const line = rawLine.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/.*$/, '')
      if (pattern.test(line)) {
        violations.push(`${relative(root, file)}:${i + 1}: ${message}`)
      }
    })
  }
}

if (violations.length > 0) {
  console.error('Test hygiene violations:\n' + violations.join('\n'))
  process.exit(1)
}
console.log(`test hygiene ok (${unitTests.length} unit, ${pw.length} playwright files)`)
