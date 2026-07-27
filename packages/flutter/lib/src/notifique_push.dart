import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

import 'messaging.dart';
import 'types.dart';

/// Official Notifique Push SDK for Flutter.
///
/// Public registration uses `POST /v1/push/devices` **without** an API Key.
/// Android sends `packageName`; iOS sends `bundleId`. Never send `contactId`.
class NotifiquePush {
  NotifiquePush._();

  static const String defaultApiBase = 'https://api.notifique.dev';

  static String? _appId;
  static String? _apiBase;
  static bool _autoRequestPermission = true;
  static String? _externalUserId;
  static String? _deviceId;
  static PermissionStatus _permissionStatus = PermissionStatus.unknown;
  static PushMessaging? _messaging;
  static http.Client _httpClient = http.Client();
  static String? _packageName;
  static String? _bundleId;
  static String? _platformOverride;
  static bool _initialized = false;
  static final List<PushEventListener> _listeners = [];
  static StreamSubscription<String>? _tokenSub;

  /// Configures the SDK. Prefer injecting [messaging] in tests.
  static Future<void> init({
    required String appId,
    String? apiBase,
    bool autoRequestPermission = true,
    PushMessaging? messaging,
    http.Client? httpClient,
    String? packageName,
    String? bundleId,
    FutureOr<String?> Function()? tokenGetter,
    @visibleForTesting String? platform,
  }) async {
    final trimmed = appId.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('appId is required');
    }

    _appId = trimmed;
    _apiBase = (apiBase ?? defaultApiBase).replaceAll(RegExp(r'/+$'), '');
    _autoRequestPermission = autoRequestPermission;
    _httpClient = httpClient ?? http.Client();
    _messaging = messaging ??
        (tokenGetter != null ? _TokenGetterMessaging(tokenGetter) : null);
    _platformOverride = platform;
    _initialized = true;

    if (packageName != null && packageName.trim().isNotEmpty) {
      _packageName = packageName.trim();
    }
    if (bundleId != null && bundleId.trim().isNotEmpty) {
      _bundleId = bundleId.trim();
    }
    await _ensurePlatformIds();

    final msg = _messaging;
    if (msg != null) {
      await _tokenSub?.cancel();
      _tokenSub = msg.onTokenRefresh.listen((token) {
        unawaited(
          register(token).catchError((Object e) {
            _emit(ErrorEvent(e.toString(), e));
            return '';
          }),
        );
      });
    }

    if (_autoRequestPermission) {
      try {
        await requestPermission();
      } catch (e) {
        _emit(ErrorEvent(e.toString(), e));
      }
    }
  }

  static Future<PermissionStatus> requestPermission() async {
    _ensureInitialized();
    final msg = _messaging;
    final status = msg != null
        ? await msg.requestPermission()
        : PermissionStatus.granted;
    _permissionStatus = status;
    _emit(PermissionChangedEvent(status));
    if (status == PermissionStatus.granted) {
      await _registerCurrentToken();
    }
    return status;
  }

  static Future<PermissionStatus> getPermissionStatus() async {
    final msg = _messaging;
    if (msg != null) {
      _permissionStatus = await msg.getPermissionStatus();
    }
    return _permissionStatus;
  }

  static String? getDeviceId() => _deviceId;

  static Future<void> setExternalUserId(String? id) async {
    _externalUserId =
        (id == null || id.trim().isEmpty) ? null : id.trim();
    if (_initialized && _permissionStatus == PermissionStatus.granted) {
      try {
        await _registerCurrentToken();
      } catch (e) {
        _emit(ErrorEvent(e.toString(), e));
      }
    }
  }

  static Future<void> unregister() async {
    _ensureInitialized();
    final previous = _deviceId;
    _deviceId = null;
    _emit(UnregisteredEvent(previous));
  }

  static void addEventListener(PushEventListener listener) {
    _listeners.add(listener);
  }

  static void removeEventListener(PushEventListener listener) {
    _listeners.remove(listener);
  }

  /// Registers a push token with the public devices endpoint.
  static Future<String> register(String token) async {
    _ensureInitialized();
    final trimmed = token.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('token is required');
    }
    await _ensurePlatformIds();

    final platform = _resolvePlatform();
    final body = <String, dynamic>{
      'appId': _appId,
      'platform': platform,
      'token': trimmed,
    };
    if (platform == 'ios') {
      final bundle = _bundleId;
      if (bundle == null || bundle.isEmpty) {
        throw StateError('bundleId is required for iOS registration');
      }
      body['bundleId'] = bundle;
    } else {
      final pkg = _packageName;
      if (pkg == null || pkg.isEmpty) {
        throw StateError('packageName is required for Android registration');
      }
      body['packageName'] = pkg;
    }
    if (_externalUserId != null) {
      body['externalUserId'] = _externalUserId;
    }
    // Never include contactId or Authorization on the public client path.

    final uri = Uri.parse('$_apiBase/v1/push/devices');
    final response = await _httpClient.post(
      uri,
      headers: const {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(body),
    );

    final decoded = _tryDecode(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded?['message'] as String? ??
          decoded?['error'] as String? ??
          'Registration failed (${response.statusCode})';
      throw NotifiquePushException(message);
    }
    if (decoded == null || decoded['success'] != true) {
      throw NotifiquePushException(
        decoded?['message'] as String? ??
            decoded?['error'] as String? ??
            'Registration failed',
      );
    }
    final data = decoded['data'] as Map<String, dynamic>?;
    final id = data?['id'] as String?;
    if (id == null || id.isEmpty) {
      throw NotifiquePushException(
        'Registration succeeded but device id was missing',
      );
    }
    _deviceId = id;
    _permissionStatus = PermissionStatus.granted;
    _emit(RegisteredEvent(id));
    return id;
  }

  /// Resets SDK state — for unit tests only.
  @visibleForTesting
  static void resetForTests() {
    _tokenSub?.cancel();
    _tokenSub = null;
    _appId = null;
    _apiBase = null;
    _autoRequestPermission = true;
    _externalUserId = null;
    _deviceId = null;
    _permissionStatus = PermissionStatus.unknown;
    _messaging = null;
    _httpClient = http.Client();
    _packageName = null;
    _bundleId = null;
    _platformOverride = null;
    _initialized = false;
    _listeners.clear();
  }

  static String _resolvePlatform() {
    final override = _platformOverride;
    if (override == 'ios' || override == 'android') return override!;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) return 'ios';
    return 'android';
  }

  static Future<void> _ensurePlatformIds() async {
    if (kIsWeb) return;
    try {
      final info = await PackageInfo.fromPlatform();
      final platform = _resolvePlatform();
      if (platform == 'android' &&
          (_packageName == null || _packageName!.isEmpty)) {
        _packageName = info.packageName;
      }
      if (platform == 'ios' && (_bundleId == null || _bundleId!.isEmpty)) {
        _bundleId = info.packageName;
      }
    } catch (_) {
      // Tests / environments without platform channels can inject ids.
    }
  }

  static Future<void> _registerCurrentToken() async {
    final msg = _messaging;
    if (msg == null) return;
    final token = await msg.getToken();
    if (token == null || token.isEmpty) return;
    await register(token);
  }

  static void _ensureInitialized() {
    if (!_initialized) {
      throw StateError('Call NotifiquePush.init(...) before using the SDK');
    }
  }

  static void _emit(PushEvent event) {
    for (final listener in List<PushEventListener>.from(_listeners)) {
      try {
        listener(event);
      } catch (_) {}
    }
  }

  static Map<String, dynamic>? _tryDecode(String raw) {
    try {
      final value = jsonDecode(raw);
      if (value is Map<String, dynamic>) return value;
      if (value is Map) return Map<String, dynamic>.from(value);
    } catch (_) {}
    return null;
  }
}

class _TokenGetterMessaging implements PushMessaging {
  _TokenGetterMessaging(this._getter);
  final FutureOr<String?> Function() _getter;

  @override
  Future<PermissionStatus> requestPermission() async => PermissionStatus.granted;

  @override
  Future<PermissionStatus> getPermissionStatus() async =>
      PermissionStatus.granted;

  @override
  Future<String?> getToken() async => await _getter();

  @override
  Stream<String> get onTokenRefresh => const Stream.empty();
}
