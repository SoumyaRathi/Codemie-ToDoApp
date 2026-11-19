const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async () => {
  fs.rmSync(path.join(os.tmpdir(), 'todoapp-qa-e2e'), { recursive: true, force: true });
};
