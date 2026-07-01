import type { EmailProvider } from '@/email/email-provider.js';
import type { NotificationChannelHandler } from '@/notifications/channels/notification-channel.js';
import type { EmailNotificationConfig, NotificationChannelResult } from '@/notifications/types.js';
import type { NotificationTemplateService } from '@/templates/notification-template.service.js';

export class EmailChannelHandler implements NotificationChannelHandler {
  readonly channel = 'email' as const;

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly templateService: NotificationTemplateService,
  ) {}

  async send(config: unknown): Promise<NotificationChannelResult> {
    const emailConfig = config as EmailNotificationConfig;

    try {
      const { html, subject } = await this.resolveContent(emailConfig);

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

  private async resolveContent(
    config: EmailNotificationConfig,
  ): Promise<{ html: string; subject: string }> {
    if (config.html) {
      if (!config.subject) {
        throw new Error('Email channel requires subject when html is provided without template');
      }
      return { html: config.html, subject: config.subject };
    }

    if (config.template) {
      const resolved = await this.templateService.resolveEmailTemplate(
        config.template,
        config.templateVars ?? {},
      );
      return {
        html: resolved.html,
        subject: config.subject ?? resolved.defaultSubject,
      };
    }

    throw new Error('Email channel requires either html or template');
  }
}
