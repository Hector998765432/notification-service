import { getEnv } from '@/config/env.js';
import { buildNotificationSummaryVars, type NotificationSummaryInput } from '@/jobs/utils/buildNotificationSummary.js';
import type { NotificationService } from '@/notifications/notification.service.js';
import { parseEmailRecipients } from '@/notifications/parse-email-recipients.js';

const NOTIFICATION_SUMMARY_TIMEOUT_MS = 5_000;

export async function sendNotificationSummary(
  notificationService: NotificationService,
  input: NotificationSummaryInput,
  to?: string,
): Promise<void> {
  const env = getEnv();

  let toEmail = parseEmailRecipients(env.CRASH_ALERT_EMAIL);
  if (to) {
    toEmail = parseEmailRecipients(to);
  }

  const payload = {
    channels: ['email' as const],
    email: {
      to: toEmail,
      template: 'notification-run-summary' as const,
      templateVars: buildNotificationSummaryVars(input),
    },
  };

  await Promise.race([
    notificationService.send(payload),
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('Notification summary email timed out')), NOTIFICATION_SUMMARY_TIMEOUT_MS);
    }),
  ]);
}

export async function sendNotificationSummarySafe(
  notificationService: NotificationService,
  input: NotificationSummaryInput,
): Promise<boolean> {
  try {
    await sendNotificationSummary(notificationService, input);
    return true;
  } catch {
    return false;
  }
}
