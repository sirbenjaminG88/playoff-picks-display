import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Should show EMMA branding
    await expect(page.getByText('EMMA')).toBeVisible();
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-12345');
    
    // Should show not found page
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });

  test('should redirect unauthenticated to signin from protected routes', async ({ page }) => {
    await page.goto('/picks');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/signin/);
  });

  test('should show signin page', async ({ page }) => {
    await page.goto('/signin');
    
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });
});
