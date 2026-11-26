const { defineConfig, devices } = require('@playwright/test');
const { E2E_PORT, E2E_DATA_DIR, E2E_OUTPUT_DIR } = require('./test/e2e/paths');

const baseURL = `http://localhost:${E2E_PORT}`;

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['test/e2e/**/*.spec.js', 'qa/e2e/**/*.spec.js'],
  outputDir: E2E_OUTPUT_DIR,
  globalTeardown: require.resolve('./test/e2e/global-teardown.js'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node test/e2e/start-test-server.js',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30000,
    env: { E2E_PORT: String(E2E_PORT), TODO_DATA_DIR: E2E_DATA_DIR }
  }
});
