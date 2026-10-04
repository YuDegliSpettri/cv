const { defineConfig } = require('@playwright/test');
const port = Number(process.env.CV_TEST_PORT || 4173);

module.exports = defineConfig({
  testDir: './tests',
  testMatch: ['**/site.spec.cjs', '**/navigation.spec.cjs', '**/fonts.spec.cjs', '**/security.spec.cjs'],
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  retries: 0,
  timeout: 30000,
  expect: { timeout: 5000 },
  outputDir: process.env.CV_TEST_OUTPUT_DIR || 'test-results/artifacts',
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}/cv/`,
    viewport: { width: 1440, height: 900 },
    // Playwright 1.62.1 does not forward use.reducedMotion to its page fixture.
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
    { name: 'chromium-fallback', testIgnore: ['**/fonts.spec.cjs', '**/security.spec.cjs'], use: { browserName: 'chromium', fontMode: 'fallback' } },
    { name: 'webkit-fallback', testIgnore: ['**/fonts.spec.cjs', '**/security.spec.cjs'], use: { browserName: 'webkit', fontMode: 'fallback' } }
  ],
  webServer: {
    command: 'node scripts/serve.cjs',
    url: `http://127.0.0.1:${port}/cv/`,
    reuseExistingServer: false,
    timeout: 10000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 1000 }
  }
});
