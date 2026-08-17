/// Parsed incoming push notification payload.
class PushIncomingPayload {
  const PushIncomingPayload({
    this.title,
    this.body,
    this.url,
    this.icon,
    this.image,
    this.logId,
    this.clickReportUrl,
    this.deliveryReportUrl,
    this.data = const {},
  });

  final String? title;
  final String? body;
  final String? url;
  final String? icon;
  final String? image;
  final String? logId;
  final String? clickReportUrl;
  final String? deliveryReportUrl;
  final Map<String, dynamic> data;
}

String? _pickString(Map<String, dynamic> map, List<String> keys) {
  for (final key in keys) {
    final value = map[key];
    if (value is String && value.trim().isNotEmpty) return value.trim();
  }
  return null;
}

String? extractLogId(Map<String, dynamic> data) {
  final direct = _pickString(data, ['log_id', 'logId', 'push_id', 'pushId']);
  if (direct != null) return direct;
  for (final value in data.values) {
    if (value is String && value.contains('log_id=')) {
      final match = RegExp(r'log_id=([^&]+)').firstMatch(value);
      if (match != null) return Uri.decodeComponent(match.group(1)!);
    }
  }
  return null;
}

PushIncomingPayload parsePushPayload(Map<String, dynamic> raw) {
  final data = Map<String, dynamic>.from(raw);
  final logId = extractLogId(data);
  return PushIncomingPayload(
    title: _pickString(data, ['title']),
    body: _pickString(data, ['body']),
    url: _pickString(data, ['url']),
    icon: _pickString(data, ['icon']),
    image: _pickString(data, ['image']),
    logId: logId,
    clickReportUrl: _pickString(data, ['click_report_url', 'clickReportUrl']),
    deliveryReportUrl:
        _pickString(data, ['delivery_report_url', 'deliveryReportUrl']),
    data: data,
  );
}
