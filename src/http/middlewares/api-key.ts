import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getEnv } from '@/config/env.js';
import { failResponse } from '@/http/utils/response.js';

const PUBLIC_PATHS = new Set(['/health']);

function safeCompare(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
}

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (PUBLIC_PATHS.has(req.path)) {
    next();
    return;
  }

  const expected = getEnv().SERVICE_API_KEY;
  const provided = req.header('x-api-key');

  if (!provided || !safeCompare(provided, expected)) {
    res.status(401).json(failResponse(req.requestId, 'UNAUTHORIZED', 'Invalid or missing API key'));
    return;
  }

  next();
}
