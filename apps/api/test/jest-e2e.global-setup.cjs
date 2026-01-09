const { execSync } = require('child_process');
const path = require('path');

const ensureEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
  process.env.TOKEN_TTL = process.env.TOKEN_TTL ?? '900';
  process.env.REFRESH_TTL = process.env.REFRESH_TTL ?? '3600';
  process.env.DATABASE_URL =
    process.env.E2E_DATABASE_URL ??
    'postgresql://postgres:123456@localhost:5433/projeto_g2g_test';
  process.env.REDIS_URL = process.env.E2E_REDIS_URL ?? 'redis://localhost:6380';
};

module.exports = async () => {
  ensureEnv();
  const apiRoot = path.resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });
};
