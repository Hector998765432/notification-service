import { getEnv } from '@/config/env.js';
import { createEmailProvider } from '@/email/create-email-provider.js';
import type { EmailProvider } from '@/email/email-provider.js';
import {
  createNotificationService,
  type NotificationService,
} from '@/notifications/notification.service.js';

let emailProvider: EmailProvider | null = null;
let notificationService: NotificationService | null = null;

export function getEmailProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider = createEmailProvider(getEnv());
  }
  return emailProvider;
}

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = createNotificationService(getEmailProvider());
  }
  return notificationService;
}
