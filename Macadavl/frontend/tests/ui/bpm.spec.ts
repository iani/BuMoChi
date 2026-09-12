import { expect, test } from '../fixtures'

test.describe('BPM and transport controls', () => {
  test.beforeEach(async ({ page, mockApi }) => {
    await mockApi.health()
    await page.goto('/')
  })

  test('should clamp BPM to the 20..300 range', async ({ page }) => {
    // GIVEN
    const bpm = page.getByLabel('bpm')
    // WHEN / THEN
    await bpm.fill('500')
    await expect(bpm).toHaveValue('300')
    await bpm.fill('1')
    await expect(bpm).toHaveValue('20')
  })

  test('should toggle the transport with Play and Stop', async ({ page }) => {
    // GIVEN
    const transport = page.getByTestId('transport')
    await expect(transport).toHaveText('Transport: stopped')
    // WHEN / THEN
    await page.getByRole('button', { name: 'Play' }).click()
    await expect(transport).toHaveText('Transport: playing')
    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(transport).toHaveText('Transport: stopped')
  })
})
