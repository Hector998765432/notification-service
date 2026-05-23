import type { EmailProvider } from '@/email/email-provider.js';
import { getDefaultSubjectForTemplate, renderEmailTemplate } from '@/email/render-email-template.js';
import type { NotificationChannelHandler } from '@/notifications/channels/notification-channel.js';
import type { EmailNotificationConfig, NotificationChannelResult } from '@/notifications/types.js';

export class EmailChannelHandler implements NotificationChannelHandler {
  readonly channel = 'email' as const;

  constructor(private readonly emailProvider: EmailProvider) {}

  async send(config: unknown): Promise<NotificationChannelResult> {
    const emailConfig = config as EmailNotificationConfig;

    try {
      const html = await this.resolveHtml(emailConfig);
      const subject = emailConfig.subject ?? this.resolveDefaultSubject(emailConfig);

      const result = await this.emailProvider.send({
        to: emailConfig.to,
        subject,
        html,
        text: emailConfig.text,
      });

      return {
        channel: this.channel,
        success: true,
        providerId: result.id,
      };
    } catch (err) {
      return {
        channel: this.channel,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async resolveHtml(config: EmailNotificationConfig): Promise<string> {
    if (config.html) {
      return config.html;
    }

    if (config.template) {
      const vars = this.normalizeTemplateVars(config.templateVars ?? {});
      return renderEmailTemplate(config.template, vars);
    }

    throw new Error('Email channel requires either html or template');
  }

  private resolveDefaultSubject(config: EmailNotificationConfig): string {
    if (config.template) {
      return getDefaultSubjectForTemplate(config.template);
    }

    throw new Error('Email channel requires subject when html is provided without template');
  }

  private normalizeTemplateVars(
    vars: Record<string, unknown>,
  ): Record<string, string | number | null | undefined> {
    const normalized: Record<string, string | number | null | undefined> = {};

    for (const [key, value] of Object.entries(vars)) {
      if (value === null || value === undefined) {
        normalized[key] = value;
      } else if (typeof value === 'string' || typeof value === 'number') {
        normalized[key] = value;
      } else {
        normalized[key] = JSON.stringify(value);
      }
    }

    return normalized;
  }
}
