import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:3000';
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Auth setup projects
    {
      name: 'setup-admin',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-seller',
      testMatch: /seller\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-user',
      testMatch: /user\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Main test projects
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup-admin', 'setup-seller', 'setup-user'],
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup-admin', 'setup-seller', 'setup-user'],
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup-admin', 'setup-seller', 'setup-user'],
    },
  ],
});
