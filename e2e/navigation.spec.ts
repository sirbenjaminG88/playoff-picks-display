import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Should show EMMA branding in heading
    await expect(page.getByRole('heading', { name: /EMMA/i }).first()).toBeVisible();
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-12345');

    // Should show 404 heading
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('should redirect unauthenticated to signin from protected routes', async ({ page }) => {
    await page.goto('/picks');

    // Should redirect to signin
    await expect(page).toHaveURL(/signin/);
  });

  test('should show signin page', async ({ page }) => {
    await page.goto('/signin');

    // Check for EMMA heading and sign in text
    await expect(page.getByRole('heading', { name: /EMMA/i })).toBeVisible();
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible();
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible();
  });
});
