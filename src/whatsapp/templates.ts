import type { Env } from '@/config/env.js';

export type WhatsAppTemplateName = 'contract-status-review';

type WhatsAppTemplateDefinition = {
  /** Env var holding the approved Twilio Content SID (HX...). */
  contentSidEnv: keyof Env;
  /** Logical variable names in positional order: index 0 -> {{1}}, 1 -> {{2}}, ... */
  variables: readonly string[];
  /**
   * Variable whose value identifies the conversation for inbound correlation
   * (e.g. the serial sent to the user). Persisted on send so a later reply can
   * resolve it. Omit if the template needs no inbound follow-up.
   */
  correlationVar?: string;
};

/**
 * Registry of approved WhatsApp templates. To add a future template, add an
 * entry here plus its `TWILIO_TEMPLATE_*` var in `env.ts` and `.env.example`.
 */
export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateName, WhatsAppTemplateDefinition> = {
  'contract-status-review': {
    contentSidEnv: 'TWILIO_TEMPLATE_CONTRACT_STATUS_REVIEW' as keyof Env,
    variables: ['customerName', 'serialEnding'],
    correlationVar: 'serialEnding',
  },
};

export type BuiltContent = {
  contentSid: string;
  contentVariables: Record<string, string>;
};

/**
 * Resolves the template's `contentSid` from env and maps the provided logical
 * variables into the positional `{ "1": ..., "2": ... }` object Twilio expects.
 */
export function buildContentVariables(
  name: WhatsAppTemplateName,
  templateVars: Record<string, unknown>,
  env: Env,
): BuiltContent {
  const definition = WHATSAPP_TEMPLATES[name];
  if (!definition) {
    throw new Error(`Unknown WhatsApp template: ${name}`);
  }

  const contentSid = env[definition.contentSidEnv];
  if (!contentSid || typeof contentSid !== 'string') {
    throw new Error(
      `Missing content SID for WhatsApp template "${name}"; set env var ${definition.contentSidEnv}`,
    );
  }

  const contentVariables: Record<string, string> = {};
  definition.variables.forEach((variableName, index) => {
    const value = templateVars[variableName];
    if (value === null || value === undefined) {
      throw new Error(
        `Missing template variable "${variableName}" for WhatsApp template "${name}"`,
      );
    }
    contentVariables[String(index + 1)] = String(value);
  });

  return { contentSid, contentVariables };
}

export function getCorrelationValue(
  name: WhatsAppTemplateName,
  templateVars: Record<string, unknown>,
): string | undefined {
  const definition = WHATSAPP_TEMPLATES[name];
  const correlationVar = definition?.correlationVar;
  if (!correlationVar) {
    return undefined;
  }

  const value = templateVars[correlationVar];
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  return String(value);
}
