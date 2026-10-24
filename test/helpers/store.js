const fs = require('fs');
const path = require('path');

const E2E_PORT = 3100;
const E2E_DATA_DIR = path.join(__dirname, '..', '.tmp', 'e2e-data');

function resetStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'todos.json'), '[]');
  fs.writeFileSync(path.join(dir, 'users.json'), '[]');
  fs.writeFileSync(path.join(dir, 'sessions.json'), '{}');
}

module.exports = { E2E_PORT, E2E_DATA_DIR, resetStore };
