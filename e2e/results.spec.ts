import { test, expect } from '@playwright/test';

test.describe('Results', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account
    await page.goto('/signin');
    await page.getByText(/test account/i).click();
    await page.getByPlaceholder(/email/i).fill('test@emma.dev');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await page.waitForURL(/\/(leagues-home|picks|profile-setup)/);
  });

  test('should load results page', async ({ page }) => {
    await page.goto('/results');
    
    // Should show results content
    await expect(page.getByText(/result|standing|leaderboard/i)).toBeVisible();
  });

  test('should show week selector on results', async ({ page }) => {
    await page.goto('/results');
    
    // Should show week navigation
    await expect(page.getByText(/week/i)).toBeVisible();
  });

  test('should display leaderboard section', async ({ page }) => {
    await page.goto('/results');
    
    // Should show leaderboard or standings
    await expect(page.getByText(/leaderboard|standing|rank/i)).toBeVisible();
  });
});
