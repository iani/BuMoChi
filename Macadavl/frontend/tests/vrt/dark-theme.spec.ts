import { expect, test } from '../fixtures'

test('should match the committed dark-theme baseline', async ({ page, mockApi }) => {
  // GIVEN
  await mockApi.health()
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => document.body.classList.add('dark'))
  })
  // WHEN
  await page.goto('/')
  await expect(page.getByTestId('health')).toHaveText('API: ok')
  await page.evaluate(() => document.fonts.ready)
  // THEN
  await expect(page).toHaveScreenshot('dark-theme.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    stylePath: './tests/vrt/screenshot.css',
  })
})
