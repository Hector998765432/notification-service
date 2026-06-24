import type { SupabaseAdminClient } from '@/db/supabase/index.js';
import { getSupabaseAdminClient } from '@/db/supabase/index.js';
import type { WhatsAppMessageContextRow } from '@/types/supabase/index.js';
import { RepositoryError } from '@/persistence/repositories/repository-error.js';

export type RecordOutboundInput = {
  phone: string;
  serialEnding: string;
  template: string;
  messageSid?: string | null;
};

/** Strips `whatsapp:` and normalizes Mexican mobile E.164 (+521XXXXXXXXXX → +52XXXXXXXXXX). */
export function normalizePhone(phone: string): string {
  const e164 = phone.trim().replace(/^whatsapp:/i, '');
  const mexicoMobile = e164.match(/^\+521(\d{10})$/);
  return mexicoMobile ? `+52${mexicoMobile[1]}` : e164;
}

export class WhatsAppContextRepository {
  constructor(private readonly client: SupabaseAdminClient = getSupabaseAdminClient()) {}

  async recordOutbound(input: RecordOutboundInput): Promise<WhatsAppMessageContextRow> {
    const { data, error } = await this.client
      .from('whatsapp_message_context')
      .insert({
        phone: normalizePhone(input.phone),
        serial_ending: input.serialEnding,
        template: input.template,
        message_sid: input.messageSid ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new RepositoryError('Unable to record WhatsApp message context', error);
    }

    return data;
  }

  async findLatestByPhone(phone: string): Promise<WhatsAppMessageContextRow | null> {
    const { data, error } = await this.client
      .from('whatsapp_message_context')
      .select('*')
      .eq('phone', normalizePhone(phone))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new RepositoryError(`Unable to load WhatsApp context for ${phone}`, error);
    }

    return data;
  }
}

export const whatsAppContextRepository = new WhatsAppContextRepository();
