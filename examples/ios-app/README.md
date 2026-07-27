# Exemplo iOS

App mínimo usando o Swift Package `NotifiquePush`.

```swift
import NotifiquePush

NotifiquePush.configure(appId: "clxxapp...", autoRequestPermission: true)

// didRegisterForRemoteNotificationsWithDeviceToken:
NotifiquePush.didRegisterForRemoteNotifications(deviceToken: deviceToken)
```

Veja o [README do pacote](../../packages/ios/README.md) e a [doc iOS](https://docs.notifique.dev/push-api/integracao/ios).
