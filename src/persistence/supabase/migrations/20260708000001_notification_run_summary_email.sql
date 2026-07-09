-- Email template: notification run summary (contracts expiring cron).

insert into public.notification_templates (
  classification_id,
  name,
  channel,
  html_body,
  default_subject
)
select
  tc.id,
  'notification-run-summary',
  'email',
  $html$<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resumen de notificaciones</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827; background: #f9fafb; margin: 0; padding: 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
    <tr>
      <td style="padding: 24px;">
        <h1 style="margin: 0 0 8px; font-size: 20px; color: #1d4ed8;">Resumen de notificaciones de contratos</h1>
        <p style="margin: 0 0 16px; color: #6b7280;">Ejecución del cron de notificaciones — {runDate}</p>

        <h2 style="margin: 0 0 8px; font-size: 16px;">Totales</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>Contratos en Odoo</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">{odooContractsTotal}</td></tr>
          <tr><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>Encontrados en plataforma</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">{platformMatchedTotal}</td></tr>
          <tr><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>Sin operador asignado</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6; color: #b45309;">{missingOnPlatformTotal}</td></tr>
          <tr><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>WhatsApp encolados</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">{whatsappQueued}</td></tr>
          <tr><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>WhatsApp exitosos</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">{whatsappSucceeded}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>WhatsApp fallidos</strong></td><td style="padding: 6px 0;">{whatsappFailed}</td></tr>
        </table>

        {missingVinsSection}

        <h2 style="margin: 16px 0 8px; font-size: 16px;">Contratos por tipo</h2>
        {contractsByTypeHtml}

        <h2 style="margin: 16px 0 8px; font-size: 16px;">Mensajes enviados</h2>
        {messagesHtml}

        <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">Job: {jobKey} · Run: {runId} · Entorno: {environment}</p>
      </td>
    </tr>
  </table>
</body>
</html>$html$,
  '[Notificaciones] Resumen de contratos por vencer — {runDate}'
from public.template_classifications tc
where tc.name = 'contracts'
on conflict (name, channel) do nothing;
