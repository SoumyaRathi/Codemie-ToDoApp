const os = require('os');
const path = require('path');

const E2E_PORT = Number(process.env.E2E_PORT || 3101);

module.exports = {
  E2E_PORT,
  E2E_DATA_DIR: path.join(os.tmpdir(), `todoapp-e2e-data-${E2E_PORT}`),
  E2E_OUTPUT_DIR: path.join(os.tmpdir(), `todoapp-e2e-output-${E2E_PORT}`)
};
