const fs = require('fs');
const { E2E_DATA_DIR } = require('./paths');

module.exports = async () => {
  fs.rmSync(E2E_DATA_DIR, { recursive: true, force: true });
};
