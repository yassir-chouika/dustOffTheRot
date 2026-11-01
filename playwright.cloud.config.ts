import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

for (const path of ['.env.local', '.env.e2e.local'])
  if (existsSync(path)) process.loadEnvFile(path);
export default defineConfig({
  testDir: './tests/cloud',
  outputDir: 'test-results-cloud',
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'off', screenshot: 'off', video: 'off' },
  webServer: {
    command: 'npm run dev -- --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
    env: { VITE_DEMO_MODE: 'false' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
});
