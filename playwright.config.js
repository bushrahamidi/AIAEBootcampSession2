const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    browserName: 'chromium',
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    headless: true,
  },
});
