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

  test('should show join league option', async ({ page }) => {
    await page.goto('/leagues-home');
    
    // Look for join league option
    await expect(page.getByText(/join.*league/i)).toBeVisible();
  });

  test.describe('Create League Flow', () => {
    test('should open create league modal', async ({ page }) => {
      await page.goto('/leagues-home');
      
      // Click create league
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      // Modal should appear with league name input
      await expect(page.getByPlaceholder(/league name/i)).toBeVisible();
    });

    test('should show league name input in create modal', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      const nameInput = page.getByPlaceholder(/league name/i);
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeEnabled();
    });

    test('should show max members slider in create modal', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      // Should show max members configuration
      await expect(page.getByText(/max.*members/i)).toBeVisible();
    });

    test('should show icon selector in create modal', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      // Should show icon selection
      await expect(page.getByText(/icon/i)).toBeVisible();
    });

    test('should disable submit button when league name is empty', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      // Submit button should be disabled when name is empty
      const submitButton = page.getByRole('button', { name: /create league/i }).last();
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit button when league name is entered', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      // Enter a league name
      await page.getByPlaceholder(/league name/i).fill('Test League');
      
      // Submit button should now be enabled
      const submitButton = page.getByRole('button', { name: /create league/i }).last();
      await expect(submitButton).toBeEnabled();
    });

    test('should close modal when clicking outside or cancel', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      // Modal should be visible
      await expect(page.getByPlaceholder(/league name/i)).toBeVisible();
      
      // Press escape to close
      await page.keyboard.press('Escape');
      
      // Modal should be closed
      await expect(page.getByPlaceholder(/league name/i)).not.toBeVisible();
    });
  });

  test.describe('Join League Flow', () => {
    test('should open join league modal', async ({ page }) => {
      await page.goto('/leagues-home');
      
      // Click join league
      await page.getByText(/join.*league/i).click();
      
      // Modal should appear with join code input
      await expect(page.getByPlaceholder(/blitzburrito/i)).toBeVisible();
    });

    test('should show join code input field', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      
      const codeInput = page.getByPlaceholder(/blitzburrito/i);
      await expect(codeInput).toBeVisible();
      await expect(codeInput).toBeEnabled();
    });

    test('should show helper text about getting code from commissioner', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      
      await expect(page.getByText(/commissioner/i)).toBeVisible();
    });

    test('should disable continue button when code is empty', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeDisabled();
    });

    test('should enable continue button when code is entered', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      
      // Enter a join code
      await page.getByPlaceholder(/blitzburrito/i).fill('TestCode123');
      
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeEnabled();
    });

    test('should navigate to join page when submitting code', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      
      // Enter a join code
      await page.getByPlaceholder(/blitzburrito/i).fill('TestCode123');
      
      // Click continue
      await page.getByRole('button', { name: /continue/i }).click();
      
      // Should navigate to join page
      await page.waitForURL(/\/join\/TestCode123/i);
    });

    test('should close modal when pressing escape', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      
      // Modal should be visible
      await expect(page.getByPlaceholder(/blitzburrito/i)).toBeVisible();
      
      // Press escape to close
      await page.keyboard.press('Escape');
      
      // Modal should be closed
      await expect(page.getByPlaceholder(/blitzburrito/i)).not.toBeVisible();
    });
  });
});
