export type PushIncomingPayload = {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  image?: string;
  logId?: string;
  clickReportUrl?: string;
  deliveryReportUrl?: string;
  data?: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function extractLogId(data: Record<string, unknown>): string | undefined {
  const direct = pickString(data, ["log_id", "logId", "push_id", "pushId"]);
  if (direct) return direct;
  for (const value of Object.values(data)) {
    if (typeof value === "string" && value.includes("log_id=")) {
      const match = value.match(/log_id=([^&]+)/);
      if (match?.[1]) return decodeURIComponent(match[1]);
    }
  }
  return undefined;
}

export function parsePushPayload(raw: unknown): PushIncomingPayload {
  const record = asRecord(raw);
  if (!record) return {};

  const data = asRecord(record.data) ?? {};
  const mergedData = { ...data };
  for (const [key, value] of Object.entries(record)) {
    if (!["data", "title", "body", "url", "icon", "image"].includes(key)) {
      mergedData[key] = value;
    }
  }

  const logId = extractLogId(mergedData) ?? pickString(record, ["log_id", "logId"]);
  const url = pickString(record, ["url"]) ?? pickString(mergedData, ["url"]);

  return {
    title: pickString(record, ["title"]),
    body: pickString(record, ["body"]),
    url,
    icon: pickString(record, ["icon"]),
    image: pickString(record, ["image"]),
    logId,
    clickReportUrl: pickString(mergedData, ["click_report_url", "clickReportUrl"]),
    deliveryReportUrl: pickString(mergedData, ["delivery_report_url", "deliveryReportUrl"]),
    data: mergedData,
  };
}
