import { HttpError } from "../../../../lib/api/client.js";

export type JsonRequestFn = <T>(url: string, init?: RequestInit) => Promise<T>;

export function createAuthenticatedJsonRequest(getAccessToken: () => string | null | undefined): JsonRequestFn {
  return async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const token = getAccessToken();
    const hasBody = init?.body !== undefined && init?.body !== null;
    const headers = new Headers(init?.headers ?? {});
    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    const json: unknown = await response.json().catch(() => null);
    const errBody = json as { code?: string; message?: string; details?: unknown } | null;

    if (!response.ok) {
      throw new HttpError({
        status: response.status,
        code: errBody?.code ?? "HTTP_ERROR",
        message: errBody?.message ?? "Request failed",
        details: errBody?.details,
      });
    }

    return json as T;
  };
}
