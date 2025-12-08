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
    await expect(page.getByText(/league/i)).toBeVisible();
  });

  test('should show create league button for authenticated users', async ({ page }) => {
    await page.goto('/leagues-home');
    const createButton = page.getByRole('button', { name: /create.*league/i });
    await expect(createButton).toBeVisible();
  });

  test('should show join league option', async ({ page }) => {
    await page.goto('/leagues-home');
    await expect(page.getByText(/join.*league/i)).toBeVisible();
  });

  test.describe('Create League Flow', () => {
    test('should open create league modal', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      await expect(page.getByPlaceholder(/league name/i)).toBeVisible();
    });

    test('should disable submit when league name is empty', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      const submitButton = page.getByRole('button', { name: /create league/i }).last();
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submit when league name is entered', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      await page.getByPlaceholder(/league name/i).fill('Test League');
      const submitButton = page.getByRole('button', { name: /create league/i }).last();
      await expect(submitButton).toBeEnabled();
    });

    test('should create league and show success with join code', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      const leagueName = `Test League ${Date.now()}`;
      await page.getByPlaceholder(/league name/i).fill(leagueName);
      await page.getByRole('button', { name: /create league/i }).last().click();
      
      await expect(page.getByText(/league created/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/join code/i)).toBeVisible();
    });

    test('should show copy button after creation', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      await page.getByPlaceholder(/league name/i).fill(`Share Test ${Date.now()}`);
      await page.getByRole('button', { name: /create league/i }).last().click();
      
      await expect(page.getByText(/league created/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /copy/i })).toBeVisible();
    });
  });

  test.describe('Join League Flow', () => {
    test('should open join league modal', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      await expect(page.getByPlaceholder(/blitzburrito/i)).toBeVisible();
    });

    test('should disable continue when code is empty', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeDisabled();
    });

    test('should enable continue when code is entered', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      await page.getByPlaceholder(/blitzburrito/i).fill('TestCode123');
      const continueButton = page.getByRole('button', { name: /continue/i });
      await expect(continueButton).toBeEnabled();
    });

    test('should navigate to join page with code', async ({ page }) => {
      await page.goto('/leagues-home');
      await page.getByText(/join.*league/i).click();
      await page.getByPlaceholder(/blitzburrito/i).fill('TestCode123');
      await page.getByRole('button', { name: /continue/i }).click();
      await page.waitForURL(/\/join\/TestCode123/i);
    });

    test('should show error for invalid code', async ({ page }) => {
      await page.goto('/join/InvalidCode12345');
      await expect(page.getByText(/not found|no league|invalid/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Full Create and Join Flow', () => {
    test('should create league then join with the generated code', async ({ page, context }) => {
      await page.goto('/leagues-home');
      await page.getByRole('button', { name: /create.*league/i }).click();
      
      const leagueName = `E2E Test League ${Date.now()}`;
      await page.getByPlaceholder(/league name/i).fill(leagueName);
      await page.getByRole('button', { name: /create league/i }).last().click();
      
      await expect(page.getByText(/league created/i)).toBeVisible({ timeout: 10000 });
      
      const joinCodeLocator = page.locator('[class*="font-mono"], [class*="text-2xl"]').first();
      const joinCode = await joinCodeLocator.textContent();
      
      expect(joinCode).toBeTruthy();
      expect(joinCode!.length).toBeGreaterThan(5);
      
      const joinPage = await context.newPage();
      await joinPage.goto('/signin');
      await joinPage.getByText(/test account/i).click();
      await joinPage.getByPlaceholder(/email/i).fill('test2@emma.dev');
      await joinPage.getByPlaceholder(/password/i).fill('testpass123');
      await joinPage.getByRole('button', { name: /sign in/i }).click();
      await joinPage.waitForURL(/\/(leagues-home|picks|profile-setup)/);
      
      await joinPage.goto(`/join/${joinCode!.trim()}`);
      
      await expect(joinPage.getByText(leagueName)).toBeVisible({ timeout: 10000 });
      await expect(joinPage.getByRole('button', { name: /join.*league/i })).toBeVisible();
    });
  });
});
