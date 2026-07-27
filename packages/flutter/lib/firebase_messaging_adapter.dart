/// Optional Firebase Messaging adapter.
///
/// Import only in app code that already configures Firebase:
/// `import 'package:notifique_push/firebase_messaging_adapter.dart';`
library;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:notifique_push/src/messaging.dart';
import 'package:notifique_push/src/types.dart';

class FirebasePushMessaging implements PushMessaging {
  FirebasePushMessaging([FirebaseMessaging? messaging])
      : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;

  @override
  Future<PermissionStatus> requestPermission() async {
    final settings = await _messaging.requestPermission();
    return _map(settings.authorizationStatus);
  }

  @override
  Future<PermissionStatus> getPermissionStatus() async {
    final settings = await _messaging.getNotificationSettings();
    return _map(settings.authorizationStatus);
  }

  @override
  Future<String?> getToken() => _messaging.getToken();

  @override
  Stream<String> get onTokenRefresh => _messaging.onTokenRefresh;

  PermissionStatus _map(AuthorizationStatus status) {
    switch (status) {
      case AuthorizationStatus.authorized:
      case AuthorizationStatus.provisional:
        return PermissionStatus.granted;
      case AuthorizationStatus.denied:
        return PermissionStatus.denied;
      case AuthorizationStatus.notDetermined:
        return PermissionStatus.unknown;
    }
  }
}
