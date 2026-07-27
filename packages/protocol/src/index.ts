/** Shared types for Notifique Push device registration (client SDKs). */

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

export function devicesRegisterUrl(apiBase = DEFAULT_API_BASE): string {
  return `${apiBase.replace(/\/$/, "")}/v1/push/devices`;
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
