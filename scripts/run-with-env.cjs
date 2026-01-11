const path = require('path');
const { repoRoot, loadEnvFile, runCommand } = require('./test-utils.cjs');

const args = process.argv.slice(2);
if (args[0] === '--') {
  args.shift();
}

if (args.length === 0) {
  console.error('Missing command to execute.');
  process.exit(1);
}

loadEnvFile(path.join(repoRoot, 'apps', 'api', '.env.test'));
loadEnvFile(path.join(repoRoot, 'apps', 'web', '.env.test'));
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const [command, ...commandArgs] = args;
runCommand(command, commandArgs, { cwd: repoRoot, env: process.env });