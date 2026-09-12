import { expect, test } from '../fixtures'

test.describe('transport (real backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('health')).toHaveText('API: ok')
  })

  test('should keep a BPM of 140', async ({ page }) => {
    // GIVEN
    const bpm = page.getByLabel('bpm')
    // WHEN
    await bpm.fill('140')
    // THEN
    await expect(bpm).toHaveValue('140')
  })

  test('should switch the transport to playing on Play', async ({ page }) => {
    // GIVEN
    await expect(page.getByTestId('transport')).toHaveText('Transport: stopped')
    // WHEN
    await page.getByRole('button', { name: 'Play' }).click()
    // THEN
    await expect(page.getByTestId('transport')).toHaveText('Transport: playing')
  })
})
