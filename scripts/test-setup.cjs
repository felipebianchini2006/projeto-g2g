const path = require('path');
const { spawnSync } = require('child_process');
const { repoRoot, loadEnvFile, runCommand, sleep } = require('./test-utils.cjs');

const composeFile = path.join(repoRoot, 'docker-compose.test.yml');

loadEnvFile(path.join(repoRoot, 'apps', 'api', '.env.test'));
loadEnvFile(path.join(repoRoot, 'apps', 'web', '.env.test'));
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const getHealthStatus = (containerName) => {
  const result = spawnSync(
    'docker',
    ['inspect', '-f', '{{.State.Health.Status}}', containerName],
    { encoding: 'utf8', shell: true },
  );
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
};

const waitForHealth = async (containerName, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = getHealthStatus(containerName);
    if (status === 'healthy') {
      return;
    }
    if (status === 'unhealthy') {
      throw new Error(`Container ${containerName} is unhealthy.`);
    }
    await sleep(1000);
  }
  throw new Error(`Timeout waiting for ${containerName} to become healthy.`);
};

(async () => {
  runCommand('docker', ['compose', '-f', composeFile, 'up', '-d'], {
    cwd: repoRoot,
    env: process.env,
  });

  await waitForHealth('projeto-g2g-postgres-test', 60000);
  await waitForHealth('projeto-g2g-redis-test', 30000);

  runCommand('npm', ['run', 'prisma:migrate:deploy', '-w', 'apps/api'], {
    cwd: repoRoot,
    env: process.env,
  });

  runCommand('npm', ['run', 'prisma:seed', '-w', 'apps/api'], {
    cwd: repoRoot,
    env: process.env,
  });
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});