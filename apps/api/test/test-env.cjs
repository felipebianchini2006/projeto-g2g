const path = require('path');
const fs = require('fs');

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

const applyTestEnv = () => {
  const apiRoot = path.resolve(__dirname, '..');
  loadEnvFile(path.join(apiRoot, '.env.test'));

  process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
  process.env.TOKEN_TTL = process.env.TOKEN_TTL ?? '900';
  process.env.REFRESH_TTL = process.env.REFRESH_TTL ?? '3600';
  process.env.DATABASE_URL =
    process.env.E2E_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'postgresql://postgres:123456@localhost:5433/projeto_g2g_test';
  process.env.REDIS_URL =
    process.env.E2E_REDIS_URL ?? process.env.REDIS_URL ?? 'redis://localhost:6380';
  process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? 'test-discord-client';
  process.env.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? 'test-discord-secret';
  process.env.DISCORD_REDIRECT_URI =
    process.env.DISCORD_REDIRECT_URI ?? 'http://localhost:3000/api/auth/discord/callback';
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-gemini-key';
  process.env.GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  process.env.SUPPORT_AI_ENABLED = process.env.SUPPORT_AI_ENABLED ?? 'true';
  process.env.PIX_MOCK_MODE = process.env.PIX_MOCK_MODE ?? 'true';
};

module.exports = { applyTestEnv };