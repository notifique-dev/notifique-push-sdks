# Notifique Push SDKs

Monorepo de **SDKs client-side** para notificações push da [Notifique](https://notifique.dev): Flutter, React Native, Android, iOS e Web.

Separado do monorepo [`notifique-sdk`](../notifique-sdk) (clientes HTTP server-side para WhatsApp, SMS, e-mail, etc.).

## Status

| Pacote | Caminho | Status |
|--------|---------|--------|
| Web | [`packages/web`](packages/web) | **Implemented 0.1.0** (`@notifique/push`) |
| Flutter | [`packages/flutter`](packages/flutter) | **Implemented 0.1.0** (`notifique_push`) |
| React Native | [`packages/react-native`](packages/react-native) | **Implemented 0.1.0** (`@notifique/push-react-native`) |
| Android (Kotlin) | [`packages/android`](packages/android) | **Implemented 0.1.0** (`dev.notifique:push`) |
| iOS (Swift) | [`packages/ios`](packages/ios) | **Implemented 0.1.0** (`NotifiquePush` SPM) |
| Protocol | [`packages/protocol`](packages/protocol) | Fixtures + tipos compartilhados |

## Documentação

- [Integrar apps](https://docs.notifique.dev/push-api/integracao)
- [Android](https://docs.notifique.dev/push-api/integracao/android)
- [iOS](https://docs.notifique.dev/push-api/integracao/ios)
- [Flutter](https://docs.notifique.dev/push-api/integracao/flutter)
- [React Native](https://docs.notifique.dev/push-api/integracao/react-native)
- [SECURITY.md](SECURITY.md) · [CHANGELOG.md](CHANGELOG.md) · [docs/RELEASE.md](docs/RELEASE.md)

## API compartilhada

```text
NotifiquePush.init({ appId, apiBase?, autoRequestPermission? })
  → requestPermission() → token (FCM / APNs) → POST /v1/push/devices
```

Registro público: **sem API Key**. Android envia `packageName`; iOS envia `bundleId`. Clientes **nunca** enviam `contactId` nem API keys.

> No Swift, `init` é palavra reservada — use `NotifiquePush.configure(...)` (mesmo contrato das outras plataformas).

| Método | Descrição |
|--------|-----------|
| `init(...)` / `configure(...)` (iOS) | Configura o SDK |
| `requestPermission()` | Solicita permissão e registra |
| `getPermissionStatus()` | Status da permissão |
| `getDeviceId()` | ID do device registrado |
| `setExternalUserId(id?)` | Associa usuário externo |
| `unregister()` | Limpa estado local |
| `addEventListener` | Observa eventos do SDK |

Credenciais FCM e APNs continuam no **painel Notifique**. O SDK não substitui Firebase/Apple; só esconde o registro e o refresh de token.

## Exemplos

- [`examples/android-app`](examples/android-app)
- [`examples/ios-app`](examples/ios-app)
- [`examples/flutter-app`](examples/flutter-app)
- [`examples/rn-app`](examples/rn-app)

## Fora de escopo deste repo

- Clientes HTTP da API multicanal → [`notifique-sdk`](../notifique-sdk)
- Backend / dashboard → [`zenvio`](../zenvio)
- Docs públicas → [`notifique-docs`](../notifique-docs)

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md).
