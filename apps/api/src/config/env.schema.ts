import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  JWT_SECRET: Joi.string().required(),
  TOKEN_TTL: Joi.number().integer().min(60).default(900),
  REFRESH_TTL: Joi.number().integer().min(300).default(2592000),
});
