import type { StrictRateLimiter } from '@/whatsapp/strict-rate-limiter.js';
import type { WhatsAppMessage, WhatsAppProviderName, WhatsAppSendResult } from '@/whatsapp/types.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';

/**
 * Wraps a WhatsApp provider so every send passes through a strict rate limiter.
 * All send paths (HTTP API, bulk service, inbound replies) share the same
 * limiter instance so the per-second cap is enforced process-wide.
 */
export class RateLimitedWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly inner: WhatsAppProvider,
    private readonly rateLimiter: StrictRateLimiter,
  ) {}

  get name(): WhatsAppProviderName {
    return this.inner.name;
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    await this.rateLimiter.acquire();
    return this.inner.send(message);
  }
}
