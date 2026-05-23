import { Resend } from 'resend';
import type { EmailProvider } from '@/email/email-provider.js';
import type { EmailMessage, EmailSendResult } from '@/email/types.js';

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;
  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { data, error } = await this.client.emails.send({
      from: message.from ?? this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { id: data?.id, provider: this.name };
  }
}
