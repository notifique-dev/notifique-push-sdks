/// Shared types for the Notifique Push Flutter SDK.
library;

import 'payload.dart';

export 'payload.dart';

enum PermissionStatus { granted, denied, unknown }

sealed class PushEvent {
  const PushEvent();
}

final class RegisteredEvent extends PushEvent {
  const RegisteredEvent(this.deviceId);
  final String deviceId;
}

final class UnregisteredEvent extends PushEvent {
  const UnregisteredEvent(this.deviceId);
  final String? deviceId;
}

final class PermissionChangedEvent extends PushEvent {
  const PermissionChangedEvent(this.status);
  final PermissionStatus status;
}

final class ErrorEvent extends PushEvent {
  const ErrorEvent(this.message, [this.cause]);
  final String message;
  final Object? cause;
}

final class NotificationOpenedEvent extends PushEvent {
  const NotificationOpenedEvent(this.payload);
  final PushIncomingPayload payload;
}

typedef PushEventListener = void Function(PushEvent event);

class NotifiquePushException implements Exception {
  NotifiquePushException(this.message);
  final String message;

  @override
  String toString() => 'NotifiquePushException: $message';
}
