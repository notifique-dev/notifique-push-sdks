export const DEFAULT_API_BASE = "https://api.notifique.dev";

export type PushPlatform = "web" | "android" | "ios";

export type PushSendType = "push" | "template";

export type PushMessageStatus =
  | "QUEUED"
  | "SCHEDULED"
  | "SENT"
  | "DELIVERED"
  | "CLICKED"
  | "FAILED"
  | "CANCELLED";

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type ApiErrorBody = {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: unknown;
};

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

export type SendPushResponse = {
  success: true;
  data: {
    status: "QUEUED" | "SCHEDULED";
    count: number;
    messageIds: string[];
    messageId?: string;
    scheduledAt?: string;
    localization?: Record<string, unknown>;
    sandbox?: boolean;
    pushIds?: string[];
  };
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

export type PushApp = {
  id: string;
  name: string;
  workspaceId?: string;
  vapidPublicKey?: string | null;
  hasVapidPrivate?: boolean;
  hasFcm?: boolean;
  hasApns?: boolean;
  androidPackageName?: string | null;
  allowedOrigins?: string[];
  promptConfig?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PushAppCreateRequest = { name: string };

export type PushAppUpdateRequest = {
  name?: string;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  allowedOrigins?: string[];
  promptConfig?: Record<string, unknown> | null;
  fcmProjectId?: string;
  fcmServiceAccountJson?: string;
  androidPackageName?: string;
  apnsKeyId?: string;
  apnsTeamId?: string;
  apnsBundleId?: string;
  apnsKeyP8?: string;
};

export type PushDevice = {
  id: string;
  appId: string;
  platform: PushPlatform;
  externalUserId?: string | null;
  contactId?: string | null;
  createdAt?: string;
};

export type WebSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type RegisterDeviceRequest = {
  appId: string;
  platform: PushPlatform;
  subscription?: WebSubscription;
  token?: string;
  packageName?: string;
  bundleId?: string;
  externalUserId?: string;
  contactId?: string;
};

export type ListMessagesParams = PaginationParams & {
  status?: PushMessageStatus;
  appId?: string;
};

export type ListDevicesParams = PaginationParams & {
  appId?: string;
  platform?: PushPlatform;
};

export type ListResponse<T> = {
  success: true;
  data: T[];
  pagination: Pagination;
};

export type SingleResponse<T> = {
  success: true;
  data: T;
};

export type SuccessResponse = { success: true };

export type PushClientOptions = {
  apiKey: string;
  apiBase?: string;
  fetch?: typeof fetch;
  /** Prefer `x-api-key` header instead of `Authorization: Bearer`. Both are accepted by the API. */
  useXApiKeyHeader?: boolean;
};

export type SendOptions = {
  idempotencyKey?: string;
};
