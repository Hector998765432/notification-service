export type EmailProviderName = 'resend';

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  replyTo?: string | string[];
};

export type EmailSendResult = {
  id?: string;
  provider: EmailProviderName;
};

export type EmailTemplateName = 'crash-alert';
