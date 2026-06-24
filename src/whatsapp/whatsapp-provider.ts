import type { WhatsAppMessage, WhatsAppProviderName, WhatsAppSendResult } from '@/whatsapp/types.js';

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>;
}
