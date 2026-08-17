import Foundation

public struct PushPayload: Sendable {
    public var title: String?
    public var body: String?
    public var url: String?
    public var icon: String?
    public var image: String?
    public var logId: String?
    public var clickReportUrl: String?
    public var deliveryReportUrl: String?
    public var data: [String: String]

    public init(
        title: String? = nil,
        body: String? = nil,
        url: String? = nil,
        icon: String? = nil,
        image: String? = nil,
        logId: String? = nil,
        clickReportUrl: String? = nil,
        deliveryReportUrl: String? = nil,
        data: [String: String] = [:]
    ) {
        self.title = title
        self.body = body
        self.url = url
        self.icon = icon
        self.image = image
        self.logId = logId
        self.clickReportUrl = clickReportUrl
        self.deliveryReportUrl = deliveryReportUrl
        self.data = data
    }

    public static func from(userInfo: [AnyHashable: Any]) -> PushPayload {
        var map: [String: String] = [:]
        for (key, value) in userInfo {
            if let stringKey = key as? String {
                map[stringKey] = String(describing: value)
            }
        }
        let logId = extractLogId(from: map)
        return PushPayload(
            title: map["title"],
            body: map["body"],
            url: map["url"],
            icon: map["icon"],
            image: map["image"],
            logId: logId,
            clickReportUrl: map["click_report_url"] ?? map["clickReportUrl"],
            deliveryReportUrl: map["delivery_report_url"] ?? map["deliveryReportUrl"],
            data: map
        )
    }

    public static func extractLogId(from data: [String: String]) -> String? {
        if let direct = data["log_id"] ?? data["logId"] ?? data["push_id"] ?? data["pushId"], !direct.isEmpty {
            return direct
        }
        for value in data.values {
            if let range = value.range(of: "log_id=") {
                let suffix = value[range.upperBound...]
                let id = suffix.split(separator: "&").first.map(String.init)
                if let id, !id.isEmpty { return id }
            }
        }
        return nil
    }
}
