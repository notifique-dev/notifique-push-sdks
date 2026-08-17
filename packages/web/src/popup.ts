export type WebSubscriptionPayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type Deferred<T> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

let popupDeferred: Deferred<string> | null = null;
let popupCheckClosed: ReturnType<typeof setInterval> | null = null;
let popupListenerSetup = false;
let subscriptionHandler: ((subscription: WebSubscriptionPayload) => Promise<string>) | null = null;
let apiOriginForListener = "";

export function subscribePopupUrl(appId: string, origin: string, apiBase: string): string {
  const params = new URLSearchParams({ appId, origin });
  return `${apiBase.replace(/\/$/, "")}/v1/push/subscribe?${params.toString()}`;
}

export function configurePopupHandler(
  apiOrigin: string,
  onSubscription: (subscription: WebSubscriptionPayload) => Promise<string>,
): void {
  apiOriginForListener = apiOrigin;
  subscriptionHandler = onSubscription;
  setupPopupMessageListener();
}

function setupPopupMessageListener(): void {
  if (typeof window === "undefined" || popupListenerSetup) return;
  popupListenerSetup = true;
  window.addEventListener("message", (event) => {
    if (event.origin !== apiOriginForListener || !event.data || event.data.type !== "ZENVIO_SUBSCRIBE_SUCCESS") {
      return;
    }
    if (!popupDeferred || !subscriptionHandler) return;
    const payload = event.data.subscription as WebSubscriptionPayload | undefined;
    if (!payload?.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) return;
    if (popupCheckClosed) {
      clearInterval(popupCheckClosed);
      popupCheckClosed = null;
    }
    const deferred = popupDeferred;
    popupDeferred = null;
    subscriptionHandler(payload)
      .then((deviceId) => deferred.resolve(deviceId))
      .catch((err) => deferred.reject(err));
  });
}

export function openSubscribePopup(appId: string, apiBase: string): Promise<string> {
  const origin =
    typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const url = subscribePopupUrl(appId, origin, apiBase);
  const popup = window.open(url, "notifique_push_subscribe", "width=420,height=400,scrollbars=no");
  if (!popup) {
    return Promise.reject(new Error("Popup blocked. Allow popups for this site and try again."));
  }
  return new Promise<string>((resolve, reject) => {
    popupDeferred = { resolve, reject };
    popupCheckClosed = setInterval(() => {
      if (popup.closed && popupDeferred) {
        clearInterval(popupCheckClosed!);
        popupCheckClosed = null;
        const deferred = popupDeferred;
        popupDeferred = null;
        deferred.reject(new Error("Popup closed without completing."));
      }
    }, 500);
  });
}

export function resetPopupStateForTests(): void {
  if (popupCheckClosed) clearInterval(popupCheckClosed);
  popupCheckClosed = null;
  popupDeferred = null;
  popupListenerSetup = false;
  subscriptionHandler = null;
  apiOriginForListener = "";
}
