import type { NotificationChannelHandler } from '@/notifications/channels/notification-channel.js';
import type {
  NotificationChannelResult,
  WhatsAppNotificationConfig,
} from '@/notifications/types.js';
import type { WhatsAppContextRepository } from '@/persistence/repositories/whatsapp-context.repository.js';
import type { NotificationTemplateService } from '@/templates/notification-template.service.js';
import { sendResolvedWhatsAppTemplate } from '@/whatsapp/send-whatsapp-template.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';

export class WhatsAppChannelHandler implements NotificationChannelHandler {
  readonly channel = 'whatsapp' as const;

  constructor(
    private readonly whatsAppProvider: WhatsAppProvider,
    private readonly templateService: NotificationTemplateService,
    private readonly contextRepository?: WhatsAppContextRepository,
  ) {}

  async send(config: unknown): Promise<NotificationChannelResult> {
    const whatsAppConfig = config as WhatsAppNotificationConfig;

    try {
      if (!whatsAppConfig.to || whatsAppConfig.to.length === 0) {
        throw new Error('WhatsApp channel requires at least one recipient');
      }
      if (!whatsAppConfig.template) {
        throw new Error('WhatsApp channel requires a template');
      }

      const providerIds: string[] = [];
      for (const recipient of whatsAppConfig.to) {
        const messageId = await sendResolvedWhatsAppTemplate({
          provider: this.whatsAppProvider,
          templateService: this.templateService,
          contextRepository: this.contextRepository,
          to: recipient,
          template: whatsAppConfig.template,
          templateVars: whatsAppConfig.templateVars,
        });
        if (messageId) {
          providerIds.push(messageId);
        }
      }

      return {
        channel: this.channel,
        success: true,
        providerId: providerIds.join(','),
      };
    } catch (err) {
      return {
        channel: this.channel,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
