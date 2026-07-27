# notifique_push

SDK Flutter oficial da Notifique para push (Android + iOS).

**Versão:** `0.1.0`

## Instalação

```yaml
dependencies:
  notifique_push: ^0.1.0
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
```

## Uso

```dart
import 'package:notifique_push/notifique_push.dart';
import 'package:notifique_push/firebase_messaging_adapter.dart';

await NotifiquePush.init(
  appId: 'clxxapp...',
  autoRequestPermission: true,
  messaging: FirebasePushMessaging(),
  // packageName / bundleId são obtidos via package_info_plus quando omitidos
);

NotifiquePush.setExternalUserId('user-123'); // opcional
final deviceId = NotifiquePush.getDeviceId();
```

Em testes, injete `PushMessaging` + `http.Client` sem Firebase:

```dart
await NotifiquePush.init(
  appId: 'app',
  autoRequestPermission: false,
  httpClient: mockClient,
  packageName: 'com.example.app',
  messaging: ManualPushMessaging(token: 'fake-fcm'),
);
```

## API

| Método | Descrição |
|--------|-----------|
| `init(...)` | `appId`, `apiBase?`, `autoRequestPermission?`, `messaging?` |
| `requestPermission()` | Solicita permissão e registra o token |
| `getPermissionStatus()` | Status atual |
| `getDeviceId()` | ID retornado por `POST /v1/push/devices` |
| `setExternalUserId(id?)` | Associa usuário externo |
| `unregister()` | Limpa estado local |
| `addEventListener` | Eventos de registro / permissão / erro |
| `register(token)` | `POST` público (`packageName` no Android, `bundleId` no iOS) |

O SDK **nunca** envia `contactId` nem API Key.

## Testes

```bash
flutter test
```

## Ver também

- [README do monorepo](../../README.md)
- [Configurar Flutter](https://docs.notifique.dev/push-api/integracao/flutter)
- [Configurar Android](https://docs.notifique.dev/push-api/integracao/android)
- [Configurar iOS](https://docs.notifique.dev/push-api/integracao/ios)
