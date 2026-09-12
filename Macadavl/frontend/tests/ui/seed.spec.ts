import { expect, test } from '../fixtures'

// Playwright agents seed: the planner/generator start from this trivial test.
test('should render the workbench heading', async ({ page, mockApi }) => {
  // GIVEN
  await mockApi.health()
  // WHEN
  await page.goto('/')
  // THEN
  await expect(page.getByRole('heading', { name: 'Audio Workbench' })).toBeVisible()
})
