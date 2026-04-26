import { test, expect, Page } from '@playwright/test';

async function loginAsTeacher(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('you@school.com').fill('teacher@school.com');
  await page.getByPlaceholder('••••••••').fill('Admin@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

test.describe('Attendance page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto('/admin/attendance');
  });

  test('shows class selector and date picker', async ({ page }) => {
    await expect(page.getByText('Select class')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });

  test('shows prompt to select class before students appear', async ({ page }) => {
    await expect(page.getByText(/select a class/i)).toBeVisible();
  });

  test('shows Mark All Present/Absent buttons when class selected', async ({ page }) => {
    const classSelect = page.locator('select');
    const options = await classSelect.locator('option').count();

    if (options > 1) {
      await classSelect.selectOption({ index: 1 });
      // If students loaded, bulk-mark buttons appear
      const markPresent = page.getByRole('button', { name: /mark all present/i });
      await expect(markPresent).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });
});
