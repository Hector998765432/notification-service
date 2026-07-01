import { getLogger } from '@/logging/logger.js';
import type { NotificationChannelHandler } from '@/notifications/channels/notification-channel.js';
import type {
  NotificationChannelResult,
  WhatsAppNotificationConfig,
} from '@/notifications/types.js';
import type { WhatsAppContextRepository } from '@/persistence/repositories/whatsapp-context.repository.js';
import type { NotificationTemplateService } from '@/templates/notification-template.service.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';

const log = getLogger('notifications.whatsapp');

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

      const templateVars = whatsAppConfig.templateVars ?? {};
      const { contentSid, contentVariables, correlationValue } =
        await this.templateService.resolveWhatsAppTemplate(whatsAppConfig.template, templateVars);

      const providerIds: string[] = [];
      for (const recipient of whatsAppConfig.to) {
        const result = await this.whatsAppProvider.send({
          to: this.normalizeRecipient(recipient),
          contentSid,
          contentVariables,
        });
        if (result.id) {
          providerIds.push(result.id);
        }

        await this.recordContext(recipient, whatsAppConfig.template, correlationValue, result.id);
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

  private async recordContext(
    recipient: string,
    template: string,
    correlationValue: string | undefined,
    messageSid: string | undefined,
  ): Promise<void> {
    if (!this.contextRepository || !correlationValue) {
      return;
    }

    try {
      await this.contextRepository.recordOutbound({
        phone: recipient,
        serialEnding: correlationValue,
        template,
        messageSid: messageSid ?? null,
      });
    } catch (err) {
      log.warn({
        recipient,
        template,
        err: err instanceof Error ? err.message : String(err),
        msg: 'Failed to record WhatsApp message context',
      });
    }
  }

  private normalizeRecipient(recipient: string): string {
    const trimmed = recipient.trim();
    return trimmed.startsWith('whatsapp:') ? trimmed : `whatsapp:${trimmed}`;
  }
}
