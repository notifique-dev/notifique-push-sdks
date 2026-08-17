import { NotifiquePush, type PushMessaging } from "./index";

describe("NotifiquePush", () => {
  afterEach(() => {
    NotifiquePush.resetForTests();
  });

  it("registers android device with packageName and without contactId", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];

    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "clxxdevice_example",
            appId: "clxxapp_example",
            platform: "android",
            createdAt: "2026-07-27T12:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const messaging: PushMessaging = {
      requestPermission: async () => "granted",
      getPermissionStatus: async () => "granted",
      getToken: async () => "fcm-token-example",
    };

    await NotifiquePush.init({
      appId: "clxxapp_example",
      apiBase: "https://api.test.notifique",
      autoRequestPermission: false,
      packageName: "com.example.app",
      messaging,
      fetch: fetchMock,
      getPlatform: () => "android",
    });

    const deviceId = await NotifiquePush.register("fcm-token-example");
    expect(deviceId).toBe("clxxdevice_example");
    expect(NotifiquePush.getDeviceId()).toBe("clxxdevice_example");

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "https://api.test.notifique/v1/push/devices",
    );
    expect(calls[0].init?.method).toBe("POST");

    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();

    const body = JSON.parse(String(calls[0].init?.body)) as Record<
      string,
      unknown
    >;
    expect(body.platform).toBe("android");
    expect(body.packageName).toBe("com.example.app");
    expect(body.token).toBe("fcm-token-example");
    expect(body.appId).toBe("clxxapp_example");
    expect(body).not.toHaveProperty("contactId");
    expect(body).not.toHaveProperty("apiKey");
  });

  it("registers ios device with bundleId and without contactId", async () => {
    let body: Record<string, unknown> = {};

    const fetchMock: typeof fetch = async (_input, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "clxxdevice_ios_example",
            appId: "clxxapp_example",
            platform: "ios",
            createdAt: "2026-07-27T12:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    await NotifiquePush.init({
      appId: "clxxapp_example",
      apiBase: "https://api.test.notifique",
      autoRequestPermission: false,
      bundleId: "com.example.app",
      fetch: fetchMock,
      getPlatform: () => "ios",
    });

    await NotifiquePush.register("aabbccddeeff00112233445566778899");

    expect(body.platform).toBe("ios");
    expect(body.bundleId).toBe("com.example.app");
    expect(body).not.toHaveProperty("packageName");
    expect(body).not.toHaveProperty("contactId");
  });

  it("reports click via public endpoint", async () => {
    const urls: string[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await NotifiquePush.init({
      appId: "clxxapp_example",
      apiBase: "https://api.test.notifique",
      autoRequestPermission: false,
      fetch: fetchMock,
    });

    await NotifiquePush.reportClick({ logId: "log1", action: "default" });
    expect(urls[0]).toContain("/v1/push/events/click");
    expect(urls[0]).toContain("log_id=log1");
  });

  it("handleNotificationOpen emits notificationOpened", async () => {
    const events: string[] = [];
    await NotifiquePush.init({
      appId: "clxxapp_example",
      apiBase: "https://api.test.notifique",
      autoRequestPermission: false,
      fetch: async () =>
        new Response(JSON.stringify({ success: true }), { status: 200 }),
    });
    NotifiquePush.addEventListener((event) => {
      if (event.type === "notificationOpened") events.push("opened");
    });
    await NotifiquePush.handleNotificationOpen({ log_id: "log1", url: "https://example.com" });
    expect(events).toEqual(["opened"]);
  });
});
