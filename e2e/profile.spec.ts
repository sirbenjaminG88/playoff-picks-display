import { test, expect } from '@playwright/test';

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account
    await page.goto('/signin');
    await page.getByText(/test account/i).click();
    await page.getByPlaceholder(/email/i).fill('test@emma.dev');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/(leagues-home|picks|profile-setup)/);
  });

  test('should navigate to profile page', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show profile content
    await expect(page.getByText(/profile/i)).toBeVisible();
  });

  test('should show display name field', async ({ page }) => {
    await page.goto('/profile');
    
    // Should have display name input
    await expect(page.getByLabel(/display name/i)).toBeVisible();
  });

  test('should show email field', async ({ page }) => {
    await page.goto('/profile');
    
    // Should show email
    await expect(page.getByText(/email/i)).toBeVisible();
  });

  test('should have back button that works', async ({ page }) => {
    await page.goto('/profile');
    
    // Click back button
    const backButton = page.getByRole('button').filter({ has: page.locator('svg') }).first();
    await backButton.click();
    
    // Should navigate to leagues home
    await expect(page).toHaveURL(/leagues-home/);
  });

  test('should show delete account option', async ({ page }) => {
    await page.goto('/profile');
    
    // Should have delete account section
    await expect(page.getByText(/delete.*account/i)).toBeVisible();
  });
});
