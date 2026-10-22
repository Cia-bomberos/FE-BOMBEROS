import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests_e2e/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,       // los tests comparten usuario; evita carreras
  workers: process.env.CI ? 4 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://qa-bomberos.ingsoftware.lat',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});