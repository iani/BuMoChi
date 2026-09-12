import { expect, test } from '../fixtures'

test('should match the committed idle dance-stage baseline', async ({ page, mockApi }) => {
  // GIVEN
  await mockApi.blockRest()
  // WHEN
  await page.goto('/#/dance')
  await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-state', 'idle')
  await page.evaluate(() => document.fonts.ready)
  // THEN
  await expect(page).toHaveScreenshot('dance-stage.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    stylePath: './tests/vrt/screenshot.css',
  })
})

test('should match the committed phone-width dance-stage baseline', async ({ page, mockApi }) => {
  // GIVEN
  await mockApi.blockRest()
  await page.setViewportSize({ width: 400, height: 800 })
  // WHEN
  await page.goto('/#/dance')
  await expect(page.getByTestId('pipeline-status')).toHaveAttribute('data-state', 'idle')
  await page.evaluate(() => document.fonts.ready)
  // THEN
  await expect(page).toHaveScreenshot('dance-stage-phone.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    stylePath: './tests/vrt/screenshot.css',
  })
})
