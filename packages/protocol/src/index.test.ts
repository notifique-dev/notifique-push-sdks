import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAndroidRegisterBody,
  buildIosRegisterBody,
  devicesRegisterUrl,
  ERROR_CODES,
} from "./index.js";

test("devicesRegisterUrl strips trailing slash", () => {
  assert.equal(devicesRegisterUrl("https://api.notifique.dev/"), "https://api.notifique.dev/v1/push/devices");
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

test("error codes stable", () => {
  assert.equal(ERROR_CODES.CONTACT_ID_REQUIRES_AUTH, "CONTACT_ID_REQUIRES_AUTH");
});
