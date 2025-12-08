import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
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

  test('should allow test account login', async ({ page }) => {
    await page.goto('/signin');
    
    // Click to show test login
    await page.getByText(/test account/i).click();
    
    // Fill test credentials
    await page.getByPlaceholder(/email/i).fill('test@emma.dev');
    await page.getByPlaceholder(/password/i).fill('testpass123');
    
    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect away from signin
    await expect(page).not.toHaveURL('/signin');
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    await page.goto('/picks');
    
    // Should redirect to signin
    await expect(page).toHaveURL(/signin/);
  });

  test('should redirect unauthenticated users from leagues home', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Logged out users should see the landing page with sign in CTA
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
