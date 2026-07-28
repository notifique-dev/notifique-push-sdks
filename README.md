# Notifique Push SDKs

SDKs oficiais da [Notifique](https://notifique.dev) para notificações push em **Web**, **Android**, **iOS**, **Flutter** e **React Native**.

Documentação completa: [docs.notifique.dev/push-api/integracao](https://docs.notifique.dev/push-api/integracao)

## Pacotes

| Plataforma | Pacote | Instalação |
|------------|--------|------------|
| Web | `@notifique/push` | `npm install @notifique/push` |
| React Native | `@notifique/push-react-native` | `npm install @notifique/push-react-native` |
| Flutter | `notifique_push` | `flutter pub add notifique_push` |
| Android (Kotlin) | `dev.notifique:push` | Ver [README Android](packages/android/README.md) |
| iOS (Swift) | `NotifiquePush` (SPM) | Ver [README iOS](packages/ios/README.md) |

Cada pacote tem README próprio em `packages/<plataforma>/`.

## Uso rápido

Todos os SDKs seguem o mesmo fluxo:

```text
NotifiquePush.init({ appId })
  → requestPermission()
  → token (FCM / APNs / Web Push)
  → POST /v1/push/devices
```

- Use apenas o **`appId`** público do Push App no cliente.
- **Nunca** coloque API Keys (`sk_live_...` / `sk_test_...`) no app ou no site.
- Credenciais Firebase e Apple ficam no [painel Notifique](https://app.notifique.dev).

No Swift, `init` é palavra reservada: use `NotifiquePush.configure(...)` (mesmo contrato).

| Método | Descrição |
|--------|-----------|
| `init(...)` / `configure(...)` (iOS) | Configura o SDK |
| `requestPermission()` | Solicita permissão e registra o dispositivo |
| `getPermissionStatus()` | Status da permissão |
| `getDeviceId()` | ID do dispositivo registrado |
| `setExternalUserId(id?)` | Associa um usuário externo |
| `unregister()` | Limpa o estado local |
| `addEventListener` | Observa eventos do SDK |

## Guias por plataforma

- [Integração geral](https://docs.notifique.dev/push-api/integracao)
- [Web / site](https://docs.notifique.dev/push-api/integracao/credenciais-web)
- [Android](https://docs.notifique.dev/push-api/integracao/android)
- [iOS](https://docs.notifique.dev/push-api/integracao/ios)
- [Flutter](https://docs.notifique.dev/push-api/integracao/flutter)
- [React Native](https://docs.notifique.dev/push-api/integracao/react-native)

## Exemplos

- [`examples/web-vite`](examples/web-vite)
- [`examples/android-app`](examples/android-app)
- [`examples/ios-app`](examples/ios-app)
- [`examples/flutter-app`](examples/flutter-app)
- [`examples/rn-app`](examples/rn-app)

## Segurança

Veja [SECURITY.md](SECURITY.md). Para reportar vulnerabilidades: security@notifique.dev

## Changelog

Veja [CHANGELOG.md](CHANGELOG.md).

## Contribuir

Pull requests são bem-vindos. Leia [CONTRIBUTING.md](CONTRIBUTING.md).
