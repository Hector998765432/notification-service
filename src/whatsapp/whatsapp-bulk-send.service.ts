import { getLogger } from '@/logging/logger.js';
import type { WhatsAppContextRepository } from '@/persistence/repositories/whatsapp-context.repository.js';
import type { NotificationTemplateService } from '@/templates/notification-template.service.js';
import { sendResolvedWhatsAppTemplate } from '@/whatsapp/send-whatsapp-template.js';
import type {
  WhatsAppBulkMessageItem,
  WhatsAppBulkSendItemResult,
  WhatsAppBulkSendResult,
} from '@/whatsapp/types.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';

const log = getLogger('whatsapp.bulk-send');

export type BulkSendOptions = {
  signal?: AbortSignal;
};

/**
 * Sends many WhatsApp template messages in a single batch. Messages are
 * processed sequentially; throughput is bounded by the process-wide strict
 * rate limiter enforced inside the provider. Per-message failures are captured
 * so one bad recipient never aborts the whole batch, while an aborted signal
 * stops the batch and returns partial results.
 */
export class WhatsAppBulkSendService {
  constructor(
    private readonly whatsAppProvider: WhatsAppProvider,
    private readonly templateService: NotificationTemplateService,
    private readonly contextRepository?: WhatsAppContextRepository,
  ) {}

  async sendBulk(
    messages: WhatsAppBulkMessageItem[],
    options: BulkSendOptions = {},
  ): Promise<WhatsAppBulkSendResult> {
    const startedAt = Date.now();
    const results: WhatsAppBulkSendItemResult[] = [];

    log.info({ total: messages.length, msg: 'WhatsApp bulk send started' });

    for (const message of messages) {
      if (options.signal?.aborted) {
        log.warn({
          processed: results.length,
          total: messages.length,
          msg: 'WhatsApp bulk send aborted; returning partial results',
        });
        break;
      }

      results.push(await this.sendOne(message));
    }

    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    log.info({
      total: messages.length,
      processed: results.length,
      succeeded,
      failed,
      durationMs: Date.now() - startedAt,
      msg: 'WhatsApp bulk send finished',
    });

    return {
      total: messages.length,
      succeeded,
      failed,
      results,
    };
  }

  private async sendOne(message: WhatsAppBulkMessageItem): Promise<WhatsAppBulkSendItemResult> {
    try {
      if (!message.to) {
        throw new Error('Bulk WhatsApp message requires a recipient');
      }

      const providerId = await sendResolvedWhatsAppTemplate({
        provider: this.whatsAppProvider,
        templateService: this.templateService,
        contextRepository: this.contextRepository,
        to: message.to,
        template: message.template,
        templateVars: message.templateVars,
      });

      return {
        to: message.to,
        template: message.template,
        success: true,
        providerId,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.warn({
        to: message.to,
        template: message.template,
        err: error,
        msg: 'WhatsApp bulk message failed',
      });
      return {
        to: message.to,
        template: message.template,
        success: false,
        error,
      };
    }
  }
}

export function createWhatsAppBulkSendService(
  whatsAppProvider: WhatsAppProvider,
  templateService: NotificationTemplateService,
  contextRepository?: WhatsAppContextRepository,
): WhatsAppBulkSendService {
  return new WhatsAppBulkSendService(whatsAppProvider, templateService, contextRepository);
}
