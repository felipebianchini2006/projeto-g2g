const path = require('path');
const { repoRoot, runCommand } = require('./test-utils.cjs');

const composeFile = path.join(repoRoot, 'docker-compose.test.yml');

try {
  runCommand('docker', ['compose', '-f', composeFile, 'down'], {
    cwd: repoRoot,
    env: process.env,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}