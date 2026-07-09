import { getEnv } from '@/config/env.js';
import {
  buildBusinessNotificationSummaryVars,
  type BusinessNotificationSummaryInput,
} from '@/jobs/utils/buildBusinessNotificationSummary.js';
import type { NotificationService } from '@/notifications/notification.service.js';
import { parseEmailRecipients } from '@/notifications/parse-email-recipients.js';

const BUSINESS_SUMMARY_TIMEOUT_MS = 5_000;

function buildBusinessSummaryRecipients(): string[] {
  const env = getEnv();
  const recipients = new Set<string>([
    ...parseEmailRecipients(env.CRASH_ALERT_EMAIL),
    ...parseEmailRecipients(env.BUSINESS_SUMMARY_EMAIL ?? ''),
  ]);
  return [...recipients];
}

export async function sendBusinessNotificationSummary(
  notificationService: NotificationService,
  input: BusinessNotificationSummaryInput,
  to?: string,
): Promise<void> {
  const toEmail = to ? parseEmailRecipients(to) : buildBusinessSummaryRecipients();
  if (!toEmail.length) {
    throw new Error('No business summary email recipients configured');
  }

  const payload = {
    channels: ['email' as const],
    email: {
      to: toEmail,
      template: 'notification-business-summary' as const,
      templateVars: buildBusinessNotificationSummaryVars(input),
    },
  };

  await Promise.race([
    notificationService.send(payload),
    new Promise<void>((_, reject) => {
      setTimeout(
        () => reject(new Error('Business notification summary email timed out')),
        BUSINESS_SUMMARY_TIMEOUT_MS,
      );
    }),
  ]);
}

export async function sendBusinessNotificationSummarySafe(
  notificationService: NotificationService,
  input: BusinessNotificationSummaryInput,
): Promise<boolean> {
  try {
    await sendBusinessNotificationSummary(notificationService, input);
    return true;
  } catch {
    return false;
  }
}
