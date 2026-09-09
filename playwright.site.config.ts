import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/site/browser', timeout: 90000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174', browserName: 'chromium', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run preview -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174', reuseExistingServer: false,
  },
});
