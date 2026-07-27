# Notifique Push — iOS (Swift)

SDK iOS oficial da Notifique para registro público de dispositivos APNs.

**Versão:** `0.1.0` · Swift Package `NotifiquePush`

## Instalação (SPM)

No Xcode: **File → Add Package Dependencies…** e aponte para o monorepo / tag `v0.1.0`, produto `NotifiquePush`.

Para desenvolvimento local:

```swift
.package(path: "../packages/ios")
```

## Uso

```swift
import NotifiquePush

// Equivalente cross-platform a NotifiquePush.init(...)
NotifiquePush.configure(
    appId: "clxxapp...",
    bundleId: Bundle.main.bundleIdentifier ?? "", // obrigatório no path público
    autoRequestPermission: true
)

// Em application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NotifiquePush.didRegisterForRemoteNotifications(deviceToken: deviceToken)
}

NotifiquePush.setExternalUserId("user-123") // opcional
let deviceId = NotifiquePush.getDeviceId()
```

## API

| Método | Descrição |
|--------|-----------|
| `configure(...)` | Equivalente a `init` nas outras plataformas |
| `requestPermission()` | Solicita autorização e registra para remote notifications |
| `getPermissionStatus()` | Status atual |
| `getDeviceId()` | ID retornado por `POST /v1/push/devices` |
| `setExternalUserId(_:)` | Associa usuário externo |
| `unregister()` | Limpa estado local do device |
| `addEventListener` | Eventos de registro / permissão / erro |
| `register(token:)` | `POST` público com `platform=ios` + `bundleId` + token APNs hex |
| `hexToken(from:)` | Converte `Data` APNs → hex |

O SDK **nunca** envia `contactId` nem API Key. O registro público exige que `bundleId` bata com o Push App no painel.

## Testes

```bash
swift test
```

## Requisitos

- Capability **Push Notifications** no Xcode
- Chave APNs (`.p8`) no Push App / Integrações Notifique
- `apnsBundleId` configurado no Push App

## Ver também

- [README do monorepo](../../README.md)
- [Configurar iOS](https://docs.notifique.dev/push-api/integracao/ios)
