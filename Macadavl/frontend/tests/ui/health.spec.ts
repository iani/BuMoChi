import { expect, test } from '../fixtures'

test.describe('health badge', () => {
  test('should show API: ok when /api/health succeeds', async ({ page, mockApi }) => {
    // GIVEN
    await mockApi.health({ status: 'ok', version: '1.2.3' })
    // WHEN
    await page.goto('/')
    // THEN
    await expect(page.getByTestId('health')).toHaveText('API: ok')
  })

  test('should show API: unreachable when /api/health fails', async ({ page, mockApi }) => {
    // GIVEN
    await mockApi.health(undefined, 500)
    // WHEN
    await page.goto('/')
    // THEN
    await expect(page.getByTestId('health')).toHaveText('API: unreachable')
  })
})
