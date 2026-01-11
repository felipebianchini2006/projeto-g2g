const { execSync } = require('child_process');
const path = require('path');
const { applyTestEnv } = require('./test-env.cjs');

module.exports = async () => {
  applyTestEnv();
  const apiRoot = path.resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });
};
