# Security Policy (Notifique Push SDKs)

## Client security model

- SDKs register devices with **only the public `appId`**. Never embed `sk_live_` / `sk_test_` API Keys in mobile or web apps.
- Public registration is protected by:
  - **Web:** `allowedOrigins` on the Push App
  - **Android:** `packageName` must match `androidPackageName` on the Push App
  - **iOS:** `bundleId` must match `apnsBundleId` on the Push App
  - Rate limits per IP and per app
- **`contactId` (CRM)** requires an authenticated API Key from **your backend**. SDKs only support `externalUserId`.

## Reporting a vulnerability

Email security@notifique.dev (or open a private security advisory on the GitHub repo). Do not file public issues for exploitable bugs.

## Secrets

Never commit:

- Firebase service account JSON
- APNs `.p8` keys
- API Keys
- `google-services.json` / `GoogleService-Info.plist` from real projects in examples (use placeholders)
