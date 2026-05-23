import type { NextFunction, Request, Response } from 'express';
import { isAppError } from '@/errors/AppError.js';
import { formatLogError } from '@/logging/format-log-error.js';
import { getLogger } from '@/logging/logger.js';
import { failResponse } from '@/http/utils/response.js';

const log = getLogger('http');

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (isAppError(err)) {
    log.warn({
      code: err.code,
      statusCode: err.statusCode,
      path: req.path,
      requestId: req.requestId,
      msg: err.message,
    });
    res.status(err.statusCode).json(failResponse(req.requestId, err.code, err.message, err.details));
    return;
  }

  log.error({ ...formatLogError(err), path: req.path, requestId: req.requestId, msg: 'Unhandled error' });
  res.status(500).json(failResponse(req.requestId, 'INTERNAL', 'Internal Server Error'));
}
