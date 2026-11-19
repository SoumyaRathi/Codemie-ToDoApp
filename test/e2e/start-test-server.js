const fs = require('fs');
const path = require('path');

const port = Number(process.env.E2E_PORT || 3101);
const dataDir = process.env.TODO_DATA_DIR;
if (!dataDir) throw new Error('TODO_DATA_DIR must be set for the E2E server');

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'todos.json'), '[]');
fs.writeFileSync(path.join(dataDir, 'users.json'), '[]');
fs.writeFileSync(path.join(dataDir, 'sessions.json'), '{}');

const app = require('../../todoServer');
app.listen(port, () => console.log(`E2E server listening on http://localhost:${port}`));
