import { createApp } from '@/app.js';
import { getNotificationService } from '@/bootstrap/create-services.js';
import { loadEnv, getEnv } from '@/config/env.js';
import { formatLogError } from '@/logging/format-log-error.js';
import { getLogger } from '@/logging/logger.js';
import { sendCrashAlertSafe } from '@/notifications/crash-alert.service.js';

const log = getLogger('app');

function registerFatalHandlers(): void {
  const handleFatal = async (err: unknown) => {
    await sendCrashAlertSafe(getNotificationService(), err);
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
  const server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT, msg: 'HTTP server listening' });
  });

  const shutdown = async (signal: string) => {
    try {
      log.info({ signal, msg: 'Shutting down' });
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
    await sendCrashAlertSafe(getNotificationService(), err);
  } catch {
    // Env or alert unavailable before bootstrap completed.
  }
  log.fatal({ ...formatLogError(err), msg: 'Fatal error in main' });
  process.exit(1);
});
