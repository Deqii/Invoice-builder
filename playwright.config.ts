import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  updateSnapshots: 'none',
  snapshotPathTemplate: 'docs/design/baselines/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: {
      threshold: 0,
      maxDiffPixels: 0,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
