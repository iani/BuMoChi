import { expect, test } from '../fixtures'

test.describe('Dance Stage', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.blockRest()
    await page.goto('/#/dance')
  })

  test('should be reachable from the workbench link', async ({ page, mockApi }) => {
    // GIVEN
    await mockApi.health()
    await page.goto('/')
    // WHEN
    await page.getByRole('link', { name: 'Open the Dance Stage →' }).click()
    // THEN
    await expect(page.getByRole('heading', { name: 'Dance Stage' })).toBeVisible()
  })

  test("should link to the dancer's guide", async ({ page }) => {
    // GIVEN the stage is open (beforeEach)
    // WHEN
    const link = page.getByRole('link', { name: /Dancer's guide/ })
    // THEN
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', /docs\/DANCER-GUIDE\.md$/)
  })

  test('should fit a phone-width viewport without horizontal overflow', async ({ page }) => {
    // GIVEN
    await page.setViewportSize({ width: 400, height: 800 })
    await page.getByRole('combobox', { name: 'source' }).selectOption('camera')
    await expect(page.getByRole('combobox', { name: 'camera' })).toBeVisible()
    // WHEN
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }))
    // THEN
    expect(widths.scroll).toBeLessThanOrEqual(widths.viewport)
    const guide = page.getByRole('link', { name: /Dancer's guide/ })
    await guide.scrollIntoViewIfNeeded()
    await expect(guide).toBeInViewport({ ratio: 1 })
  })

  test('should run the fixture through pose → features → mapping and count frames', async ({ page }) => {
    // GIVEN
    await page.getByRole('combobox', { name: 'source' }).selectOption('fixture:hiphop-whip')
    const status = page.getByTestId('pipeline-status')
    await expect(status).toHaveAttribute('data-state', 'idle')
    // WHEN
    await page.getByRole('button', { name: 'Start' }).click()
    // THEN
    await expect(status).toHaveAttribute('data-state', 'running')
    await expect(page.getByTestId('features')).toHaveAttribute('data-present', 'true')
    await expect(page.getByTestId('frame-count')).not.toHaveText('0 frames')
    await expect(page.getByTestId('frame-count')).not.toHaveText('1 frames')
    await expect(page.getByTestId('control-readout')).toContainText(/intensity 0\.\d\d/)
    await expect(page.getByTestId('feature-energy')).not.toHaveText('0.00')
    await expect(page.getByRole('button', { name: 'Record' })).toBeEnabled()
  })

  test('should offer front and back camera only for the camera source', async ({ page }) => {
    // GIVEN
    const camera = page.getByRole('combobox', { name: 'camera' })
    await expect(camera).toBeHidden()
    // WHEN
    await page.getByRole('combobox', { name: 'source' }).selectOption('camera')
    await camera.selectOption('facing:environment')
    // THEN
    await expect(camera).toHaveValue('facing:environment')
    await expect(camera.getByRole('option')).toHaveText(['Front camera', 'Back / main camera'])
  })

  test('should offer the baseline plus the five researched mappings', async ({ page }) => {
    // GIVEN
    const mapping = page.getByRole('combobox', { name: 'mapping' })
    // WHEN / THEN
    await expect(mapping).toHaveValue('direct-v0')
    await expect(mapping.getByRole('option')).toHaveText([
      'Direct (placeholder)',
      'Kinesphere · your use of space',
      'Own Pulse · beat from your swing',
      'Effort Voice · Laban qualities',
      'Mood Rooms · arousal × valence scenes',
      'Signature · you vs. your own norm',
    ])
  })

  test('should switch mappings while the pipeline keeps running', async ({ page }) => {
    // GIVEN
    await page.getByRole('combobox', { name: 'source' }).selectOption('fixture:hiphop-whip')
    await page.getByRole('button', { name: 'Start' }).click()
    const status = page.getByTestId('pipeline-status')
    await expect(status).toHaveAttribute('data-state', 'running')
    const framesBefore = await page.getByTestId('frame-count').textContent()
    // WHEN
    const mapping = page.getByRole('combobox', { name: 'mapping' })
    await mapping.selectOption('own-pulse')
    // THEN
    await expect(mapping).toHaveValue('own-pulse')
    await expect(page.getByText(/^Mapping:/)).toContainText('The period of your hand swing becomes the tempo')
    await expect(status).toHaveAttribute('data-state', 'running')
    await expect(page.getByTestId('frame-count')).not.toHaveText(framesBefore ?? '')
    await expect(page.getByTestId('control-readout')).toContainText(/intensity 0\.\d\d/)
  })

  test('should show the bridge hint only when the SuperCollider engine is picked', async ({ page }) => {
    // GIVEN
    const engine = page.getByRole('combobox', { name: 'engine' })
    const hint = page.getByText('Run tools/sc-bridge and SuperCollider first — see docs/SUPERCOLLIDER.md')
    await expect(engine).toHaveValue('tone')
    await expect(engine.getByRole('option')).toHaveText([
      'Tone.js (built-in)',
      'SuperCollider (local OSC bridge)',
    ])
    await expect(hint).toBeHidden()
    // WHEN
    await engine.selectOption('osc')
    // THEN
    await expect(hint).toBeVisible()
  })

  test('should end in the error state with an alert when no bridge is reachable', async ({ page }) => {
    // GIVEN no bridge listens on ws://localhost:57130 in the test environment
    await page.getByRole('combobox', { name: 'source' }).selectOption('fixture:hiphop-whip')
    await page.getByRole('combobox', { name: 'engine' }).selectOption('osc')
    // WHEN
    await page.getByRole('button', { name: 'Start' }).click()
    // THEN
    await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-state', 'error')
    await expect(page.getByRole('alert')).toContainText(/SuperCollider bridge.*tools\/sc-bridge/)
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  test('should stop the pipeline and re-enable Start', async ({ page }) => {
    // GIVEN
    await page.getByRole('combobox', { name: 'source' }).selectOption('fixture:hiphop-whip')
    await page.getByRole('button', { name: 'Start' }).click()
    await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-state', 'running')
    // WHEN
    await page.getByRole('button', { name: 'Stop' }).click()
    // THEN
    await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-state', 'ended')
    await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  test.describe('two dancers', () => {
    test('should run the deterministic duet fixture with a mapping per dancer and fill both readouts', async ({
      page,
    }) => {
      // GIVEN
      await page.getByRole('combobox', { name: 'source' }).selectOption('fixture:hiphop-whip')
      await page.getByRole('combobox', { name: 'dancers' }).selectOption('duet')
      await page.getByRole('combobox', { name: 'mapping B' }).selectOption('kinesphere')
      const status = page.getByTestId('pipeline-status')
      // WHEN
      await page.getByRole('button', { name: 'Start' }).click()
      // THEN
      await expect(status).toHaveAttribute('data-state', 'running')
      await expect(page.getByRole('combobox', { name: 'dancers' })).toBeDisabled()
      const a = page.getByRole('region', { name: 'Dancer A' })
      const b = page.getByRole('region', { name: 'Dancer B' })
      await expect(a.getByTestId('features')).toHaveAttribute('data-present', 'true')
      await expect(b.getByTestId('features-b')).toHaveAttribute('data-present', 'true')
      await expect(a.getByTestId('control-readout')).toContainText(/intensity 0\.\d\d/)
      await expect(b.getByTestId('control-readout-b')).toContainText(/intensity 0\.\d\d/)
      await expect(b.getByText(/^Mapping:/)).toContainText('pans the sound')
      await expect(page.getByTestId('frame-count')).not.toHaveText(/^[01] frames$/)
    })

    test('should switch dancer B alone while the duet keeps running', async ({ page }) => {
      // GIVEN
      await page.getByRole('combobox', { name: 'source' }).selectOption('fixture:belly-dance')
      await page.getByRole('combobox', { name: 'dancers' }).selectOption('duet')
      await page.getByRole('button', { name: 'Start' }).click()
      const status = page.getByTestId('pipeline-status')
      await expect(status).toHaveAttribute('data-state', 'running')
      // WHEN
      await page.getByRole('combobox', { name: 'mapping B' }).selectOption('signature')
      // THEN
      await expect(page.getByRole('combobox', { name: 'mapping', exact: true })).toHaveValue('direct-v0')
      await expect(page.getByRole('combobox', { name: 'mapping B' })).toHaveValue('signature')
      await expect(status).toHaveAttribute('data-state', 'running')
      await expect(page.getByRole('region', { name: 'Dancer B' }).getByTestId('control-readout-b')).toContainText(
        /intensity 0\.\d\d/,
      )
    })
  })
})
