import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:notifique_push/notifique_push.dart';

void main() {
  setUp(() {
    NotifiquePush.resetForTests();
  });

  tearDown(() {
    NotifiquePush.resetForTests();
  });

  test('register posts android body with packageName and without contactId',
      () async {
    Map<String, dynamic>? capturedBody;
    http.Request? capturedRequest;

    final client = MockClient((request) async {
      capturedRequest = request;
      capturedBody = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'id': 'clxxdevice_example',
            'appId': 'clxxapp_example',
            'platform': 'android',
            'createdAt': '2026-07-27T12:00:00.000Z',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    await NotifiquePush.init(
      appId: 'clxxapp_example',
      apiBase: 'https://api.test.notifique',
      autoRequestPermission: false,
      httpClient: client,
      packageName: 'com.example.app',
      platform: 'android',
      messaging: ManualPushMessaging(token: 'fcm-token-example'),
    );

    final deviceId = await NotifiquePush.register('fcm-token-example');
    expect(deviceId, 'clxxdevice_example');
    expect(NotifiquePush.getDeviceId(), 'clxxdevice_example');

    expect(capturedRequest!.method, 'POST');
    expect(
      capturedRequest!.url.toString(),
      'https://api.test.notifique/v1/push/devices',
    );
    expect(capturedRequest!.headers['authorization'], isNull);

    expect(capturedBody!['platform'], 'android');
    expect(capturedBody!['packageName'], 'com.example.app');
    expect(capturedBody!['token'], 'fcm-token-example');
    expect(capturedBody!['appId'], 'clxxapp_example');
    expect(capturedBody!.containsKey('contactId'), isFalse);
    expect(capturedBody!.containsKey('apiKey'), isFalse);
  });

  test('register posts ios body with bundleId and without contactId', () async {
    Map<String, dynamic>? capturedBody;

    final client = MockClient((request) async {
      capturedBody = jsonDecode(request.body) as Map<String, dynamic>;
      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'id': 'clxxdevice_ios_example',
            'appId': 'clxxapp_example',
            'platform': 'ios',
            'createdAt': '2026-07-27T12:00:00.000Z',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });

    await NotifiquePush.init(
      appId: 'clxxapp_example',
      apiBase: 'https://api.test.notifique',
      autoRequestPermission: false,
      httpClient: client,
      bundleId: 'com.example.app',
      platform: 'ios',
      messaging: ManualPushMessaging(token: 'aabbccddeeff00112233445566778899'),
    );

    await NotifiquePush.register('aabbccddeeff00112233445566778899');

    expect(capturedBody!['platform'], 'ios');
    expect(capturedBody!['bundleId'], 'com.example.app');
    expect(capturedBody!.containsKey('packageName'), isFalse);
    expect(capturedBody!.containsKey('contactId'), isFalse);
  });
}
