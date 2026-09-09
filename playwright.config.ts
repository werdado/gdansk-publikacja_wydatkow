import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './poc/tests/browser',
  timeout: 90000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', headless: true, screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview:poc -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 30000 },
});
