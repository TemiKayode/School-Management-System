import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('School Management')).toBeVisible();
    await expect(page.getByPlaceholder('you@school.com')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation error for empty form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@school.com').fill('wrong@test.com');
    await page.getByPlaceholder('••••••••').fill('WrongPassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Toast should appear with error
    await expect(page.locator('[data-testid="toast"]').or(page.getByText(/login failed|invalid/i))).toBeVisible({ timeout: 5000 });
  });

  test('redirects to admin dashboard on successful admin login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@school.com').fill('admin@school.com');
    await page.getByPlaceholder('••••••••').fill('Admin@123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/admin\/dashboard/, { timeout: 8000 });
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    const input = page.getByPlaceholder('••••••••');
    await expect(input).toHaveAttribute('type', 'password');
    await page.locator('button[type="button"]').first().click();
    await expect(input).toHaveAttribute('type', 'text');
  });
});
