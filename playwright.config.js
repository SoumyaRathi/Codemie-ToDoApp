const { defineConfig, devices } = require('@playwright/test');
const { E2E_DATA_DIR, E2E_PORT, resetStore } = require('./test/helpers/store');

resetStore(E2E_DATA_DIR);

module.exports = defineConfig({
  testDir: './test/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-results.json' }]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node todoServer.js',
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
    env: { PORT: String(E2E_PORT), TODO_DATA_DIR: E2E_DATA_DIR },
  },
});
