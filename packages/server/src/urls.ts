import { DEFAULT_API_BASE } from "./types.js";

export function trimBase(apiBase = DEFAULT_API_BASE): string {
  return apiBase.replace(/\/+$/, "");
}

export function appsUrl(apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/apps`;
}

export function appUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/apps/${encodeURIComponent(id)}`;
}

export function devicesUrl(apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/devices`;
}

export function deviceUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/devices/${encodeURIComponent(id)}`;
}

export function messagesUrl(apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/messages`;
}

export function messageUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/messages/${encodeURIComponent(id)}`;
}

export function messageCancelUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/messages/${encodeURIComponent(id)}/cancel`;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}
