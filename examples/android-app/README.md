# Exemplo Android

App mínimo usando `dev.notifique:push:0.1.0`.

```kotlin
NotifiquePush.init(
    appId = "clxxapp...",
    packageName = applicationContext.packageName,
    tokenProvider = { FirebaseMessaging.getInstance().token.await() },
)
```

Veja o [README do pacote](../../packages/android/README.md) e a [doc Android](https://docs.notifique.dev/push-api/integracao/android).
