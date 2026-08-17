# Flutter example

```bash
flutter pub add notifique_push firebase_core firebase_messaging
```

```dart
import 'package:notifique_push/firebase_messaging_adapter.dart';
import 'package:notifique_push/notifique_push.dart';

final firebaseMessaging = FirebasePushMessaging();

await NotifiquePush.init(
  appId: 'YOUR_APP_ID',
  messaging: firebaseMessaging,
);

firebaseMessaging.attachOpenHandlers();
```

Handle cold start with `FirebaseMessaging.instance.getInitialMessage()` and call `NotifiquePush.handleNotificationOpen(message.data)`.
