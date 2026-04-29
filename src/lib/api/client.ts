export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(params: { status: number; code: string; message: string; details?: unknown }) {
    super(params.message);
    this.name = "HttpError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new HttpError({
      status: response.status,
      code: json?.code ?? "HTTP_ERROR",
      message: json?.message ?? "Request failed",
      details: json?.details,
    });
  }

  return json as T;
}