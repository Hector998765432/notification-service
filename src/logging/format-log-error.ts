/**
 * Builds a plain object safe for Pino/JSON (Error instances often log as `{}`).
 */
export function formatLogError(err: unknown): Record<string, unknown> {
  if (err == null) {
    return { errKind: 'nullish', errMessage: String(err) };
  }
  if (typeof err !== 'object') {
    return { errKind: 'primitive', errMessage: String(err) };
  }

  const e = err as Error & {
    code?: string;
    sql?: string;
    parent?: { message?: string; code?: string; detail?: string; severity?: string };
    original?: { message?: string; code?: string };
  };

  const out: Record<string, unknown> = {
    errKind: e.name ?? 'Error',
    errMessage: typeof e.message === 'string' && e.message.length > 0 ? e.message : String(err),
  };

  const cause = (e as Error & { cause?: unknown }).cause;
  if (cause != null) {
    if (typeof cause === 'object' && cause !== null) {
      const c = cause as { message?: string; code?: string; hint?: string; details?: string };
      if (typeof c.message === 'string') out.errCauseMessage = c.message;
      if (typeof c.code === 'string') out.errCauseCode = c.code;
      if (typeof c.hint === 'string') out.errCauseHint = c.hint;
      if (typeof c.details === 'string') out.errCauseDetails = c.details;
    } else {
      out.errCause = String(cause);
    }
  }

  if (typeof e.stack === 'string') {
    out.errStack = e.stack;
  }
  if (typeof e.code === 'string') {
    out.errCode = e.code;
  }
  if (typeof e.sql === 'string') {
    out.errSql = e.sql;
  }

  const parent = e.parent;
  if (parent && typeof parent === 'object') {
    out.errDbMessage = parent.message;
    out.errDbCode = parent.code;
    out.errDbDetail = parent.detail;
  }

  const original = e.original;
  if (original && typeof original === 'object' && !out.errDbMessage) {
    out.errDbMessage = original.message;
    out.errDbCode = original.code;
  }

  return out;
}
