/** Official Notifique Push SDK for React Native. */

export type PermissionStatus = "granted" | "denied" | "unknown";

export type PushPlatform = "android" | "ios";

export type PushEvent =
  | { type: "registered"; deviceId: string }
  | { type: "unregistered"; deviceId: string | null }
  | { type: "permissionChanged"; status: PermissionStatus }
  | { type: "error"; message: string; cause?: unknown };

export type PushEventListener = (event: PushEvent) => void;

export interface PushMessaging {
  requestPermission(): Promise<PermissionStatus>;
  getPermissionStatus(): Promise<PermissionStatus>;
  getToken(): Promise<string | null | undefined>;
  onTokenRefresh?(callback: (token: string) => void): () => void;
}

export interface InitOptions {
  appId: string;
  apiBase?: string;
  autoRequestPermission?: boolean;
  /** Required for Android public registration when not inferred. */
  packageName?: string;
  /** Required for iOS public registration when not inferred. */
  bundleId?: string;
  /** Injectable messaging (Firebase / Expo). Required for auto token fetch. */
  messaging?: PushMessaging;
  /** Injectable fetch for tests. */
  fetch?: typeof fetch;
  /** Injectable platform detector for tests. */
  getPlatform?: () => PushPlatform;
}

export const DEFAULT_API_BASE = "https://api.notifique.dev";

type State = {
  appId: string | null;
  apiBase: string;
  autoRequestPermission: boolean;
  externalUserId: string | null;
  deviceId: string | null;
  permissionStatus: PermissionStatus;
  packageName: string | null;
  bundleId: string | null;
  messaging: PushMessaging | null;
  fetchImpl: typeof fetch;
  getPlatform: () => PushPlatform;
  initialized: boolean;
  listeners: Set<PushEventListener>;
  unsubscribeTokenRefresh: (() => void) | null;
};

const state: State = {
  appId: null,
  apiBase: DEFAULT_API_BASE,
  autoRequestPermission: true,
  externalUserId: null,
  deviceId: null,
  permissionStatus: "unknown",
  packageName: null,
  bundleId: null,
  messaging: null,
  fetchImpl: globalThis.fetch.bind(globalThis),
  getPlatform: () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Platform } = require("react-native") as {
        Platform: { OS: string };
      };
      return Platform.OS === "ios" ? "ios" : "android";
    } catch {
      return "android";
    }
  },
  initialized: false,
  listeners: new Set(),
  unsubscribeTokenRefresh: null,
};

function emit(event: PushEvent): void {
  for (const listener of state.listeners) {
    try {
      listener(event);
    } catch {
      // ignore listener errors
    }
  }
}

function ensureInitialized(): void {
  if (!state.initialized) {
    throw new Error("Call NotifiquePush.init(...) before using the SDK");
  }
}

function trimBase(base: string): string {
  return base.replace(/\/+$/, "");
}

async function registerCurrentToken(): Promise<void> {
  const messaging = state.messaging;
  if (!messaging) return;
  const token = await messaging.getToken();
  if (!token) return;
  await register(token);
}

/**
 * Registers a push token with the public devices endpoint.
 * Never sends `contactId` or API keys.
 */
export async function register(token: string): Promise<string> {
  ensureInitialized();
  const trimmed = token.trim();
  if (!trimmed) throw new Error("token is required");

  const platform = state.getPlatform();
  const body: Record<string, string> = {
    appId: state.appId!,
    platform,
    token: trimmed,
  };

  if (platform === "ios") {
    if (!state.bundleId) {
      throw new Error("bundleId is required for iOS registration");
    }
    body.bundleId = state.bundleId;
  } else {
    if (!state.packageName) {
      throw new Error("packageName is required for Android registration");
    }
    body.packageName = state.packageName;
  }

  if (state.externalUserId) {
    body.externalUserId = state.externalUserId;
  }

  const response = await state.fetchImpl(
    `${state.apiBase}/v1/push/devices`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const raw = await response.text();
  let json: {
    success?: boolean;
    data?: { id?: string };
    message?: string;
    error?: string;
  } = {};
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    // ignore
  }

  if (!response.ok) {
    throw new Error(
      json.message || json.error || `Registration failed (${response.status})`,
    );
  }
  if (!json.success || !json.data?.id) {
    throw new Error(
      json.message ||
        json.error ||
        "Registration succeeded but device id was missing",
    );
  }

  state.deviceId = json.data.id;
  state.permissionStatus = "granted";
  emit({ type: "registered", deviceId: json.data.id });
  return json.data.id;
}

export const NotifiquePush = {
  async init(options: InitOptions): Promise<void> {
    const appId = options.appId?.trim();
    if (!appId) throw new Error("appId is required");

    state.appId = appId;
    state.apiBase = trimBase(options.apiBase ?? DEFAULT_API_BASE);
    state.autoRequestPermission = options.autoRequestPermission ?? true;
    state.messaging = options.messaging ?? null;
    state.fetchImpl =
      options.fetch ?? globalThis.fetch.bind(globalThis);
    state.getPlatform = options.getPlatform ?? state.getPlatform;
    state.packageName = options.packageName?.trim() || null;
    state.bundleId = options.bundleId?.trim() || null;
    state.initialized = true;

    state.unsubscribeTokenRefresh?.();
    state.unsubscribeTokenRefresh = null;
    if (state.messaging?.onTokenRefresh) {
      state.unsubscribeTokenRefresh = state.messaging.onTokenRefresh((token) => {
        void register(token).catch((err: unknown) => {
          emit({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
            cause: err,
          });
        });
      });
    }

    if (state.autoRequestPermission) {
      try {
        await NotifiquePush.requestPermission();
      } catch (err: unknown) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
          cause: err,
        });
      }
    }
  },

  async requestPermission(): Promise<PermissionStatus> {
    ensureInitialized();
    const status = state.messaging
      ? await state.messaging.requestPermission()
      : "granted";
    state.permissionStatus = status;
    emit({ type: "permissionChanged", status });
    if (status === "granted") {
      await registerCurrentToken();
    }
    return status;
  },

  async getPermissionStatus(): Promise<PermissionStatus> {
    if (state.messaging) {
      state.permissionStatus = await state.messaging.getPermissionStatus();
    }
    return state.permissionStatus;
  },

  getDeviceId(): string | null {
    return state.deviceId;
  },

  async setExternalUserId(id?: string | null): Promise<void> {
    state.externalUserId = id?.trim() ? id.trim() : null;
    if (state.initialized && state.permissionStatus === "granted") {
      try {
        await registerCurrentToken();
      } catch (err: unknown) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
          cause: err,
        });
      }
    }
  },

  async unregister(): Promise<void> {
    ensureInitialized();
    const previous = state.deviceId;
    state.deviceId = null;
    emit({ type: "unregistered", deviceId: previous });
  },

  addEventListener(listener: PushEventListener): () => void {
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  },

  register,

  /** @internal */
  resetForTests(): void {
    state.unsubscribeTokenRefresh?.();
    state.unsubscribeTokenRefresh = null;
    state.appId = null;
    state.apiBase = DEFAULT_API_BASE;
    state.autoRequestPermission = true;
    state.externalUserId = null;
    state.deviceId = null;
    state.permissionStatus = "unknown";
    state.packageName = null;
    state.bundleId = null;
    state.messaging = null;
    state.fetchImpl = globalThis.fetch.bind(globalThis);
    state.getPlatform = () => "android";
    state.initialized = false;
    state.listeners.clear();
  },
};

export default NotifiquePush;
