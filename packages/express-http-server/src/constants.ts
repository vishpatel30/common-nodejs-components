export const GLOBAL = {
  ENV_DEV: 'development',
  ENV_TEST: 'test',
  ENV_PROD: 'production',
} as const;

export const API = {
  HEALTH_CHECK: '/health-check',
  READY_CHECK: '/ready-check',
  SWAGGER_UI: '/api-docs',
} as const;

export const ENVIRONMENT_MODE_TYPE = {
  test : 'test',
  dev: 'development',
  uat: 'uat',
  prod: 'production'
} as const;

export const VAULT = {
  RSA_KEYS_BASE_PATH: 'dev/rsakeys',
} as const;

export const REDIS = {
  REDIS_KEY: 'auth:crypto:private-key',
} as const;
