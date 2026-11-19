const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3100;
const dataDir = path.join(os.tmpdir(), 'todoapp-qa-e2e');
fs.mkdirSync(dataDir, { recursive: true });

module.exports = defineConfig({
  testDir: './e2e',
  outputDir: './.artifacts/output',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: './.artifacts/results.json' }]],
  globalTeardown: require.resolve('./e2e/global-teardown.js'),
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node todoServer.js',
    cwd: path.join(__dirname, '..'),
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      PORT: String(PORT),
      TODOS_FILE: path.join(dataDir, 'todos.json'),
      USERS_FILE: path.join(dataDir, 'users.json'),
      SESSIONS_FILE: path.join(dataDir, 'sessions.json')
    }
  }
});
