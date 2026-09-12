import { expect, test } from '../fixtures'

test('should match the committed initial-screen baseline', async ({ page, mockApi }) => {
  // GIVEN
  await mockApi.health()
  // WHEN
  await page.goto('/')
  await expect(page.getByTestId('health')).toHaveText('API: ok')
  await page.evaluate(() => document.fonts.ready)
  // THEN
  await expect(page).toHaveScreenshot('initial-screen.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    stylePath: './tests/vrt/screenshot.css',
  })
})
