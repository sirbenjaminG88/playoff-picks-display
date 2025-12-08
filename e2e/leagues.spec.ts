import { test, expect } from '@playwright/test';

test.describe('Leagues', () => {
  test.beforeEach(async ({ page }) => {
    // Login with test account before each test
    await page.goto('/signin');
    await page.getByText(/test account/i).click();
    await page.getByPlaceholder(/email/i).fill('test@emma.dev');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect
    await page.waitForURL(/\/(leagues-home|picks|profile-setup)/);
  });

  test('should show leagues home after login', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Should show league-related content
    await expect(page.getByText(/league/i)).toBeVisible();
  });

  test('should show create league button for authenticated users', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Look for create league CTA
    const createButton = page.getByRole('button', { name: /create.*league/i });
    await expect(createButton).toBeVisible();
  });

  test('should open create league modal', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Click create league
    await page.getByRole('button', { name: /create.*league/i }).click();
    
    // Modal should appear with league name input
    await expect(page.getByPlaceholder(/league name/i)).toBeVisible();
  });

  test('should show join league option', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Look for join league option
    await expect(page.getByText(/join.*league/i)).toBeVisible();
  });
});
