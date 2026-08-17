import assert from "node:assert/strict";
import test from "node:test";
import { PushClient } from "./index.js";

test("PushClient.send uses canonical body and parses messageIds", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        success: true,
        data: { status: "QUEUED", count: 1, messageIds: ["clmsg1"] },
      }),
      { status: 202, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new PushClient({
    apiKey: "sk_test_abc",
    apiBase: "https://api.test.notifique",
    fetch: fetchMock as typeof fetch,
  });

  const result = await client.send({
    to: ["dev1"],
    type: "push",
    payload: { title: "Hi", body: "There", url: "https://example.com" },
  });

  assert.equal(result.data.messageIds[0], "clmsg1");
  const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
  assert.equal(body.title, undefined);
  assert.equal(body.pushIds, undefined);
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer sk_test_abc");
});

test("PushClient supports x-api-key header", async () => {
  let header = "";
  const client = new PushClient({
    apiKey: "sk_test_abc",
    useXApiKeyHeader: true,
    fetch: async (_input, init) => {
      header = (init?.headers as Record<string, string>)["x-api-key"];
      return new Response(JSON.stringify({ success: true, data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } }), { status: 200 });
    },
  });
  await client.listApps();
  assert.equal(header, "sk_test_abc");
});

test("PushClient.listMessages", async () => {
  const client = new PushClient({
    apiKey: "sk_test_abc",
    apiBase: "https://api.test.notifique",
    fetch: async (input) => {
      assert.equal(String(input), "https://api.test.notifique/v1/push/messages?status=SENT&appId=app1");
      return new Response(
        JSON.stringify({
          success: true,
          data: [{ id: "m1", status: "SENT" }],
          pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
        { status: 200 },
      );
    },
  });
  const result = await client.listMessages({ status: "SENT", appId: "app1" });
  assert.equal(result.data[0]?.id, "m1");
});

test("PushClient apps and devices CRUD paths", async () => {
  const urls: string[] = [];
  const client = new PushClient({
    apiKey: "sk_test_abc",
    apiBase: "https://api.test.notifique",
    fetch: async (input, init) => {
      urls.push(`${init?.method ?? "GET"} ${String(input)}`);
      const path = String(input);
      if (path.includes("/apps") && init?.method === "POST") {
        return new Response(JSON.stringify({ success: true, data: { id: "app1", name: "App" } }), { status: 200 });
      }
      if (path.includes("/devices/dev1") && init?.method === "DELETE") {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, data: {}, pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } }), { status: 200 });
    },
  });

  await client.createApp({ name: "App" });
  await client.deleteDevice("dev1");
  assert.ok(urls.some((u) => u.startsWith("POST") && u.includes("/v1/push/apps")));
  assert.ok(urls.some((u) => u.startsWith("DELETE") && u.includes("/devices/dev1")));
});
