/** Shared types and helpers for Notifique Push SDKs (client + server). */

export type PushPlatform = "web" | "android" | "ios";

export type WebSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type RegisterDeviceRequest = {
  appId: string;
  platform: PushPlatform;
  subscription?: WebSubscription;
  token?: string;
  /** Required for public android registration */
  packageName?: string;
  /** Required for public ios registration */
  bundleId?: string;
  externalUserId?: string;
  /** Authenticated only — rejected on public path */
  contactId?: string;
};

export type RegisterDeviceResponse = {
  success: true;
  data: {
    id: string;
    appId: string;
    platform: PushPlatform;
    externalUserId?: string | null;
    contactId?: string | null;
    createdAt: string;
  };
};

export type ApiErrorBody = {
  success: false;
  error: string;
  message?: string;
  code?: string;
};

export type PushSendType = "push" | "template";

export type PushPayloadFields = {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  image?: string;
  data?: Record<string, unknown>;
  templateId?: string;
  variables?: Record<string, unknown>;
};

export type SendPushRequest = {
  to: string[];
  type: PushSendType;
  payload: PushPayloadFields;
  schedule?: { sendAt: string };
  options?: {
    priority?: "high" | "normal" | "low";
    webhook?: { url: string; secret?: string };
    notification?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  localization?: Record<string, unknown>;
  i18n?: Record<string, Record<string, string>>;
};

export type SendPushResponseData = {
  status: "QUEUED" | "SCHEDULED";
  count: number;
  messageIds: string[];
  scheduledAt?: string;
  localization?: {
    appliedAiLocales?: string[];
    fallbackLocales?: string[];
    aiTranslatedRecipientCount?: number;
  };
  sandbox?: boolean;
};

export type SendPushResponse = {
  success: true;
  data: SendPushResponseData;
};

export type PushMessage = {
  id: string;
  deviceId?: string;
  appId?: string;
  type?: PushSendType;
  payload?: PushPayloadFields;
  status?: string;
  scheduledFor?: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  errorMessage?: string;
  clickedAt?: string;
  createdAt?: string;
};

export type PushMessageResponse = {
  success: true;
  data: PushMessage;
};

export type PushPromptConfig = {
  type?: "custom_link" | "floating_button" | "native";
  autoPrompt?: boolean;
  auto_prompt?: boolean;
  showAfterPageviews?: number;
  show_after_pageviews?: number;
  delaySeconds?: number;
  delay_seconds?: number;
  hideIfSubscribed?: boolean;
  hide_if_subscribed?: boolean;
  mainColor?: string;
  main_color?: string;
  accentColor?: string;
  accent_color?: string;
  location?: string;
  size?: string;
  offsetBottom?: number;
  offset_bottom?: number;
  offsetLeft?: number;
  offset_left?: number;
  offsetRight?: number;
  offset_right?: number;
};

export type PushAppConfig = {
  vapidPublicKey: string;
  promptConfig?: PushPromptConfig | null;
};

export type PushIncomingPayload = {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  image?: string;
  logId?: string;
  clickReportUrl?: string;
  deliveryReportUrl?: string;
  data?: Record<string, unknown>;
  action?: string;
};

export const DEFAULT_API_BASE = "https://api.notifique.dev";

export const ERROR_CODES = {
  PACKAGE_NOT_CONFIGURED: "PACKAGE_NOT_CONFIGURED",
  PACKAGE_NOT_ALLOWED: "PACKAGE_NOT_ALLOWED",
  BUNDLE_NOT_CONFIGURED: "BUNDLE_NOT_CONFIGURED",
  BUNDLE_NOT_ALLOWED: "BUNDLE_NOT_ALLOWED",
  ORIGINS_NOT_CONFIGURED: "ORIGINS_NOT_CONFIGURED",
  ORIGIN_NOT_ALLOWED: "ORIGIN_NOT_ALLOWED",
  CONTACT_ID_REQUIRES_AUTH: "CONTACT_ID_REQUIRES_AUTH",
  PLATFORM_NOT_CONFIGURED: "PLATFORM_NOT_CONFIGURED",
} as const;

function trimBase(apiBase = DEFAULT_API_BASE): string {
  return apiBase.replace(/\/+$/, "");
}

export function devicesRegisterUrl(apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/devices`;
}

export function appsConfigUrl(appId: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/apps/${encodeURIComponent(appId)}/config`;
}

export function appsPublicKeyUrl(appId: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/apps/${encodeURIComponent(appId)}/public-key`;
}

export function subscribePopupUrl(
  appId: string,
  origin: string,
  apiBase = DEFAULT_API_BASE,
): string {
  const base = trimBase(apiBase);
  const params = new URLSearchParams({
    appId,
    origin,
  });
  return `${base}/v1/push/subscribe?${params.toString()}`;
}

export function eventsClickUrl(apiBase = DEFAULT_API_BASE, logId?: string): string {
  const base = `${trimBase(apiBase)}/v1/push/events/click`;
  if (!logId) return base;
  return `${base}?log_id=${encodeURIComponent(logId)}`;
}

export function eventsDeliveredUrl(apiBase = DEFAULT_API_BASE, logId?: string): string {
  const base = `${trimBase(apiBase)}/v1/push/events/delivered`;
  if (!logId) return base;
  return `${base}?log_id=${encodeURIComponent(logId)}`;
}

export function messagesSendUrl(apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/messages`;
}

export function appsUrl(apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/apps`;
}

export function appUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/apps/${encodeURIComponent(id)}`;
}

export function deviceUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/devices/${encodeURIComponent(id)}`;
}

export function messageUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/messages/${encodeURIComponent(id)}`;
}

export function messageCancelUrl(id: string, apiBase = DEFAULT_API_BASE): string {
  return `${trimBase(apiBase)}/v1/push/messages/${encodeURIComponent(id)}/cancel`;
}

export function buildAndroidRegisterBody(input: {
  appId: string;
  token: string;
  packageName: string;
  externalUserId?: string;
}): RegisterDeviceRequest {
  return {
    appId: input.appId,
    platform: "android",
    token: input.token,
    packageName: input.packageName,
    ...(input.externalUserId ? { externalUserId: input.externalUserId } : {}),
  };
}

export function buildIosRegisterBody(input: {
  appId: string;
  token: string;
  bundleId: string;
  externalUserId?: string;
}): RegisterDeviceRequest {
  return {
    appId: input.appId,
    platform: "ios",
    token: input.token,
    bundleId: input.bundleId,
    ...(input.externalUserId ? { externalUserId: input.externalUserId } : {}),
  };
}

export function buildSendPushBody(request: SendPushRequest): SendPushRequest {
  return {
    to: request.to,
    type: request.type,
    payload: { ...request.payload },
    ...(request.schedule ? { schedule: request.schedule } : {}),
    ...(request.options ? { options: request.options } : {}),
    ...(request.metadata ? { metadata: request.metadata } : {}),
    ...(request.localization ? { localization: request.localization } : {}),
    ...(request.i18n ? { i18n: request.i18n } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Extracts log_id from FCM/APNs data maps (all values may be strings). */
export function extractLogId(data: Record<string, unknown>): string | undefined {
  const direct = pickString(data, ["log_id", "logId", "push_id", "pushId"]);
  if (direct) return direct;
  for (const value of Object.values(data)) {
    if (typeof value === "string" && value.includes("log_id=")) {
      const match = value.match(/log_id=([^&]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

/** Parses incoming push payload from Web Push JSON or mobile data maps. */
export function parseIncomingPushPayload(raw: unknown): PushIncomingPayload {
  const record = asRecord(raw);
  if (!record) return {};

  const data = asRecord(record.data) ?? {};
  const mergedData = { ...data };
  for (const [key, value] of Object.entries(record)) {
    if (key !== "data" && key !== "title" && key !== "body" && key !== "url" && key !== "icon" && key !== "image") {
      mergedData[key] = value;
    }
  }

  const logId =
    extractLogId(mergedData) ??
    pickString(record, ["log_id", "logId"]) ??
    undefined;

  const url =
    pickString(record, ["url"]) ??
    pickString(mergedData, ["url"]) ??
    undefined;

  const clickReportUrl =
    pickString(mergedData, ["click_report_url", "clickReportUrl"]) ?? undefined;
  const deliveryReportUrl =
    pickString(mergedData, ["delivery_report_url", "deliveryReportUrl"]) ?? undefined;

  return {
    title: pickString(record, ["title"]),
    body: pickString(record, ["body"]),
    url,
    icon: pickString(record, ["icon"]),
    image: pickString(record, ["image"]),
    logId,
    clickReportUrl,
    deliveryReportUrl,
    data: mergedData,
  };
}

export function buildReportClickBody(logId: string, action = "default"): { log_id: string; action: string } {
  return { log_id: logId, action };
}

export function buildReportDeliveredBody(logId: string): { log_id: string } {
  return { log_id: logId };
}

export function parseApiError(raw: unknown): ApiErrorBody | null {
  const record = asRecord(raw);
  if (!record || record.success !== false) return null;
  return {
    success: false,
    error: typeof record.error === "string" ? record.error : "Error",
    message: typeof record.message === "string" ? record.message : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

export function parseAppConfigResponse(raw: unknown): PushAppConfig | null {
  const record = asRecord(raw);
  if (!record || record.success !== true) return null;
  const vapid =
    pickString(record, ["vapidPublicKey", "vapid_public_key"]) ?? undefined;
  if (!vapid) return null;
  const promptRaw = record.promptConfig ?? record.prompt_config;
  const promptConfig =
    promptRaw === null ? null : (asRecord(promptRaw) as PushPromptConfig | undefined);
  return {
    vapidPublicKey: vapid,
    promptConfig: promptConfig ?? null,
  };
}
