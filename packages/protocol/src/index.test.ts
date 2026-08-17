import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAndroidRegisterBody,
  buildIosRegisterBody,
  buildReportClickBody,
  buildSendPushBody,
  devicesRegisterUrl,
  eventsClickUrl,
  extractLogId,
  messagesSendUrl,
  parseIncomingPushPayload,
  parseAppConfigResponse,
  ERROR_CODES,
} from "./index.js";

test("devicesRegisterUrl strips trailing slash", () => {
  assert.equal(
    devicesRegisterUrl("https://api.notifique.dev/"),
    "https://api.notifique.dev/v1/push/devices",
  );
});

test("buildAndroidRegisterBody", () => {
  const body = buildAndroidRegisterBody({
    appId: "app1",
    token: "tok",
    packageName: "com.example",
  });
  assert.equal(body.platform, "android");
  assert.equal(body.packageName, "com.example");
  assert.equal(body.contactId, undefined);
});

test("buildIosRegisterBody", () => {
  const body = buildIosRegisterBody({
    appId: "app1",
    token: "aabb",
    bundleId: "com.example",
  });
  assert.equal(body.platform, "ios");
  assert.equal(body.bundleId, "com.example");
});

test("buildSendPushBody keeps canonical payload", () => {
  const body = buildSendPushBody({
    to: ["dev1"],
    type: "push",
    payload: { title: "Hi", body: "There" },
  });
  assert.deepEqual(body.to, ["dev1"]);
  assert.equal(body.type, "push");
  assert.equal(body.payload.title, "Hi");
  assert.equal((body as Record<string, unknown>).title, undefined);
});

test("parseIncomingPushPayload from web push json", () => {
  const parsed = parseIncomingPushPayload({
    title: "Hello",
    body: "World",
    url: "https://example.com",
    data: {
      log_id: "log1",
      click_report_url: "https://api.notifique.dev/v1/push/events/click?log_id=log1",
      delivery_report_url: "https://api.notifique.dev/v1/push/events/delivered?log_id=log1",
    },
  });
  assert.equal(parsed.title, "Hello");
  assert.equal(parsed.logId, "log1");
  assert.equal(parsed.clickReportUrl?.includes("click"), true);
});

test("extractLogId from fcm data", () => {
  assert.equal(extractLogId({ log_id: "abc" }), "abc");
  assert.equal(extractLogId({ logId: "def" }), "def");
});

test("eventsClickUrl with log id", () => {
  assert.equal(
    eventsClickUrl("https://api.notifique.dev", "log1"),
    "https://api.notifique.dev/v1/push/events/click?log_id=log1",
  );
});

test("messagesSendUrl", () => {
  assert.equal(messagesSendUrl(), "https://api.notifique.dev/v1/push/messages");
});

test("parseAppConfigResponse", () => {
  const config = parseAppConfigResponse({
    success: true,
    vapidPublicKey: "key",
    promptConfig: { type: "native" },
  });
  assert.equal(config?.vapidPublicKey, "key");
  assert.equal(config?.promptConfig?.type, "native");
});

test("buildReportClickBody", () => {
  assert.deepEqual(buildReportClickBody("log1"), { log_id: "log1", action: "default" });
});

test("error codes stable", () => {
  assert.equal(ERROR_CODES.CONTACT_ID_REQUIRES_AUTH, "CONTACT_ID_REQUIRES_AUTH");
});
