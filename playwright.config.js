const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  expect: {
    timeout: 10000,
  },
  use: {
    browserName: 'chromium',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: 'npm run start:backend',
          url: 'http://localhost:3030',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
        {
          command: 'npm run start:frontend',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ],
});
