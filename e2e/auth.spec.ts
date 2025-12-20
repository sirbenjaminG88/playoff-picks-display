import { test, expect } from '@playwright/test';

test.describe('Authentication UI', () => {
  test('should show sign in page for unauthenticated users', async ({ page }) => {
    await page.goto('/signin');

    // Check for EMMA heading
    await expect(page.getByRole('heading', { name: /EMMA/i })).toBeVisible();
    // Check for sign in description text
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible();
    // Check for email input
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible();
  });

  test('should show sign up option', async ({ page }) => {
    await page.goto('/signin');

    // Should show link to switch to sign up
    await expect(page.getByText(/Don't have an account/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign up/i })).toBeVisible();
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/picks');

    // Should redirect to signin
    await expect(page).toHaveURL(/signin/);
  });

  test('should show logged out state on home page', async ({ page }) => {
    await page.goto('/');

    // Logged out users should see the landing page with sign in CTA
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
