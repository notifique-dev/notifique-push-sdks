import type { ApiErrorBody } from "./types.js";

export class PushClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "PushClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function authHeaders(
  apiKey: string,
  useXApiKeyHeader = false,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  if (useXApiKeyHeader) {
    headers["x-api-key"] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

export async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

export function parseApiError(raw: unknown): ApiErrorBody | null {
  if (!raw || typeof raw !== "object" || (raw as ApiErrorBody).success !== false) return null;
  const record = raw as Record<string, unknown>;
  return {
    success: false,
    error: typeof record.error === "string" ? record.error : "Error",
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
    details: record.details,
  };
}

export function throwApiError(response: Response, raw: unknown): void {
  const parsed = parseApiError(raw);
  const message = parsed?.message || parsed?.error || `Request failed (${response.status})`;
  throw new PushClientError(message, response.status, parsed?.code, parsed?.details);
}
