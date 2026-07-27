import Foundation
import XCTest
@testable import NotifiquePush

final class NotifiquePushTests: XCTestCase {
    override func setUp() {
        super.setUp()
        NotifiquePush.resetForTests()
        MockURLProtocol.requestHandler = nil
    }

    override func tearDown() {
        NotifiquePush.resetForTests()
        MockURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testRegisterPostsIosBodyWithBundleIdWithoutContactId() async throws {
        let expectedDeviceId = "clxxdevice_ios_example"
        var capturedBody: [String: Any]?
        var capturedRequest: URLRequest?

        MockURLProtocol.requestHandler = { request in
            capturedRequest = request
            let bodyData = request.httpBody ?? MockURLProtocol.body(from: request) ?? Data()
            let body = try JSONSerialization.jsonObject(with: bodyData) as? [String: Any]
            capturedBody = body
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            let data = """
            {
              "success": true,
              "data": {
                "id": "\(expectedDeviceId)",
                "appId": "clxxapp_example",
                "platform": "ios",
                "createdAt": "2026-07-27T12:00:00.000Z"
              }
            }
            """.data(using: .utf8)!
            return (response, data)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: config)

        // URLProtocol mock via URLSession; also covered by injectable NotifiqueHTTPClient.
        NotifiquePush.configure(
            NotifiquePush.InitOptions(
                appId: "clxxapp_example",
                bundleId: "com.example.app",
                apiBase: "https://api.test.notifique",
                autoRequestPermission: false,
                urlSession: session
            )
        )

        let deviceId = try await NotifiquePush.register(token: "aabbccddeeff00112233445566778899")
        XCTAssertEqual(deviceId, expectedDeviceId)
        XCTAssertEqual(NotifiquePush.getDeviceId(), expectedDeviceId)

        XCTAssertEqual(capturedRequest?.httpMethod, "POST")
        XCTAssertEqual(capturedRequest?.url?.absoluteString, "https://api.test.notifique/v1/push/devices")
        XCTAssertNil(capturedRequest?.value(forHTTPHeaderField: "Authorization"))

        let body = try XCTUnwrap(capturedBody)
        XCTAssertEqual(body["platform"] as? String, "ios")
        XCTAssertEqual(body["bundleId"] as? String, "com.example.app")
        XCTAssertEqual(body["token"] as? String, "aabbccddeeff00112233445566778899")
        XCTAssertEqual(body["appId"] as? String, "clxxapp_example")
        XCTAssertNil(body["contactId"])
        XCTAssertNil(body["apiKey"])
    }

    func testRegisterWithInjectableHTTPClient() async throws {
        let mock = MockHTTPClient { request in
            let body = try JSONSerialization.jsonObject(with: request.httpBody ?? Data()) as? [String: Any]
            XCTAssertEqual(body?["bundleId"] as? String, "com.example.app")
            XCTAssertNil(body?["contactId"])
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            let data = #"{"success":true,"data":{"id":"dev_2","appId":"app","platform":"ios","createdAt":"2026-07-27T12:00:00.000Z"}}"#.data(using: .utf8)!
            return (data, response)
        }

        NotifiquePush.configure(
            NotifiquePush.InitOptions(
                appId: "app",
                bundleId: "com.example.app",
                apiBase: "https://api.test.notifique",
                autoRequestPermission: false,
                httpClient: mock
            )
        )

        let id = try await NotifiquePush.register(token: "aabb")
        XCTAssertEqual(id, "dev_2")
        XCTAssertEqual(mock.callCount, 1)
    }

    func testHexTokenFromData() {
        let data = Data([0xAA, 0xBB, 0xCC, 0xDD])
        XCTAssertEqual(NotifiquePush.hexToken(from: data), "aabbccdd")
    }
}

final class MockURLProtocol: URLProtocol, @unchecked Sendable {
    private static let lock = NSLock()
    private static var _handler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))? {
        get { lock.withLock { _handler } }
        set { lock.withLock { _handler = newValue } }
    }

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}

    /// URLSession may move the body into an HTTPBodyStream; reconstruct when needed.
    static func body(from request: URLRequest) -> Data? {
        guard let stream = request.httpBodyStream else { return nil }
        stream.open()
        defer { stream.close() }
        let bufferSize = 1024
        var data = Data()
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let read = stream.read(buffer, maxLength: bufferSize)
            if read > 0 {
                data.append(buffer, count: read)
            } else {
                break
            }
        }
        return data
    }
}

final class MockHTTPClient: NotifiqueHTTPClient, @unchecked Sendable {
    private let handler: @Sendable (URLRequest) throws -> (Data, URLResponse)
    private(set) var callCount = 0
    private let lock = NSLock()

    init(handler: @escaping @Sendable (URLRequest) throws -> (Data, URLResponse)) {
        self.handler = handler
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        lock.lock()
        callCount += 1
        lock.unlock()
        return try handler(request)
    }
}
