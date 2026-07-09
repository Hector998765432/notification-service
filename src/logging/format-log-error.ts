interface PostgrestLikeError {
  message?: string;
  code?: string;
  hint?: string;
  details?: string;
}

interface SystemLikeError {
  message?: string;
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
  hostname?: string;
}

const MAX_CAUSE_DEPTH = 5;

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

  applyCauseDetails(out, collectCauseChain(err));

  return out;
}

function collectCauseChain(err: unknown): unknown[] {
  const chain: unknown[] = [];
  let current: unknown = err;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (current == null || typeof current !== 'object') {
      break;
    }

    const cause = (current as { cause?: unknown }).cause;
    if (cause == null) {
      break;
    }

    chain.push(cause);
    current = cause;
  }

  return chain;
}

function applyCauseDetails(out: Record<string, unknown>, chain: unknown[]): void {
  for (const cause of chain) {
    if (cause == null) {
      continue;
    }

    if (typeof cause !== 'object') {
      out.errCause ??= String(cause);
      continue;
    }

    applyPostgrestFields(out, cause as PostgrestLikeError);
    applySystemFields(out, cause as SystemLikeError);

    const details = (cause as PostgrestLikeError).details;
    if (typeof details === 'string') {
      applyNetworkDetails(out, details);
    }

    const message = (cause as SystemLikeError).message;
    if (typeof message === 'string') {
      applyNetworkDetails(out, message);
    }
  }
}

function applyPostgrestFields(out: Record<string, unknown>, cause: PostgrestLikeError): void {
  if (typeof cause.message === 'string' && cause.message.length > 0) {
    out.errCauseMessage ??= cause.message;
  }
  if (typeof cause.code === 'string' && cause.code.length > 0) {
    out.errCauseCode ??= cause.code;
  }
  if (typeof cause.hint === 'string' && cause.hint.length > 0) {
    out.errCauseHint ??= cause.hint;
  }
  if (typeof cause.details === 'string' && cause.details.length > 0) {
    out.errCauseDetails ??= cause.details;
  }
}

function applySystemFields(out: Record<string, unknown>, cause: SystemLikeError): void {
  if (typeof cause.code === 'string' && cause.code.length > 0) {
    out.errNetworkCode ??= cause.code;
  }
  if (typeof cause.errno === 'number') {
    out.errNetworkErrno ??= cause.errno;
  }
  if (typeof cause.syscall === 'string') {
    out.errNetworkSyscall ??= cause.syscall;
  }
  if (typeof cause.address === 'string') {
    out.errNetworkAddress ??= cause.address;
  }
  if (typeof cause.port === 'number') {
    out.errNetworkPort ??= cause.port;
  }
  if (typeof cause.hostname === 'string') {
    out.errNetworkHostname ??= cause.hostname;
  }
}

function applyNetworkDetails(out: Record<string, unknown>, text: string): void {
  const connectMatch = text.match(/connect ([A-Z_]+) ([^\s]+):(\d+)/);
  if (connectMatch) {
    out.errNetworkCode ??= connectMatch[1];
    out.errNetworkAddress ??= connectMatch[2];
    out.errNetworkPort ??= Number(connectMatch[3]);
  }

  const dnsMatch = text.match(/getaddrinfo ENOTFOUND (\S+)/);
  if (dnsMatch) {
    out.errNetworkCode ??= 'ENOTFOUND';
    out.errNetworkHostname ??= dnsMatch[1];
  }

  if (!out.errNetworkCode) {
    const parenMatch = text.match(/\(([A-Z_]+)\)/);
    if (parenMatch) {
      out.errNetworkCode = parenMatch[1];
    }
  }

  if (!out.errNetworkCode && /(UND_ERR_CONNECT_TIMEOUT|ConnectTimeoutError|ETIMEDOUT)/.test(text)) {
    out.errNetworkCode = 'ETIMEDOUT';
  }
}
