# Manual E2E checklist (staging)

Use a real device and `sk_live_` staging key. Do not run against production customer data.

1. Create Push App; set `androidPackageName` and/or `apnsBundleId`; paste FCM/APNs credentials.
2. Web: set `allowedOrigins`; serve `/sw.js`; `NotifiquePush.init({ appId })`; accept permission; confirm device in dashboard.
3. Android: install sample with Firebase; `NotifiquePush.init`; confirm device; send test push from dashboard.
4. iOS: physical device; SPM SDK; confirm APNs token registered; send test push (`apnsProduction` matching build).
5. Flutter / RN: same as native credentials; `init(appId)`; verify platform and package/bundle fields.
6. Confirm public `contactId` is rejected (`CONTACT_ID_REQUIRES_AUTH`).
7. Confirm wrong `packageName` / `bundleId` is rejected.
8. Confirm sandbox `sk_test_` send is simulated only (no real delivery).
