import { getLogger } from '@/logging/logger.js';
import { normalizePhone } from '@/persistence/repositories/whatsapp-context.repository.js';
import type { WhatsAppContextRepository } from '@/persistence/repositories/whatsapp-context.repository.js';
import type { NotificationTemplateService } from '@/templates/notification-template.service.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';

const log = getLogger('whatsapp.send-template');

export type SendWhatsAppTemplateInput = {
  provider: WhatsAppProvider;
  templateService: NotificationTemplateService;
  contextRepository?: WhatsAppContextRepository;
  to: string;
  template: string;
  templateVars?: Record<string, unknown>;
};

/** Normalizes E.164 (Mexico) and prefixes `whatsapp:` for Twilio. */
export function normalizeRecipient(recipient: string): string {
  const normalized = normalizePhone(recipient);
  return `whatsapp:${normalized}`;
}

/**
 * Resolves an approved WhatsApp template, sends it through the provider and
 * records outbound correlation context. Shared by the notification channel and
 * the bulk send service so both paths behave identically (including the
 * process-wide rate limiter enforced by the provider).
 */
export async function sendResolvedWhatsAppTemplate(
  input: SendWhatsAppTemplateInput,
): Promise<string | undefined> {
  const { provider, templateService, contextRepository, to, template } = input;
  const templateVars = input.templateVars ?? {};

  const { contentSid, contentVariables, correlationValue } =
    await templateService.resolveWhatsAppTemplate(template, templateVars);

  const result = await provider.send({
    to: normalizeRecipient(to),
    contentSid,
    contentVariables,
  });

  await recordContext(contextRepository, to, template, correlationValue, result.id);

  return result.id;
}

async function recordContext(
  contextRepository: WhatsAppContextRepository | undefined,
  recipient: string,
  template: string,
  correlationValue: string | undefined,
  messageSid: string | undefined,
): Promise<void> {
  if (!contextRepository || !correlationValue) {
    return;
  }

  try {
    await contextRepository.recordOutbound({
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
