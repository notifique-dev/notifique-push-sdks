# Contribuindo

Obrigado por ajudar a melhorar os SDKs de push da Notifique.

## Antes de abrir um PR

1. Leia a documentação em [docs.notifique.dev/push-api/integracao](https://docs.notifique.dev/push-api/integracao).
2. Mantenha a API pública alinhada entre plataformas (`init`, `requestPermission`, `getDeviceId`, etc.).
3. **Nunca** adicione API Keys (`sk_live_` / `sk_test_`) nos SDKs client-side.
4. Rode os testes do pacote que você alterou (veja abaixo).

## Estrutura do repositório

```text
packages/
  web/            → @notifique/push (npm)
  react-native/   → @notifique/push-react-native (npm)
  flutter/        → notifique_push (pub.dev)
  android/        → dev.notifique:push (Maven)
  ios/            → NotifiquePush (Swift Package Manager)
  protocol/       → contrato compartilhado (uso interno do monorepo)
examples/         → exemplos mínimos por plataforma
```

## Testes

```bash
# Web
cd packages/web && npm install && npm test

# React Native
cd packages/react-native && npm install && npm test

# Flutter
cd packages/flutter && flutter pub get && flutter test

# Android
cd packages/android && ./gradlew test

# iOS (macOS)
cd packages/ios && swift test
```

O CI roda esses testes automaticamente em cada pull request.

## Padrões de código

- Corrija o pacote na plataforma afetada e, se mudar o contrato HTTP, atualize `packages/protocol`.
- Atualize o README do pacote se a API pública mudar.
- Atualize [CHANGELOG.md](CHANGELOG.md) em releases.

## O que não commitar

- `google-services.json`, `GoogleService-Info.plist`, chaves `.p8`
- JSON de service account do Firebase
- API Keys reais
- Arquivos `.env`

Veja também [SECURITY.md](SECURITY.md).
