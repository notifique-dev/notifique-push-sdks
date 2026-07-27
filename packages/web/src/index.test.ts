import { describe, expect, it, vi } from "vitest";
import { registerSubscription } from "./index";

describe("registerSubscription", () => {
  it("posts web platform without API key or contactId", async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.platform).toBe("web");
      expect(body.appId).toBe("app1");
      expect(body.subscription.endpoint).toBe("https://push.example/endpoint");
      expect(body.contactId).toBeUndefined();
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      return {
        ok: true,
        json: async () => ({ success: true, data: { id: "dev1" } }),
      } as Response;
    });

    const fakeSub = {
      endpoint: "https://push.example/endpoint",
      getKey: (name: string) => new TextEncoder().encode(name === "p256dh" ? "p256" : "auth"),
    } as unknown as PushSubscription;

    const id = await registerSubscription(fakeSub, { appId: "app1" }, fetchImpl as unknown as typeof fetch);
    expect(id).toBe("dev1");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
