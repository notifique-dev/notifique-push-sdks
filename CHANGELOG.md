# Changelog

## 0.2.0 (2026-08-17)

Full parity with Notifique Push API and hosted web script.

### Added

- `@notifique/push-server` — complete authenticated API client (apps, devices, messages)
- Web: popup subscribe, `isSubscribed`, `openSubscribePopup`, embedded SW, `promptConfig`, click/delivered reporting
- Mobile: `reportClick`, `handleNotificationOpen`, `parsePushPayload`, `notificationOpened` events
- Flutter `FirebasePushMessaging.attachOpenHandlers()`
- RN `attachNotificationOpenHandler()`

### Changed

- Server client supports `Authorization: Bearer` and `x-api-key`
- Send contract: `to` + `type` + `payload` → `messageIds` only in SDK types


## 0.1.0 (2026-07-27)

First public release of Notifique client Push SDKs.

### Added

- `@notifique/push` (Web)
- `@notifique/push-react-native`
- `notifique_push` (Flutter)
- `dev.notifique:push` (Android / Kotlin)
- `NotifiquePush` (iOS / Swift Package Manager)
- Shared `@notifique/push-protocol` fixtures and types
- Public device registration with `appId` only; Android `packageName` / iOS `bundleId` allowlists
- SECURITY.md, CI, manual publish workflow

### Security

- No API Keys in client SDKs
- `contactId` must be linked from an authenticated backend
