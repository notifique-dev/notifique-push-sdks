# Changelog

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
