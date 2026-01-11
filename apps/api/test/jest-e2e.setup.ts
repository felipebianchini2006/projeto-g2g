process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = process.env['JWT_SECRET'] ?? 'test-secret';
process.env['TOKEN_TTL'] = process.env['TOKEN_TTL'] ?? '900';
process.env['REFRESH_TTL'] = process.env['REFRESH_TTL'] ?? '3600';
process.env['DATABASE_URL'] =
  process.env['E2E_DATABASE_URL'] ??
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:123456@localhost:5432/projeto_g2g';
process.env['REDIS_URL'] =
  process.env['E2E_REDIS_URL'] ?? process.env['REDIS_URL'] ?? 'redis://localhost:6379';
process.env['DISCORD_CLIENT_ID'] = process.env['DISCORD_CLIENT_ID'] ?? 'test-discord-client';
process.env['DISCORD_CLIENT_SECRET'] = process.env['DISCORD_CLIENT_SECRET'] ?? 'test-discord-secret';
process.env['DISCORD_REDIRECT_URI'] =
  process.env['DISCORD_REDIRECT_URI'] ?? 'http://localhost:3000/api/auth/discord/callback';
process.env['GEMINI_API_KEY'] = process.env['GEMINI_API_KEY'] ?? 'test-gemini-key';
process.env['GEMINI_MODEL'] = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
process.env['SUPPORT_AI_ENABLED'] = process.env['SUPPORT_AI_ENABLED'] ?? 'true';
