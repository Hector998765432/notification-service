import type { EmailTemplateName } from '@/email/types.js';
import type { WhatsAppTemplateName } from '@/whatsapp/templates.js';

export type NotificationChannel = 'email' | 'whatsapp';

export type EmailNotificationConfig = {
  to: string[];
  subject?: string;
  html?: string;
  text?: string;
  template?: EmailTemplateName;
  templateVars?: Record<string, unknown>;
};

export type WhatsAppNotificationConfig = {
  to: string[];
  template: WhatsAppTemplateName;
  templateVars?: Record<string, unknown>;
};

export type NotificationPayload = {
  channels: NotificationChannel[];
  email?: EmailNotificationConfig;
  whatsapp?: WhatsAppNotificationConfig;
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
