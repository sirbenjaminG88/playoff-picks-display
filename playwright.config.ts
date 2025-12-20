import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    // Setup project - runs first to create authenticated user
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // Tests that require authentication
    {
      name: 'chromium-authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /user-journeys\.spec\.ts/,
    },

    // Tests that should run unauthenticated (auth & navigation tests)
    {
      name: 'chromium-unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /(auth|navigation)\.spec\.ts/,
    },

    // Mobile tests - authenticated
    {
      name: 'mobile-authenticated',
      use: {
        ...devices['iPhone 13'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /user-journeys\.spec\.ts/,
    },

    // Mobile tests - unauthenticated
    {
      name: 'mobile-unauthenticated',
      use: { ...devices['iPhone 13'] },
      testMatch: /(auth|navigation)\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
