package dev.notifique.push

data class PushPayload(
    val title: String? = null,
    val body: String? = null,
    val url: String? = null,
    val icon: String? = null,
    val image: String? = null,
    val logId: String? = null,
    val clickReportUrl: String? = null,
    val deliveryReportUrl: String? = null,
    val data: Map<String, String> = emptyMap(),
) {
    companion object {
        fun fromMap(raw: Map<String, String>): PushPayload {
            val logId = extractLogId(raw)
            return PushPayload(
                title = raw["title"],
                body = raw["body"],
                url = raw["url"],
                icon = raw["icon"],
                image = raw["image"],
                logId = logId,
                clickReportUrl = raw["click_report_url"] ?: raw["clickReportUrl"],
                deliveryReportUrl = raw["delivery_report_url"] ?: raw["deliveryReportUrl"],
                data = raw,
            )
        }

        fun extractLogId(data: Map<String, String>): String? {
            val direct = data["log_id"] ?: data["logId"] ?: data["push_id"] ?: data["pushId"]
            if (!direct.isNullOrBlank()) return direct
            for (value in data.values) {
                val match = Regex("log_id=([^&]+)").find(value)
                if (match != null) return match.groupValues[1]
            }
            return null
        }
    }
}
