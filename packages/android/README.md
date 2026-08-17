# Notifique Push (Android / Kotlin)

SDK Android oficial da Notifique para registro público de dispositivos FCM.

**Versão:** `0.2.0` · Coordenadas Maven: `dev.notifique:push:0.2.0`

## Instalação

```kotlin
dependencies {
    implementation("dev.notifique:push:0.2.0")
    // Firebase Messaging no app do cliente
    implementation("com.google.firebase:firebase-messaging")
}
```

Publicação no Maven Central ainda em andamento. Enquanto isso, publique localmente:

```bash
./gradlew :push:publishToMavenLocal
```

## Uso

```kotlin
import com.google.firebase.messaging.FirebaseMessaging
import dev.notifique.push.NotifiquePush
import kotlinx.coroutines.tasks.await

NotifiquePush.init(
    appId = "clxxapp...",
    packageName = context.packageName, // obrigatório no path público
    autoRequestPermission = true,
    tokenProvider = {
        FirebaseMessaging.getInstance().token.await()
    },
)

// Ou registre o token manualmente quando o FCM refreshar:
val token = FirebaseMessaging.getInstance().token.await()
NotifiquePush.register(token)

NotifiquePush.setExternalUserId("user-123") // opcional
val deviceId = NotifiquePush.getDeviceId()
```

## API

| Método | Descrição |
|--------|-----------|
| `init(...)` | Configura `appId`, `packageName`, `apiBase?`, `autoRequestPermission?` |
| `requestPermission()` | Solicita permissão (via `PermissionRequester` injetável) e registra |
| `getPermissionStatus()` | Status atual |
| `getDeviceId()` | ID retornado por `POST /v1/push/devices` |
| `setExternalUserId(id?)` | Associa usuário externo e re-registra |
| `unregister()` | Limpa estado local do device |
| `addEventListener` | `Registered`, `Unregistered`, `PermissionChanged`, `NotificationOpened`, `Error` |
| `register(token)` | `POST` público com `platform=android` + `packageName` |
| `handleNotificationOpen(data)` | Parse FCM data + `reportClick` + evento `NotificationOpened` |
| `reportClick(logId?, clickReportUrl?)` | `POST /v1/push/events/click` |

O SDK **nunca** envia `contactId` nem API Key. O registro público exige que `packageName` bata com o Push App no painel.

## Testes

```bash
./gradlew test
```

## Requisitos

- `google-services.json` no app do cliente
- Service account FCM no Push App / Integrações Notifique
- `androidPackageName` configurado no Push App

## Ver também

- [README do monorepo](../../README.md)
- [Configurar Android](https://docs.notifique.dev/push-api/integracao/android)
