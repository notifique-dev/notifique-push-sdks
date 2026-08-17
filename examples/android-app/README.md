# Android example

Register FCM token and report notification clicks:

```kotlin
// Após obter token FCM
lifecycleScope.launch {
    NotifiquePush.register(token)
}

// No FirebaseMessagingService.onMessageReceived ou ao abrir notificação:
lifecycleScope.launch {
    val payload = NotifiquePush.handleNotificationOpen(message.data)
    payload.url?.let { openUrl(it) }
}
```

Configure `NotifiquePush.init` with `packageName` and `tokenProvider` — see [packages/android/README.md](../packages/android/README.md).
