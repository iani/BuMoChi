import { expect, test } from '../fixtures'

test.describe('health (real backend)', () => {
  test('should show API: ok from the real /api/health response', async ({ page }) => {
    // GIVEN
    const health = page.waitForResponse((r) => r.url().includes('/api/health'))
    // WHEN
    await page.goto('/')
    const response = await health
    // THEN
    expect(response.status()).toBe(200)
    await expect(page.getByTestId('health')).toHaveText('API: ok')
  })
})
