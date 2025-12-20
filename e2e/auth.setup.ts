import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Global auth setup that creates and logs in a test user.
 * This runs once before all tests and saves the auth state.
 */
setup('authenticate', async ({ page }) => {
  // Test user credentials
  const testEmail = 'e2e-test@emma.test';
  const testPassword = 'TestPassword123!';
  const testDisplayName = 'E2E Test User';

  console.log('Starting authentication setup...');

  // Go to sign in page
  await page.goto('/signin');

  // Try to sign in first (user might already exist)
  await page.getByPlaceholder(/you@example\.com/i).fill(testEmail);
  await page.getByPlaceholder(/Enter your password/i).first().fill(testPassword);
  await page.getByRole('button', { name: /^Sign in$/i }).click();

  // Wait a moment to see what happens
  await page.waitForTimeout(2000);

  const currentUrl = page.url();

  // If we're at profile setup, the user exists but needs profile
  if (currentUrl.includes('profile-setup')) {
    console.log('User exists but needs profile setup...');

    await page.getByPlaceholder(/Your display name/i).fill(testDisplayName);
    await page.getByRole('button', { name: /Continue/i }).click();

    // Wait for redirect after profile creation
    await page.waitForURL(/picks|\/(?!profile-setup)/, { timeout: 10000 });
    console.log('Profile created successfully');
  }
  // If we're still at signin, user doesn't exist - create account
  else if (currentUrl.includes('signin')) {
    console.log('User does not exist, creating new account...');

    // Switch to signup mode
    await page.getByRole('button', { name: /Sign up/i }).click();

    // Fill in signup form
    await page.getByPlaceholder(/you@example\.com/i).fill(testEmail);
    await page.getByPlaceholder(/Enter your password/i).fill(testPassword);
    await page.getByPlaceholder(/Confirm your password/i).fill(testPassword);

    // Submit signup
    await page.getByRole('button', { name: /Create account/i }).click();

    // Should redirect to profile setup
    await expect(page).toHaveURL(/profile-setup/, { timeout: 10000 });

    // Fill in profile
    await page.getByPlaceholder(/Your display name/i).fill(testDisplayName);
    await page.getByRole('button', { name: /Continue/i }).click();

    // Wait for redirect after profile creation
    await page.waitForURL(/picks|\/(?!profile-setup)/, { timeout: 10000 });
    console.log('Account created and profile set up successfully');
  } else {
    // Already logged in and has profile
    console.log('Already authenticated');
  }

  // Verify we're logged in by checking for user profile/avatar
  // The home page should NOT redirect to signin if we're logged in
  await page.goto('/');
  await page.waitForTimeout(2000);

  const finalUrl = page.url();
  if (finalUrl.includes('signin')) {
    throw new Error('Authentication setup failed - redirected to signin');
  }

  // Look for any sign of being logged in:
  // - User's first name in the UI
  // - Profile avatar
  // - Sign out button
  const firstName = testDisplayName.split(' ')[0];
  const isLoggedIn = await Promise.race([
    page.getByText(firstName, { exact: false }).isVisible({ timeout: 3000 }),
    page.getByRole('button', { name: /sign out/i }).isVisible({ timeout: 3000 }),
    page.locator('[alt*="avatar"]').isVisible({ timeout: 3000 }),
  ]).catch(() => false);

  if (!isLoggedIn) {
    console.log(`Warning: Could not verify login indicator, but not on signin page. Proceeding...`);
  } else {
    console.log('Authentication verified successfully!');
  }

  console.log('Authentication setup complete!');

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
