const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const { repoRoot, loadEnvFile, runCommand, sleep } = require('./test-utils.cjs');

loadEnvFile(path.join(repoRoot, 'apps', 'api', '.env.test'));
loadEnvFile(path.join(repoRoot, 'apps', 'web', '.env.test'));

const isWindows = process.platform === 'win32';
const npmCmd = 'npm';
const apiUrl = process.env.E2E_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const webUrl = process.env.E2E_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const requestOnce = (url) =>
  new Promise((resolve, reject) => {
    const target = new URL(url);
    const handler = target.protocol === 'https:' ? https : http;
    const req = handler.get(target, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error('timeout'));
    });
  });

const waitForUrl = async (url, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await requestOnce(url);
      if (status > 0 && status < 500) {
        return;
      }
    } catch {
      // ignore
    }
    await sleep(500);
  }
  throw new Error(`Timeout waiting for ${url}`);
};

const killProcessTree = (pid) => {
  if (!pid) {
    return;
  }
  if (process.platform === 'win32') {
    runCommand('taskkill', ['/PID', String(pid), '/T', '/F']);
    return;
  }
  process.kill(pid, 'SIGTERM');
};

const prepareDatabase = () => {
  runCommand(npmCmd, ['run', 'prisma:migrate:deploy', '-w', 'apps/api'], {
    cwd: repoRoot,
    env: process.env,
  });
  runCommand(npmCmd, ['run', 'prisma:seed', '-w', 'apps/api'], {
    cwd: repoRoot,
    env: process.env,
  });
};

const apiEnv = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: process.env.API_PORT ?? process.env.PORT ?? '3001',
};
const webEnv = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: process.env.WEB_PORT ?? '3000',
};

const spawnNpm = (args, env) => {
  if (isWindows) {
    return spawn('cmd.exe', ['/d', '/s', '/c', npmCmd, ...args], {
      cwd: repoRoot,
      env,
      stdio: 'inherit',
    });
  }
  return spawn(npmCmd, args, { cwd: repoRoot, env, stdio: 'inherit' });
};

prepareDatabase();

const apiProcess = spawnNpm(['run', 'start:dev', '-w', 'apps/api'], apiEnv);

const webProcess = spawnNpm(['run', 'dev', '-w', 'apps/web'], webEnv);

let exitCode = 0;

const cleanup = () => {
  try {
    killProcessTree(webProcess.pid);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
  try {
    killProcessTree(apiProcess.pid);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
};

const run = async () => {
  await waitForUrl(`${apiUrl.replace(/\/$/, '')}/health`, 60000);
  await waitForUrl(`${webUrl.replace(/\/$/, '')}/login`, 60000);
  runCommand(npmCmd, ['run', 'test:smoke', '-w', 'apps/web'], {
    cwd: repoRoot,
    env: process.env,
  });
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    exitCode = 1;
  })
  .finally(() => {
    cleanup();
    process.exit(exitCode);
  });
