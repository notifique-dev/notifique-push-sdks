package dev.notifique.push

import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.util.concurrent.TimeUnit

class NotifiquePushTest {
    private lateinit var server: MockWebServer

    @BeforeEach
    fun setUp() {
        NotifiquePush.resetForTests()
        server = MockWebServer()
        server.start()
    }

    @AfterEach
    fun tearDown() {
        server.shutdown()
        NotifiquePush.resetForTests()
    }

    @Test
    fun `register posts android body with packageName and without contactId`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """
                    {
                      "success": true,
                      "data": {
                        "id": "clxxdevice_example",
                        "appId": "clxxapp_example",
                        "platform": "android",
                        "createdAt": "2026-07-27T12:00:00.000Z"
                      }
                    }
                    """.trimIndent(),
                ),
        )

        val client = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(5, TimeUnit.SECONDS)
            .build()

        NotifiquePush.init(
            NotifiquePush.InitOptions(
                appId = "clxxapp_example",
                packageName = "com.example.app",
                apiBase = server.url("/").toString().trimEnd('/'),
                autoRequestPermission = false,
                httpClient = client,
            ),
        )

        val deviceId = NotifiquePush.register("fcm-token-example")
        assertEquals("clxxdevice_example", deviceId)
        assertEquals("clxxdevice_example", NotifiquePush.getDeviceId())

        val recorded = server.takeRequest(5, TimeUnit.SECONDS)
        assertNotNull(recorded)
        assertEquals("POST", recorded!!.method)
        assertEquals("/v1/push/devices", recorded.path)
        assertEquals("application/json; charset=utf-8", recorded.getHeader("Content-Type"))
        assertTrue(recorded.getHeader("Authorization").isNullOrBlank())

        val body = recorded.body.readUtf8()
        assertTrue(body.contains("\"platform\":\"android\""))
        assertTrue(body.contains("\"packageName\":\"com.example.app\""))
        assertTrue(body.contains("\"token\":\"fcm-token-example\""))
        assertTrue(body.contains("\"appId\":\"clxxapp_example\""))
        assertFalse(body.contains("contactId"))
        assertFalse(body.contains("apiKey"))
        assertFalse(body.contains("Authorization"))
    }

    @Test
    fun `register includes externalUserId when set`() = runBlocking {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody(
                    """{"success":true,"data":{"id":"dev_1","appId":"app","platform":"android","createdAt":"2026-07-27T12:00:00.000Z"}}""",
                ),
        )

        NotifiquePush.init(
            NotifiquePush.InitOptions(
                appId = "app",
                packageName = "com.example.app",
                apiBase = server.url("/").toString().trimEnd('/'),
                autoRequestPermission = false,
            ),
        )
        NotifiquePush.setExternalUserId("user-42")
        NotifiquePush.register("token")

        val body = server.takeRequest(5, TimeUnit.SECONDS)!!.body.readUtf8()
        assertTrue(body.contains("\"externalUserId\":\"user-42\""))
        assertFalse(body.contains("contactId"))
    }
}
