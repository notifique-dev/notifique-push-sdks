# Release 0.1.0

## Gates (must be green)

- [x] Backend public-register security tests
- [x] `packages/protocol` build + test
- [x] `packages/web` vitest + build
- [x] `packages/android` `./gradlew test`
- [x] `packages/ios` `swift test`
- [x] `packages/flutter` `flutter test`
- [x] `packages/react-native` `npm test`
- [x] Docs PT/EN/ES updated for SDKs
- [x] Dashboard snippets updated

## Publish commands

Requires secrets: `NPM_TOKEN`, pub.dev credentials, Maven signing (Android), GitHub for SPM tag.

```bash
# Tag
git tag v0.1.0
git push origin v0.1.0

# npm (web + RN) — dry-run first
cd packages/web && npm publish --dry-run --access public
cd packages/react-native && npm publish --dry-run --access public

# Flutter
cd packages/flutter && dart pub publish --dry-run

# iOS SPM: consumers add the GitHub repo + tag ios-v0.1.0 or v0.1.0
# Android: publish Maven from packages/android when signing is configured
```

GitHub Actions: `.github/workflows/publish.yml` with input `PUBLISH` after checking out the tag.
