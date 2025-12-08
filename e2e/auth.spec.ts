import { test, expect } from '@playwright/test';

test.describe('Authentication UI', () => {
  test('should show sign in page for unauthenticated users', async ({ page }) => {
    await page.goto('/signin');
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should show test login option', async ({ page }) => {
    await page.goto('/signin');
    
    // Check for test account bypass option
    await expect(page.getByText(/test account/i)).toBeVisible();
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/picks');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/signin/);
  });

  test('should show logged out state on leagues home', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Logged out users should see the landing page with sign in CTA
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
