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

export type WhatsAppBulkMessageItem = {
  to: string;
  template: string;
  templateVars?: Record<string, unknown>;
};

export type WhatsAppBulkSendItemResult = {
  to: string;
  template: string;
  success: boolean;
  providerId?: string;
  error?: string;
};

export type WhatsAppBulkSendResult = {
  total: number;
  succeeded: number;
  failed: number;
  results: WhatsAppBulkSendItemResult[];
};
