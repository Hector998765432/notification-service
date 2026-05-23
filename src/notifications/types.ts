import type { EmailTemplateName } from '@/email/types.js';

export type NotificationChannel = 'email';

export type EmailNotificationConfig = {
  to: string[];
  subject?: string;
  html?: string;
  text?: string;
  template?: EmailTemplateName;
  templateVars?: Record<string, unknown>;
};

export type NotificationPayload = {
  channels: NotificationChannel[];
  email?: EmailNotificationConfig;
};

export type NotificationChannelResult = {
  channel: NotificationChannel;
  success: boolean;
  providerId?: string;
  error?: string;
};

export type NotificationResult = {
  results: NotificationChannelResult[];
  allSucceeded: boolean;
};
