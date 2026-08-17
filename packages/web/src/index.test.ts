import { describe, expect, it, vi } from "vitest";
import { parsePushPayload, registerSubscription, reportClick } from "./index";

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

describe("parsePushPayload", () => {
  it("extracts log_id and report urls", () => {
    const parsed = parsePushPayload({
      title: "Hi",
      data: {
        log_id: "log1",
        click_report_url: "https://api.test/click",
      },
    });
    expect(parsed.logId).toBe("log1");
    expect(parsed.clickReportUrl).toBe("https://api.test/click");
  });
});

describe("reportClick", () => {
  it("posts to click_report_url when provided", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    await reportClick({ clickReportUrl: "https://api.test/click", action: "open" }, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({ action: "open" });
  });
});
