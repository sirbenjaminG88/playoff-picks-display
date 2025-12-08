import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Should show EMMA branding
    await expect(page.getByText('EMMA')).toBeVisible();
  });

  test('should navigate to leagues home', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Should show the leagues home content
    await expect(page.getByText(/EMMA/i)).toBeVisible();
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-12345');
    
    // Should show not found page
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });

  test('should have working bottom navigation when authenticated', async ({ page }) => {
    // First login with test account
    await page.goto('/signin');
    await page.getByText(/test account/i).click();
    await page.getByPlaceholder(/email/i).fill('test@emma.dev');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation
    await page.waitForURL(/\/(leagues-home|picks|profile-setup)/);
    
    // Check bottom nav exists (if on authenticated route)
    const bottomNav = page.locator('nav').filter({ has: page.getByRole('link') });
    await expect(bottomNav).toBeVisible();
  });
});
