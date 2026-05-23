import { getEnv } from '@/config/env.js';
import { formatLogError } from '@/logging/format-log-error.js';
import type { NotificationService } from '@/notifications/notification.service.js';

const CRASH_ALERT_TIMEOUT_MS = 5_000;

function parseRecipients(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

export async function sendCrashAlert(
  notificationService: NotificationService,
  err: unknown,
  requestId?: string,
): Promise<void> {
  const env = getEnv();
  const formatted = formatLogError(err);

  const payload = {
    channels: ['email' as const],
    email: {
      to: parseRecipients(env.CRASH_ALERT_EMAIL),
      template: 'crash-alert' as const,
      templateVars: {
        serviceName: 'notification-service',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        requestId: requestId ?? 'N/A',
        errorMessage: String(formatted.errMessage ?? 'Unknown error'),
        errorStack: String(formatted.errStack ?? 'No stack trace available'),
      },
    },
  };

  await Promise.race([
    notificationService.send(payload),
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Crash alert timed out')), CRASH_ALERT_TIMEOUT_MS);
    }),
  ]);
}

export async function sendCrashAlertSafe(
  notificationService: NotificationService,
  err: unknown,
  requestId?: string,
): Promise<void> {
  try {
    await sendCrashAlert(notificationService, err, requestId);
  } catch {
    // Best-effort only; avoid recursive failures during shutdown.
  }
}
