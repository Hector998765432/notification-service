import type { EmailMessage, EmailProviderName, EmailSendResult } from '@/email/types.js';

export interface EmailProvider {
  readonly name: EmailProviderName;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
