# iOS example

```swift
NotifiquePush.configure(
    InitOptions(appId: "YOUR_APP_ID", bundleId: "com.example.app")
)

// application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
NotifiquePush.didRegisterForRemoteNotifications(deviceToken: deviceToken)

// UNUserNotificationCenterDelegate — ao abrir notificação:
Task {
    let payload = try await NotifiquePush.handleNotificationResponse(userInfo: response.notification.request.content.userInfo)
    if let url = payload.url { /* deep link */ }
}
```

See [packages/ios/README.md](../packages/ios/README.md).
