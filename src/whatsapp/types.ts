export type WhatsAppProviderName = 'twilio';

/**
 * Either a template message (`contentSid` + optional `contentVariables`) for
 * sends outside the 24h window, or a free-form `body` message for replies
 * inside the customer-service window. Exactly one of `contentSid`/`body`.
 */
export type WhatsAppMessage = {
  to: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
  body?: string;
  from?: string;
  messagingServiceSid?: string;
};

export type WhatsAppSendResult = {
  id?: string;
  provider: WhatsAppProviderName;
};
