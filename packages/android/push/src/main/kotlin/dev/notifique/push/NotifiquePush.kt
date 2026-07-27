package dev.notifique.push

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit

/**
 * Official Notifique Push SDK for Android (FCM token → public device registration).
 *
 * Public registration uses `POST /v1/push/devices` **without** an API Key.
 * Always send [packageName]; never send `contactId` or API keys from the client.
 */
object NotifiquePush {
    const val DEFAULT_API_BASE = "https://api.notifique.dev"
    private val JSON = "application/json; charset=utf-8".toMediaType()

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val mutex = Mutex()
    private val listeners = CopyOnWriteArrayList<EventListener>()

    @Volatile private var appId: String? = null
    @Volatile private var apiBase: String = DEFAULT_API_BASE
    @Volatile private var packageName: String? = null
    @Volatile private var autoRequestPermission: Boolean = true
    @Volatile private var externalUserId: String? = null
    @Volatile private var deviceId: String? = null
    @Volatile private var permissionStatus: PermissionStatus = PermissionStatus.UNKNOWN
    @Volatile private var tokenProvider: TokenProvider? = null
    @Volatile private var permissionRequester: PermissionRequester? = null
    @Volatile private var httpClient: OkHttpClient = defaultClient()
    @Volatile private var initialized = false

    data class InitOptions(
        val appId: String,
        val packageName: String,
        val apiBase: String? = null,
        val autoRequestPermission: Boolean = true,
        val tokenProvider: TokenProvider? = null,
        val permissionRequester: PermissionRequester? = null,
        val httpClient: OkHttpClient? = null,
    )

    fun interface TokenProvider {
        suspend fun getToken(): String?
    }

    interface PermissionRequester {
        suspend fun request(): PermissionStatus
        fun current(): PermissionStatus = PermissionStatus.UNKNOWN
    }

    fun interface EventListener {
        fun onEvent(event: PushEvent)
    }

    sealed class PushEvent {
        data class Registered(val deviceId: String) : PushEvent()
        data class Unregistered(val deviceId: String?) : PushEvent()
        data class PermissionChanged(val status: PermissionStatus) : PushEvent()
        data class Error(val message: String, val cause: Throwable? = null) : PushEvent()
    }

    enum class PermissionStatus {
        GRANTED,
        DENIED,
        UNKNOWN,
    }

    fun init(options: InitOptions) {
        require(options.appId.isNotBlank()) { "appId is required" }
        require(options.packageName.isNotBlank()) { "packageName is required for Android registration" }

        appId = options.appId.trim()
        packageName = options.packageName.trim()
        apiBase = (options.apiBase ?: DEFAULT_API_BASE).trimEnd('/')
        autoRequestPermission = options.autoRequestPermission
        tokenProvider = options.tokenProvider
        permissionRequester = options.permissionRequester
        httpClient = options.httpClient ?: defaultClient()
        initialized = true

        if (autoRequestPermission) {
            scope.launch {
                runCatching { requestPermission() }
                    .onFailure { emit(PushEvent.Error(it.message ?: "permission failed", it)) }
            }
        }
    }

    fun init(
        appId: String,
        packageName: String,
        apiBase: String? = null,
        autoRequestPermission: Boolean = true,
        tokenProvider: TokenProvider? = null,
    ) {
        init(
            InitOptions(
                appId = appId,
                packageName = packageName,
                apiBase = apiBase,
                autoRequestPermission = autoRequestPermission,
                tokenProvider = tokenProvider,
            ),
        )
    }

    suspend fun requestPermission(): PermissionStatus {
        ensureInitialized()
        val requester = permissionRequester
        val status = if (requester != null) {
            requester.request()
        } else {
            PermissionStatus.GRANTED
        }
        permissionStatus = status
        emit(PushEvent.PermissionChanged(status))
        if (status == PermissionStatus.GRANTED) {
            registerCurrentToken()
        }
        return status
    }

    fun getPermissionStatus(): PermissionStatus {
        val requester = permissionRequester
        if (requester != null) {
            permissionStatus = requester.current()
        }
        return permissionStatus
    }

    fun getDeviceId(): String? = deviceId

    fun setExternalUserId(id: String?) {
        externalUserId = id?.takeIf { it.isNotBlank() }
        if (initialized && permissionStatus == PermissionStatus.GRANTED) {
            scope.launch {
                runCatching { registerCurrentToken() }
                    .onFailure { emit(PushEvent.Error(it.message ?: "re-register failed", it)) }
            }
        }
    }

    suspend fun unregister() {
        ensureInitialized()
        val previous = deviceId
        deviceId = null
        emit(PushEvent.Unregistered(previous))
    }

    fun addEventListener(listener: EventListener) {
        listeners.add(listener)
    }

    fun removeEventListener(listener: EventListener) {
        listeners.remove(listener)
    }

    /**
     * Registers an FCM token with the public devices endpoint.
     * Exposed for apps that obtain the token themselves (recommended with Firebase Messaging).
     */
    suspend fun register(token: String): String = mutex.withLock {
        ensureInitialized()
        val id = requireNotNull(appId)
        val pkg = requireNotNull(packageName)
        require(token.isNotBlank()) { "token is required" }

        val body = buildRegisterJson(
            appId = id,
            token = token,
            packageName = pkg,
            externalUserId = externalUserId,
        )

        // Never include contactId or Authorization headers on the public client path.
        val request = Request.Builder()
            .url("$apiBase/v1/push/devices")
            .post(body.toRequestBody(JSON))
            .header("Content-Type", "application/json")
            .header("Accept", "application/json")
            .build()

        httpClient.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = parseError(raw) ?: "Registration failed (${response.code})"
                throw NotifiquePushException(message)
            }
            val registeredId = parseDeviceId(raw)
                ?: throw NotifiquePushException("Registration succeeded but device id was missing")
            deviceId = registeredId
            permissionStatus = PermissionStatus.GRANTED
            emit(PushEvent.Registered(registeredId))
            registeredId
        }
    }

    internal fun buildRegisterJson(
        appId: String,
        token: String,
        packageName: String,
        externalUserId: String? = null,
    ): String {
        val parts = mutableListOf(
            """"appId":${jsonString(appId)}""",
            """"platform":"android"""",
            """"token":${jsonString(token)}""",
            """"packageName":${jsonString(packageName)}""",
        )
        if (!externalUserId.isNullOrBlank()) {
            parts += """"externalUserId":${jsonString(externalUserId)}"""
        }
        return "{${parts.joinToString(",")}}"
    }

    private suspend fun registerCurrentToken() {
        val provider = tokenProvider ?: return
        val token = provider.getToken() ?: return
        register(token)
    }

    private fun ensureInitialized() {
        check(initialized) { "Call NotifiquePush.init(...) before using the SDK" }
    }

    private fun emit(event: PushEvent) {
        listeners.forEach { listener ->
            runCatching { listener.onEvent(event) }
        }
    }

    private fun parseError(raw: String): String? {
        val message = Regex(""""message"\s*:\s*"([^"]*)"""").find(raw)?.groupValues?.get(1)
        val error = Regex(""""error"\s*:\s*"([^"]*)"""").find(raw)?.groupValues?.get(1)
        return message?.takeIf { it.isNotBlank() } ?: error?.takeIf { it.isNotBlank() }
    }

    private fun parseDeviceId(raw: String): String? =
        Regex(""""id"\s*:\s*"([^"]+)"""").find(raw)?.groupValues?.get(1)

    private fun jsonString(value: String): String =
        buildString {
            append('"')
            value.forEach { ch ->
                when (ch) {
                    '\\' -> append("\\\\")
                    '"' -> append("\\\"")
                    '\n' -> append("\\n")
                    '\r' -> append("\\r")
                    '\t' -> append("\\t")
                    else -> append(ch)
                }
            }
            append('"')
        }

    private fun defaultClient(): OkHttpClient =
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

    /** Resets SDK state — for unit tests only. */
    internal fun resetForTests() {
        appId = null
        apiBase = DEFAULT_API_BASE
        packageName = null
        autoRequestPermission = true
        externalUserId = null
        deviceId = null
        permissionStatus = PermissionStatus.UNKNOWN
        tokenProvider = null
        permissionRequester = null
        httpClient = defaultClient()
        initialized = false
        listeners.clear()
    }
}

class NotifiquePushException(message: String, cause: Throwable? = null) : Exception(message, cause)
