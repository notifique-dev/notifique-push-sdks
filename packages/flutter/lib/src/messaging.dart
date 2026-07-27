import 'types.dart';

/// Abstraction over Firebase Messaging so unit tests do not need Firebase.
abstract class PushMessaging {
  Future<PermissionStatus> requestPermission();
  Future<PermissionStatus> getPermissionStatus();
  Future<String?> getToken();
  Stream<String> get onTokenRefresh;
}

/// No-op messaging used when callers inject tokens manually.
class ManualPushMessaging implements PushMessaging {
  ManualPushMessaging({
    this.token,
    this.permissionStatus = PermissionStatus.granted,
  });

  String? token;
  PermissionStatus permissionStatus;

  @override
  Future<PermissionStatus> requestPermission() async => permissionStatus;

  @override
  Future<PermissionStatus> getPermissionStatus() async => permissionStatus;

  @override
  Future<String?> getToken() async => token;

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();
}
