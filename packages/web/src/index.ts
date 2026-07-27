export type NotifiquePushInitOptions = {
  appId: string;
  apiBase?: string;
  swPath?: string;
  externalUserId?: string | null;
  autoRequestPermission?: boolean;
};

export type PermissionStatus = NotificationPermission | "unsupported";

type Listener = (payload?: unknown) => void;

const DEFAULT_API_BASE = "https://api.notifique.dev";

let options: NotifiquePushInitOptions | null = null;
let deviceId: string | null = null;
const listeners = new Map<string, Set<Listener>>();

function emit(type: string, payload?: unknown) {
  const set = listeners.get(type);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(payload);
    } catch {
      /* ignore listener errors */
    }
  }
}

function apiBase(): string {
  return (options?.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function subscriptionToPayload(subscription: PushSubscription) {
  const key = (name: "p256dh" | "auth") => {
    const buf = subscription.getKey(name);
    if (!buf) return "";
    const arr = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]!);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: key("p256dh"), auth: key("auth") },
  };
}

export async function registerSubscription(
  subscription: PushSubscription,
  opts: { appId: string; apiBase?: string; externalUserId?: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const body: Record<string, unknown> = {
    appId: opts.appId,
    platform: "web",
    subscription: subscriptionToPayload(subscription),
  };
  if (opts.externalUserId) body.externalUserId = opts.externalUserId;

  const res = await fetchImpl(`${(opts.apiBase || DEFAULT_API_BASE).replace(/\/$/, "")}/v1/push/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { success?: boolean; data?: { id?: string }; message?: string; code?: string };
  if (!res.ok || !json.success || !json.data?.id) {
    throw new Error(json.message || json.code || `Register failed (${res.status})`);
  }
  return json.data.id;
}

export const NotifiquePush = {
  async init(opts: NotifiquePushInitOptions): Promise<void> {
    if (!opts?.appId?.trim()) throw new Error("appId is required");
    options = { ...opts, appId: opts.appId.trim() };
    if (opts.autoRequestPermission !== false && typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        await this.requestPermissionAndRegister();
      }
    }
  },

  addEventListener(type: string, handler: Listener): void {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(handler);
  },

  removeEventListener(type: string, handler: Listener): void {
    listeners.get(type)?.delete(handler);
  },

  getPermissionStatus(): PermissionStatus {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  },

  getDeviceId(): string | null {
    return deviceId;
  },

  async requestPermission(): Promise<PermissionStatus> {
    if (typeof Notification === "undefined") return "unsupported";
    const status = await Notification.requestPermission();
    emit("permission", status);
    return status;
  },

  async requestPermissionAndRegister(): Promise<string | null> {
    if (!options) throw new Error("Call NotifiquePush.init first");
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      emit("error", new Error("Push not supported"));
      return null;
    }
    const permission = await this.requestPermission();
    if (permission !== "granted") return null;

    const swPath = options.swPath || "/sw.js";
    const reg = await navigator.serviceWorker.register(swPath);
    await navigator.serviceWorker.ready;

    const configRes = await fetch(`${apiBase()}/v1/push/apps/${encodeURIComponent(options.appId)}/config`);
    const configJson = (await configRes.json()) as {
      success?: boolean;
      vapidPublicKey?: string;
      vapid_public_key?: string;
      message?: string;
    };
    const vapid = configJson.vapidPublicKey || configJson.vapid_public_key;
    if (!configJson.success || !vapid) {
      throw new Error(configJson.message || "Push app config not found");
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapid) as BufferSource,
      });
    }

    deviceId = await registerSubscription(sub, {
      appId: options.appId,
      apiBase: apiBase(),
      externalUserId: options.externalUserId,
    });
    emit("registered", { deviceId });
    return deviceId;
  },

  async setExternalUserId(id: string | null): Promise<string | null> {
    if (!options) throw new Error("Call NotifiquePush.init first");
    options.externalUserId = id;
    return this.requestPermissionAndRegister();
  },

  async unregister(): Promise<void> {
    deviceId = null;
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration(options?.swPath || "/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
    }
  },
};

export default NotifiquePush;
