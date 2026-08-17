import { EMBEDDED_SW_SOURCE } from "./sw";
import { parsePushPayload, type PushIncomingPayload } from "./payload";
import {
  configurePopupHandler,
  openSubscribePopup,
  resetPopupStateForTests,
  type WebSubscriptionPayload,
} from "./popup";

export type NotifiquePushInitOptions = {
  appId: string;
  apiBase?: string;
  swPath?: string;
  externalUserId?: string | null;
  autoRequestPermission?: boolean;
};

export type PermissionStatus = NotificationPermission | "unsupported";

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

type Listener = (payload?: unknown) => void;

export const DEFAULT_API_BASE = "https://api.notifique.dev";

let options: NotifiquePushInitOptions | null = null;
let deviceId: string | null = null;
let cachedAppConfig: PushAppConfig | null = null;
let swBlobUrl: string | null = null;
let apiOrigin = DEFAULT_API_BASE;
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

export async function getAppConfig(
  appId: string,
  apiBaseUrl = DEFAULT_API_BASE,
  fetchImpl: typeof fetch = fetch,
): Promise<PushAppConfig> {
  const res = await fetchImpl(
    `${apiBaseUrl.replace(/\/$/, "")}/v1/push/apps/${encodeURIComponent(appId)}/config`,
  );
  const json = (await res.json()) as {
    success?: boolean;
    vapidPublicKey?: string;
    vapid_public_key?: string;
    promptConfig?: PushPromptConfig | null;
    prompt_config?: PushPromptConfig | null;
    message?: string;
    error?: string;
  };
  const vapid = json.vapidPublicKey || json.vapid_public_key;
  if (!res.ok || !json.success || !vapid) {
    throw new Error(json.message || json.error || `Config failed (${res.status})`);
  }
  return {
    vapidPublicKey: vapid,
    promptConfig: json.promptConfig ?? json.prompt_config ?? null,
  };
}

export async function reportClick(
  input: { logId?: string; clickReportUrl?: string; action?: string; apiBase?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const action = input.action ?? "default";
  if (input.clickReportUrl) {
    await fetchImpl(input.clickReportUrl, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => undefined);
    return;
  }
  if (!input.logId) throw new Error("logId or clickReportUrl is required");
  const base = (input.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  await fetchImpl(`${base}/v1/push/events/click?log_id=${encodeURIComponent(input.logId)}`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log_id: input.logId, action }),
  }).catch(() => undefined);
}

export async function reportDelivered(
  input: { logId?: string; deliveryReportUrl?: string; apiBase?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  if (input.deliveryReportUrl) {
    await fetchImpl(input.deliveryReportUrl, { method: "POST", keepalive: true }).catch(() => undefined);
    return;
  }
  if (!input.logId) throw new Error("logId or deliveryReportUrl is required");
  const base = (input.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  await fetchImpl(`${base}/v1/push/events/delivered?log_id=${encodeURIComponent(input.logId)}`, {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({ log_id: input.logId }),
  }).catch(() => undefined);
}

export async function registerWebSubscription(
  subscription: WebSubscriptionPayload,
  opts: { appId: string; apiBase?: string; externalUserId?: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const body: Record<string, unknown> = {
    appId: opts.appId,
    platform: "web",
    subscription,
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

export async function getPublicKey(
  appId: string,
  apiBaseUrl = DEFAULT_API_BASE,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const config = await getAppConfig(appId, apiBaseUrl, fetchImpl);
  return config.vapidPublicKey;
}
export async function registerSubscription(
  subscription: PushSubscription,
  opts: { appId: string; apiBase?: string; externalUserId?: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  return registerWebSubscription(subscriptionToPayload(subscription), opts, fetchImpl);
}

async function resolveSwUrl(): Promise<string> {
  if (options?.swPath) return options.swPath;
  if (swBlobUrl) return swBlobUrl;
  const blob = new Blob([EMBEDDED_SW_SOURCE], { type: "application/javascript" });
  swBlobUrl = URL.createObjectURL(blob);
  return swBlobUrl;
}

function resolveApiOrigin(base: string): string {
  try {
    return new URL(base).origin;
  } catch {
    return base;
  }
}

async function registerViaPopup(): Promise<string> {
  if (!options) throw new Error("Call NotifiquePush.init first");
  return openSubscribePopup(options.appId, apiBase());
}

function isSubscribed(appId: string): boolean {
  try {
    return (
      localStorage.getItem(`notifique_push_subscribed_${appId}`) === "1" ||
      localStorage.getItem(`zenvio_push_subscribed_${appId}`) === "1"
    );
  } catch {
    return false;
  }
}

function markSubscribed(appId: string): void {
  try {
    localStorage.setItem(`notifique_push_subscribed_${appId}`, "1");
  } catch {
    /* ignore */
  }
}

function applyPromptConfig(promptConfig: PushPromptConfig | null | undefined): void {
  if (!promptConfig || typeof document === "undefined") return;
  const type = promptConfig.type || "custom_link";
  const autoPrompt = promptConfig.autoPrompt ?? promptConfig.auto_prompt;
  const showAfterPageviews = Math.max(
    1,
    parseInt(String(promptConfig.showAfterPageviews ?? promptConfig.show_after_pageviews ?? 1), 10) || 1,
  );
  const delaySeconds = Math.max(
    0,
    parseInt(String(promptConfig.delaySeconds ?? promptConfig.delay_seconds ?? 20), 10) || 20,
  );

  if (type === "floating_button") {
    const hideIfSubscribed = promptConfig.hideIfSubscribed ?? promptConfig.hide_if_subscribed;
    if (hideIfSubscribed && options?.appId && isSubscribed(options.appId)) return;
    renderFloatingButton(promptConfig);
    return;
  }

  if (type === "native" && autoPrompt && options?.appId) {
    const key = `notifique_push_pageviews_${options.appId}`;
    const keyDone = `notifique_push_auto_done_${options.appId}`;
    try {
      if (sessionStorage.getItem(keyDone)) return;
      const n = parseInt(sessionStorage.getItem(key) || "0", 10) + 1;
      sessionStorage.setItem(key, String(n));
      if (n >= showAfterPageviews) {
        sessionStorage.setItem(keyDone, "1");
        setTimeout(() => {
          NotifiquePush.requestPermissionAndRegister().catch(() => undefined);
        }, delaySeconds * 1000);
      }
    } catch {
      /* ignore */
    }
  }
}

function renderFloatingButton(promptConfig: PushPromptConfig): void {
  if (typeof document === "undefined") return;
  const sizeMap: Record<string, number> = { small: 32, medium: 44, large: 56 };
  const size = sizeMap[promptConfig.size ?? ""] || 44;
  const mainColor = promptConfig.mainColor ?? promptConfig.main_color ?? "#e54b4d";
  const accentColor = promptConfig.accentColor ?? promptConfig.accent_color ?? "#ffffff";
  const location = promptConfig.location || "bottom-right";
  const bottom = promptConfig.offsetBottom ?? promptConfig.offset_bottom ?? 15;
  const left = promptConfig.offsetLeft ?? promptConfig.offset_left ?? 15;
  const right = promptConfig.offsetRight ?? promptConfig.offset_right ?? 15;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Enable notifications");
  btn.textContent = "🔔";
  btn.style.position = "fixed";
  btn.style.width = `${size}px`;
  btn.style.height = `${size}px`;
  btn.style.borderRadius = "50%";
  btn.style.backgroundColor = mainColor;
  btn.style.color = accentColor;
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "2147483646";
  if (location === "left" || location === "bottom-left") btn.style.left = `${left}px`;
  else btn.style.right = `${right}px`;
  if (location === "left" || location === "right") {
    btn.style.top = "50%";
    btn.style.transform = "translateY(-50%)";
  } else {
    btn.style.bottom = `${bottom}px`;
  }

  btn.addEventListener("click", () => {
    NotifiquePush.requestPermissionAndRegister()
      .then(() => {
        const hide = promptConfig.hideIfSubscribed ?? promptConfig.hide_if_subscribed;
        if (hide && btn.parentNode) btn.parentNode.removeChild(btn);
      })
      .catch(() => undefined);
  });
  document.body.appendChild(btn);
}

export const NotifiquePush = {
  async init(opts: NotifiquePushInitOptions): Promise<void> {
    if (!opts?.appId?.trim()) throw new Error("appId is required");
    options = { ...opts, appId: opts.appId.trim() };
    cachedAppConfig = null;
    apiOrigin = resolveApiOrigin(apiBase());
    configurePopupHandler(apiOrigin, async (subscription) => {
      if (!options) throw new Error("Call NotifiquePush.init first");
      const id = await registerWebSubscription(subscription, {
        appId: options.appId,
        apiBase: apiBase(),
        externalUserId: options.externalUserId,
      });
      markSubscribed(options.appId);
      deviceId = id;
      emit("registered", { deviceId: id });
      return id;
    });

    try {
      cachedAppConfig = await getAppConfig(options.appId, apiBase());
      applyPromptConfig(cachedAppConfig.promptConfig);
    } catch {
      /* prompt config is optional */
    }

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

  isSubscribed(): boolean {
    return options?.appId ? isSubscribed(options.appId) : false;
  },

  async openSubscribePopup(): Promise<string> {
    if (!options) throw new Error("Call NotifiquePush.init first");
    const id = await registerViaPopup();
    deviceId = id;
    return id;
  },

  async getAppConfig(): Promise<PushAppConfig> {
    if (!options) throw new Error("Call NotifiquePush.init first");
    if (!cachedAppConfig) {
      cachedAppConfig = await getAppConfig(options.appId, apiBase());
    }
    return cachedAppConfig;
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

    const appConfig = cachedAppConfig ?? await getAppConfig(options.appId, apiBase());
    cachedAppConfig = appConfig;
    const vapid = appConfig.vapidPublicKey;

    try {
      const swUrl = await resolveSwUrl();
      const regPromise = navigator.serviceWorker.register(swUrl, { scope: "/" });
      if (!regPromise || typeof regPromise.then !== "function") {
        deviceId = await registerViaPopup();
        return deviceId;
      }
      const reg = await regPromise;
      await navigator.serviceWorker.ready;
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
    } catch {
      deviceId = await registerViaPopup();
    }

    markSubscribed(options.appId);
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
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
      }
    }
  },

  async handleNotificationClick(payload: PushIncomingPayload, action = "default"): Promise<void> {
    await reportClick({
      logId: payload.logId,
      clickReportUrl: payload.clickReportUrl,
      action,
      apiBase: apiBase(),
    });
    emit("notificationclick", { payload, action, url: payload.url });
  },

  reportClick,
  reportDelivered,
  parsePushPayload,
};

export { parsePushPayload, type PushIncomingPayload } from "./payload";
export { openSubscribePopup, subscribePopupUrl } from "./popup";
export { EMBEDDED_SW_SOURCE };

export default NotifiquePush;
