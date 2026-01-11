const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

const parseEnvValue = (raw) => {
  if (raw === undefined) {
    return '';
  }
  let value = raw.trim();
  if (!value) {
    return '';
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
};

const loadEnvFile = (filePath, env = process.env) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1];
    if (env[key] !== undefined) {
      continue;
    }
    env[key] = parseEnvValue(match[2]);
  }
};

const runCommand = (command, args, options = {}) => {
  const isWindows = process.platform === 'win32';
  const finalCommand = isWindows ? 'cmd.exe' : command;
  const finalArgs = isWindows ? ['/c', command, ...args] : args;
  const result = spawnSync(finalCommand, finalArgs, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const err = new Error(`Command failed: ${command} ${args.join(' ')}`);
    err.code = result.status;
    throw err;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  repoRoot,
  loadEnvFile,
  runCommand,
  sleep,
};
