import { getEnv } from '@/config/env.js';

/** When true, Slack and ClickHouse sinks use `console.log` instead of remote calls. */
export function isLocalEnvironment(): boolean {
  return getEnv().NODE_ENV === 'local';
}

export function getLoggingConfig() {
  const env = getEnv();
  return {
    level: env.LOG_LEVEL,
    environment: env.NODE_ENV,
  };
}
