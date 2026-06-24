import type { Env } from '@/config/env.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';
import { TwilioWhatsAppProvider } from '@/whatsapp/providers/twilio-whatsapp-provider.js';

export function createWhatsAppProvider(env: Env): WhatsAppProvider {
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
