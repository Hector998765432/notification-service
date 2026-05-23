export type ApiErrorBody = {
  requestId?: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiSuccessBody<T> = {
  requestId?: string;
  code: string;
  success: true;
  data?: T;
};

export function failResponse(
  requestId: string | undefined,
  code: string,
  message: string,
  details?: unknown,
): ApiErrorBody {
  const error =
    details === undefined ? { code, message } : { code, message, details };

  return requestId ? { requestId, error } : { error };
}

export function okResponse<T>(
  requestId: string | undefined,
  code: string,
  data?: T,
): ApiSuccessBody<T> {
  const body: ApiSuccessBody<T> = { code, success: true };
  if (data !== undefined) {
    body.data = data;
  }
  return requestId ? { requestId, ...body } : body;
}
