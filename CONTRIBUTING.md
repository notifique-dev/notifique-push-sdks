# Contributing

Este monorepo ainda está em **scaffold**. Antes de implementar um pacote:

1. Leia o guia da plataforma em [docs.notifique.dev/push-api/integracao](https://docs.notifique.dev/push-api/integracao)
2. Alinhe a API pública a `NotifiquePush.init(appId)` (e opções mínimas: `contactId` / `externalUserId`)
3. Android: token FCM · iOS: token APNs · Web: subscription VAPID
4. Não embutir API Keys `sk_live_` / `sk_test_` no SDK client por padrão — preferir registro via backend do cliente ou endpoint público limitado (como Web)

## Estrutura

```
packages/
  flutter/
  react-native/
  android/
  ios/
  web/
```

Cada pacote deve ter README com status, API alvo e link para a doc HTTP de fallback.
