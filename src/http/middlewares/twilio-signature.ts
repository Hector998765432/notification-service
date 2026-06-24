import type { NextFunction, Request, Response } from 'express';
import twilio from 'twilio';
import { getEnv } from '@/config/env.js';
import { getLogger } from '@/logging/logger.js';
import { failResponse } from '@/http/utils/response.js';

const log = getLogger('http.twilio-signature');

/**
 * Reconstructs the exact URL Twilio used to sign the request. Prefers
 * TWILIO_WEBHOOK_BASE_URL (reliable behind proxies); otherwise derives it from
 * the forwarded proto/host. Must match what is configured in the Twilio console.
 */
function resolveRequestUrl(req: Request): string {
  const base = getEnv().TWILIO_WEBHOOK_BASE_URL;
  if (base) {
    return `${base.replace(/\/$/, '')}${req.originalUrl}`;
  }
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}

export function twilioSignatureMiddleware(req: Request, res: Response, next: NextFunction): void {
  const env = getEnv();

  if (!env.TWILIO_VALIDATE_SIGNATURE) {
    next();
    return;
  }

  const signature = req.header('x-twilio-signature');
  const url = resolveRequestUrl(req);
  const params = (req.body ?? {}) as Record<string, unknown>;
  const hasSignature = typeof signature === 'string' && signature.length > 0;

  log.info({
    method: req.method,
    url,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    hasSignature,
    bodyKeys: Object.keys(params),
    msg: 'Twilio webhook signature check',
  });

  const isValid = hasSignature && twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);

  if (!isValid) {
    log.warn({
      url,
      method: req.method,
      userAgent: req.get('user-agent'),
      hasSignature,
      reason: hasSignature ? 'signature_mismatch' : 'missing_x_twilio_signature',
      msg: hasSignature
        ? 'Invalid Twilio signature (header present but validation failed — check TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_BASE_URL)'
        : 'Invalid Twilio signature (missing X-Twilio-Signature — request likely not from Twilio)',
    });
    res
      .status(403)
      .json(failResponse(req.requestId, 'INVALID_SIGNATURE', 'Invalid Twilio signature'));
    return;
  }

  next();
}
