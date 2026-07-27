// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NotifiquePush",
    platforms: [
        .iOS(.v15),
        .macOS(.v13),
    ],
    products: [
        .library(
            name: "NotifiquePush",
            targets: ["NotifiquePush"]
        ),
    ],
    targets: [
        .target(
            name: "NotifiquePush",
            path: "Sources/NotifiquePush"
        ),
        .testTarget(
            name: "NotifiquePushTests",
            dependencies: ["NotifiquePush"],
            path: "Tests/NotifiquePushTests"
        ),
    ]
)
