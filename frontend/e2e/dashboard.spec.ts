import { test, expect, Page } from '@playwright/test';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('you@school.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@school.com', 'Admin@123');
  });

  test('shows stat cards', async ({ page }) => {
    await expect(page.getByText('Total Students')).toBeVisible();
    await expect(page.getByText('Total Teachers')).toBeVisible();
    await expect(page.getByText('Present Today')).toBeVisible();
    await expect(page.getByText('Pending Fees')).toBeVisible();
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByText('Students')).toBeVisible();
    await expect(page.getByText('Teachers')).toBeVisible();
    await expect(page.getByText('Attendance')).toBeVisible();
  });

  test('can navigate to students page', async ({ page }) => {
    await page.getByText('Students').first().click();
    await expect(page).toHaveURL(/students/);
    await expect(page.getByPlaceholder(/search students/i)).toBeVisible();
  });
});

test.describe('Teacher Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'teacher@school.com', 'Admin@123');
  });

  test('shows teacher-specific content', async ({ page }) => {
    await expect(page.getByText('Teacher Dashboard')).toBeVisible();
    await expect(page.getByText('My Classes')).toBeVisible();
  });
});

test.describe('Student Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'student@school.com', 'Admin@123');
  });

  test('shows student-specific content', async ({ page }) => {
    await expect(page.getByText('My Dashboard')).toBeVisible();
    await expect(page.getByText('Pending Tasks')).toBeVisible();
  });

  test('cannot access admin-only routes', async ({ page }) => {
    await page.goto('/admin/teachers');
    // Should be redirected away
    await expect(page).not.toHaveURL(/admin\/teachers/);
  });
});
