-- Correlation context for outbound WhatsApp template messages.
-- Lets inbound replies (e.g. the "REVISAR" keyword) resolve which serial/VIN
-- was sent to a given phone number so we can look up the related contract.

create table if not exists public.whatsapp_message_context (
  id            uuid primary key default gen_random_uuid(),
  phone         text not null,
  serial_ending text not null,
  template      text not null,
  message_sid   text,
  created_at    timestamptz not null default now(),
  constraint whatsapp_message_context_phone_not_blank check (length(trim(phone)) > 0),
  constraint whatsapp_message_context_serial_not_blank check (length(trim(serial_ending)) > 0),
  constraint whatsapp_message_context_template_not_blank check (length(trim(template)) > 0)
);

create index if not exists idx_whatsapp_message_context_phone_created
  on public.whatsapp_message_context(phone, created_at desc);

alter table public.whatsapp_message_context enable row level security;
