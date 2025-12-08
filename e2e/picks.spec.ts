import { test, expect } from '@playwright/test';

test.describe('Picks/Submissions', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account
    await page.goto('/signin');
    await page.getByText(/test account/i).click();
    await page.getByPlaceholder(/email/i).fill('test@emma.dev');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/(leagues-home|picks|profile-setup)/);
  });

  test('should load picks page', async ({ page }) => {
    await page.goto('/picks');
    
    // Should show picks/submissions content
    await expect(page.getByText(/pick|submission/i)).toBeVisible();
  });

  test('should show position slots (QB, RB, FLEX)', async ({ page }) => {
    await page.goto('/picks');
    
    // Should show position labels
    await expect(page.getByText(/QB/)).toBeVisible();
    await expect(page.getByText(/RB/)).toBeVisible();
    await expect(page.getByText(/FLEX/)).toBeVisible();
  });

  test('should show week selector', async ({ page }) => {
    await page.goto('/picks');
    
    // Should show week navigation or selector
    await expect(page.getByText(/week/i)).toBeVisible();
  });
});
