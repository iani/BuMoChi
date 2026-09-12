# Transport console — test plan

**App:** `http://localhost:5173` (Vite dev server; `/api/*` proxied to FastAPI on `:8000`).
**Seed:** `tests/ui/seed.spec.ts` (mocked `/api/health`, page loaded, heading visible).
**Starting state:** fresh page, transport `stopped`, BPM `120`, no audio context started.

Layers: `ui` = mocked backend (`mockApi`), `vrt` = screenshot of a mocked state,
`e2e` = real FastAPI, no mocks.

### 1. Health readout

#### 1.1 Health ok — `ui` → `tests/ui/health.spec.ts`

**Steps:**
1. Mock `GET /api/health` → `200 {"status":"ok","version":"1.2.3"}` before navigating.
2. Open `/`.

**Expected:** the `health` readout shows `API: ok`.

#### 1.2 Health unreachable — `ui` → `tests/ui/health.spec.ts`

**Steps:**
1. Mock `GET /api/health` → `500` before navigating.
2. Open `/`.

**Expected:** the `health` readout shows `API: unreachable`.

#### 1.3 Health from the real backend — `e2e` → `tests/e2e/health.spec.ts`

**Steps:**
1. Open `/` and wait for the real `GET /api/health` response.

**Expected:** the response is `200` with `status: "ok"`; the readout shows `API: ok`.

### 2. BPM control

#### 2.1 BPM is clamped to 20..300 — `ui` → `tests/ui/bpm.spec.ts`

**Steps:**
1. Fill the `bpm` input with `500`.
2. Fill the `bpm` input with `1`.

**Expected:** the value reads `300` after step 1 and `20` after step 2.

#### 2.2 BPM edits persist against the real stack — `e2e` → `tests/e2e/transport.spec.ts`

**Steps:**
1. Fill the `bpm` input with `140`.

**Expected:** the input keeps `140`.

### 3. Transport buttons

#### 3.1 Play then Stop — `ui` → `tests/ui/bpm.spec.ts`

**Steps:**
1. Click the `Play` button.
2. Click the `Stop` button.

**Expected:** the `transport` readout goes `stopped` → `playing` → `stopped`. Audio is stubbed
(`audioStub` fixture); no real `AudioContext` is created.

#### 3.2 Play with the real backend — `e2e` → `tests/e2e/transport.spec.ts`

**Steps:**
1. Wait for `API: ok`, click `Play`.

**Expected:** the `transport` readout shows `playing`.

### 4. Visual baseline

#### 4.1 Initial screen, light theme — `vrt` → `tests/vrt/initial-screen.spec.ts`

**Steps:**
1. Mock `/api/health` ok, open `/`, wait for `API: ok` and `document.fonts.ready`.

**Expected:** full-page screenshot matches `initial-screen.png` (zero-pixel threshold; baseline
generated in Docker via `npm run test:vrt:update`).

#### 4.2 Initial screen, dark theme — `vrt` → `tests/vrt/dark-theme.spec.ts`

**Steps:**
1. Same as 4.1 with `body.dark` applied before first paint.

**Expected:** screenshot matches `dark-theme.png`.

### Not covered yet (candidates for the next plan)

- Keyboard-only operation of Play/Stop (Tab + Enter) — `ui`.
- BPM change is applied to the audio engine (`setBpm` called) — unit test on `App`, not browser.
