import { createApp } from '@/app.js';
import { getDynamicCronScheduler, getNotificationService } from '@/bootstrap/create-services.js';
import { loadEnv, getEnv } from '@/config/env.js';
import { formatLogError } from '@/logging/format-log-error.js';
import { getLogger } from '@/logging/logger.js';
import { sendCrashAlertSafe } from '@/notifications/crash-alert.service.js';

const env = getEnv();
const log = getLogger('app');

function registerFatalHandlers(): void {
  const handleFatal = async (err: unknown) => {
    // Only send crash alerts in non-local environments
    if (env.NODE_ENV !== 'local') {
      await sendCrashAlertSafe(getNotificationService(), err);
    }
    log.fatal({ ...formatLogError(err), msg: 'Fatal process error' });
    process.exit(1);
  };

  process.on('uncaughtException', (err) => {
    void handleFatal(err);
  });

  process.on('unhandledRejection', (reason) => {
    void handleFatal(reason);
  });
}

async function main(): Promise<void> {
  loadEnv();
  registerFatalHandlers();
  const env = getEnv();

  const app = createApp();
  const scheduler = getDynamicCronScheduler();
  await scheduler.start();

  const server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT, msg: 'HTTP server listening' });
  });

  const shutdown = async (signal: string) => {
    try {
      log.info({ signal, msg: 'Shutting down' });
      await scheduler.stop();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else {
            log.info({ msg: 'HTTP server closed' });
            resolve();
          }
        });
      });
      process.exit(0);
    } catch (err) {
      log.error({ ...formatLogError(err), msg: 'Error during shutdown' });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

main().catch(async (err: unknown) => {
  try {
    loadEnv();
    // Only send crash alerts in non-local environments
    if (env.NODE_ENV !== 'local') {
      await sendCrashAlertSafe(getNotificationService(), err);
    }
  } catch {
    // Env or alert unavailable before bootstrap completed.
  }
  log.fatal({ ...formatLogError(err), msg: 'Fatal error in main' });
  process.exit(1);
});
