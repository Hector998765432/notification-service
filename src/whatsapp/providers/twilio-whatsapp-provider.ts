import twilio, { type Twilio } from 'twilio';
import { getLogger } from '@/logging/logger.js';
import type { WhatsAppProvider } from '@/whatsapp/whatsapp-provider.js';
import type { WhatsAppMessage, WhatsAppSendResult } from '@/whatsapp/types.js';

const log = getLogger('whatsapp.twilio');

export type TwilioWhatsAppProviderOptions = {
  from?: string;
  messagingServiceSid?: string;
};

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'twilio' as const;
  private readonly client: Twilio;
  private readonly defaultFrom?: string;
  private readonly defaultMessagingServiceSid?: string;

  constructor(accountSid: string, authToken: string, options: TwilioWhatsAppProviderOptions = {}) {
    this.client = twilio(accountSid, authToken);
    this.defaultFrom = options.from;
    this.defaultMessagingServiceSid = options.messagingServiceSid;
  }

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const messagingServiceSid = message.messagingServiceSid ?? this.defaultMessagingServiceSid;
    const from = message.from ?? this.defaultFrom;

    if (!messagingServiceSid && !from) {
      throw new Error(
        'Twilio WhatsApp requires either a messaging service SID or a from number',
      );
    }

    if (!message.contentSid && !message.body) {
      throw new Error('Twilio WhatsApp message requires either contentSid or body');
    }

    const content = message.body
      ? { body: message.body }
      : {
          contentSid: message.contentSid,
          contentVariables: JSON.stringify(message.contentVariables ?? {}),
        };

    const payload = {
      ...content,
      to: message.to,
      //...(messagingServiceSid ? { messagingServiceSid } : { from }),
      from: from,
    };

    log.debug({
      to: message.to,
      kind: message.body ? 'freeform' : 'template',
      contentSid: message.contentSid,
      contentVariables: message.contentVariables,
      messagingServiceSid: messagingServiceSid ?? undefined,
      from: messagingServiceSid ? undefined : from,
      msg: 'Sending Twilio WhatsApp message',
    });

    try {
      const created = await this.client.messages.create(payload);

    log.info({
      sid: created.sid,
      status: created.status,
      to: created.to,
      contentSid: message.contentSid,
      contentVariables: message.contentVariables,
      sender: messagingServiceSid
          ? { type: 'messagingService', sid: messagingServiceSid }
          : { type: 'from', number: from },
        from: created.from ?? undefined,
        messagingServiceSid: created.messagingServiceSid ?? undefined,
        errorCode: created.errorCode ?? undefined,
        errorMessage: created.errorMessage ?? undefined,
        dateCreated: created.dateCreated,
        msg: 'Twilio WhatsApp message created',
      });

      return { id: created.sid, provider: this.name };
    } catch (err) {
      log.error({
        to: message.to,
        contentSid: message.contentSid,
        code: err && typeof err === 'object' && 'code' in err ? err.code : undefined,
        status: err && typeof err === 'object' && 'status' in err ? err.status : undefined,
        moreInfo:
          err && typeof err === 'object' && 'moreInfo' in err ? err.moreInfo : undefined,
        err: err instanceof Error ? err.message : String(err),
        msg: 'Twilio WhatsApp message failed',
        from: from,
        messagingServiceSid: messagingServiceSid ?? undefined,
      });
      throw err;
    }
  }
}
