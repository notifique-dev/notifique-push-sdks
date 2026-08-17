import Foundation

#if canImport(UIKit)
import UIKit
import UserNotifications
#endif

/// Minimal HTTP abstraction so tests can avoid live networking / URLProtocol quirks.
public protocol NotifiqueHTTPClient: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

public struct URLSessionHTTPClient: NotifiqueHTTPClient {
    public let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }
}

/// Official Notifique Push SDK for iOS (APNs hex token → public device registration).
///
/// Public registration uses `POST /v1/push/devices` **without** an API Key.
/// Always send `bundleId`; never send `contactId` or API keys from the client.
///
/// Cross-platform `init` maps to ``configure(_:)`` in Swift (`init` is reserved).
public enum NotifiquePush {
    public static let defaultApiBase = "https://api.notifique.dev"

    public struct InitOptions: Sendable {
        public var appId: String
        public var bundleId: String
        public var apiBase: String?
        public var autoRequestPermission: Bool
        public var tokenProvider: (@Sendable () async throws -> String?)?
        public var httpClient: any NotifiqueHTTPClient

        public init(
            appId: String,
            bundleId: String = Bundle.main.bundleIdentifier ?? "",
            apiBase: String? = nil,
            autoRequestPermission: Bool = true,
            tokenProvider: (@Sendable () async throws -> String?)? = nil,
            httpClient: any NotifiqueHTTPClient = URLSessionHTTPClient()
        ) {
            self.appId = appId
            self.bundleId = bundleId
            self.apiBase = apiBase
            self.autoRequestPermission = autoRequestPermission
            self.tokenProvider = tokenProvider
            self.httpClient = httpClient
        }

        public init(
            appId: String,
            bundleId: String = Bundle.main.bundleIdentifier ?? "",
            apiBase: String? = nil,
            autoRequestPermission: Bool = true,
            tokenProvider: (@Sendable () async throws -> String?)? = nil,
            urlSession: URLSession
        ) {
            self.init(
                appId: appId,
                bundleId: bundleId,
                apiBase: apiBase,
                autoRequestPermission: autoRequestPermission,
                tokenProvider: tokenProvider,
                httpClient: URLSessionHTTPClient(session: urlSession)
            )
        }
    }

    public enum PermissionStatus: String, Sendable {
        case granted
        case denied
        case unknown
    }

    public enum PushEvent: Sendable {
        case registered(deviceId: String)
        case unregistered(deviceId: String?)
        case permissionChanged(PermissionStatus)
        case notificationOpened(payload: PushPayload)
        case error(message: String)
    }

    public typealias EventListener = @Sendable (PushEvent) -> Void

    private static let queue = DispatchQueue(label: "dev.notifique.push.state")

    private static var _appId: String?
    private static var _apiBase: String = defaultApiBase
    private static var _bundleId: String?
    private static var _autoRequestPermission = true
    private static var _externalUserId: String?
    private static var _deviceId: String?
    private static var _permissionStatus: PermissionStatus = .unknown
    private static var _tokenProvider: (@Sendable () async throws -> String?)?
    private static var _httpClient: any NotifiqueHTTPClient = URLSessionHTTPClient()
    private static var _initialized = false
    private static var _listeners: [UUID: EventListener] = [:]

    /// Configures the SDK (cross-platform equivalent of `NotifiquePush.init`).
    public static func configure(_ options: InitOptions) {
        precondition(!options.appId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "appId is required")
        precondition(!options.bundleId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, "bundleId is required for iOS registration")

        var base = (options.apiBase ?? defaultApiBase).trimmingCharacters(in: .whitespacesAndNewlines)
        while base.hasSuffix("/") {
            base = String(base.dropLast())
        }

        queue.sync {
            _appId = options.appId.trimmingCharacters(in: .whitespacesAndNewlines)
            _bundleId = options.bundleId.trimmingCharacters(in: .whitespacesAndNewlines)
            _apiBase = base
            _autoRequestPermission = options.autoRequestPermission
            _tokenProvider = options.tokenProvider
            _httpClient = options.httpClient
            _initialized = true
        }

        if options.autoRequestPermission {
            Task {
                do {
                    _ = try await requestPermission()
                } catch {
                    emit(.error(message: error.localizedDescription))
                }
            }
        }
    }

    public static func configure(
        appId: String,
        bundleId: String = Bundle.main.bundleIdentifier ?? "",
        apiBase: String? = nil,
        autoRequestPermission: Bool = true
    ) {
        configure(
            InitOptions(
                appId: appId,
                bundleId: bundleId,
                apiBase: apiBase,
                autoRequestPermission: autoRequestPermission
            )
        )
    }

    @discardableResult
    public static func requestPermission() async throws -> PermissionStatus {
        try ensureInitialized()
        let status: PermissionStatus
        #if canImport(UIKit) && !os(watchOS)
        let center = UNUserNotificationCenter.current()
        let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
        status = granted ? .granted : .denied
        if granted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
        #else
        status = .granted
        #endif
        queue.sync { _permissionStatus = status }
        emit(.permissionChanged(status))
        if status == .granted {
            try await registerCurrentTokenIfPossible()
        }
        return status
    }

    public static func getPermissionStatus() -> PermissionStatus {
        queue.sync { _permissionStatus }
    }

    public static func getDeviceId() -> String? {
        queue.sync { _deviceId }
    }

    public static func setExternalUserId(_ id: String?) {
        let shouldReregister: Bool = queue.sync {
            _externalUserId = id?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
            return _initialized && _permissionStatus == .granted
        }
        if shouldReregister {
            Task {
                do {
                    try await registerCurrentTokenIfPossible()
                } catch {
                    emit(.error(message: error.localizedDescription))
                }
            }
        }
    }

    public static func unregister() async {
        let previous: String? = queue.sync {
            let previous = _deviceId
            _deviceId = nil
            return previous
        }
        emit(.unregistered(deviceId: previous))
    }

    @discardableResult
    public static func addEventListener(_ listener: @escaping EventListener) -> UUID {
        let id = UUID()
        queue.sync { _listeners[id] = listener }
        return id
    }

    public static func removeEventListener(_ id: UUID) {
        queue.sync { _listeners[id] = nil }
    }

    /// Registers an APNs device token (hex string) with the public devices endpoint.
    @discardableResult
    public static func register(token: String) async throws -> String {
        try ensureInitialized()
        let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        precondition(!trimmed.isEmpty, "token is required")

        let snapshot = queue.sync {
            (
                appId: _appId!,
                bundleId: _bundleId!,
                apiBase: _apiBase,
                externalUserId: _externalUserId,
                httpClient: _httpClient
            )
        }

        var body: [String: Any] = [
            "appId": snapshot.appId,
            "platform": "ios",
            "token": trimmed,
            "bundleId": snapshot.bundleId,
        ]
        if let external = snapshot.externalUserId, !external.isEmpty {
            body["externalUserId"] = external
        }
        // Never include contactId or Authorization on the public client path.

        let url = URL(string: "\(snapshot.apiBase)/v1/push/devices")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await snapshot.httpClient.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw NotifiquePushError.message("Invalid response")
        }
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        guard http.statusCode >= 200, http.statusCode < 300 else {
            let message = (json?["message"] as? String)
                ?? (json?["error"] as? String)
                ?? "Registration failed (\(http.statusCode))"
            throw NotifiquePushError.message(message)
        }
        guard let success = json?["success"] as? Bool, success,
              let dataObj = json?["data"] as? [String: Any],
              let registeredId = dataObj["id"] as? String
        else {
            throw NotifiquePushError.message("Registration succeeded but device id was missing")
        }

        queue.sync {
            _deviceId = registeredId
            _permissionStatus = .granted
        }
        emit(.registered(deviceId: registeredId))
        return registeredId
    }

    /// Reports notification click (public endpoint).
    public static func reportClick(
        logId: String? = nil,
        clickReportUrl: String? = nil,
        action: String = "default"
    ) async throws {
        try ensureInitialized()
        let snapshot = queue.sync { (_apiBase, _httpClient) }
        let urlString: String
        let body: [String: Any]
        if let clickReportUrl, !clickReportUrl.isEmpty {
            urlString = clickReportUrl
            body = ["action": action]
        } else if let logId, !logId.isEmpty {
            urlString = "\(snapshot.0)/v1/push/events/click?log_id=\(logId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? logId)"
            body = ["log_id": logId, "action": action]
        } else {
            throw NotifiquePushError.message("logId or clickReportUrl is required")
        }

        let url = URL(string: urlString)!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        _ = try await snapshot.1.data(for: request)
    }

    /// Parses userInfo, optionally reports click, and emits notificationOpened.
    @discardableResult
    public static func handleNotificationResponse(
        userInfo: [AnyHashable: Any],
        action: String = "default",
        report: Bool = true
    ) async throws -> PushPayload {
        let payload = PushPayload.from(userInfo: userInfo)
        if report {
            try await reportClick(logId: payload.logId, clickReportUrl: payload.clickReportUrl, action: action)
        }
        emit(.notificationOpened(payload: payload))
        return payload
    }

    /// Converts raw APNs `Data` token to lowercase hex (required by Notifique).
    public static func hexToken(from deviceToken: Data) -> String {
        deviceToken.map { String(format: "%02x", $0) }.joined()
    }

    /// Call from `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`.
    public static func didRegisterForRemoteNotifications(deviceToken: Data) {
        let hex = hexToken(from: deviceToken)
        Task {
            do {
                _ = try await register(token: hex)
            } catch {
                emit(.error(message: error.localizedDescription))
            }
        }
    }

    // MARK: - Internals

    private static func registerCurrentTokenIfPossible() async throws {
        let provider = queue.sync { _tokenProvider }
        guard let provider, let token = try await provider() else { return }
        _ = try await register(token: token)
    }

    private static func ensureInitialized() throws {
        let ok = queue.sync { _initialized }
        guard ok else { throw NotifiquePushError.notInitialized }
    }

    private static func emit(_ event: PushEvent) {
        let current = queue.sync { Array(_listeners.values) }
        current.forEach { $0(event) }
    }

    /// Resets SDK state — for unit tests only.
    static func resetForTests() {
        queue.sync {
            _appId = nil
            _apiBase = defaultApiBase
            _bundleId = nil
            _autoRequestPermission = true
            _externalUserId = nil
            _deviceId = nil
            _permissionStatus = .unknown
            _tokenProvider = nil
            _httpClient = URLSessionHTTPClient()
            _initialized = false
            _listeners.removeAll()
        }
    }
}

public enum NotifiquePushError: Error, LocalizedError, Sendable {
    case notInitialized
    case message(String)

    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "Call NotifiquePush.configure(...) before using the SDK"
        case .message(let value):
            return value
        }
    }
}

private extension String {
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
