# Exemplo Flutter

App mínimo usando `notifique_push: ^0.1.0`.

```dart
import 'package:notifique_push/notifique_push.dart';
import 'package:notifique_push/firebase_messaging_adapter.dart';

await NotifiquePush.init(
  appId: 'clxxapp...',
  messaging: FirebasePushMessaging(),
);
```

Veja o [README do pacote](../../packages/flutter/README.md) e a [doc Flutter](https://docs.notifique.dev/push-api/integracao/flutter).
