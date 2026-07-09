import type { Env } from '@/config/env.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';
import { TwilioWhatsAppProvider } from '@/whatsapp/providers/twilio-whatsapp-provider.js';
import { RateLimitedWhatsAppProvider } from '@/whatsapp/rate-limited-whatsapp-provider.js';
import { StrictRateLimiter } from '@/whatsapp/strict-rate-limiter.js';

function createBaseProvider(env: Env): WhatsAppProvider {
  switch (env.WHATSAPP_PROVIDER) {
    case 'twilio':
      return new TwilioWhatsAppProvider(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, {
        from: env.TWILIO_WHATSAPP_FROM,
        messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID,
      });
    default: {
      const provider: never = env.WHATSAPP_PROVIDER;
      throw new Error(`Unsupported WhatsApp provider: ${provider}`);
    }
  }
}

export function createWhatsAppProvider(env: Env): WhatsAppProvider {
  const base = createBaseProvider(env);
  const rateLimiter = new StrictRateLimiter(env.WHATSAPP_RATE_LIMIT_PER_SECOND);
  return new RateLimitedWhatsAppProvider(base, rateLimiter);
}
