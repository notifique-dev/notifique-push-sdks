import { authHeaders, PushClientError, readJson, throwApiError } from "./http.js";
import {
  appUrl,
  appsUrl,
  buildQuery,
  deviceUrl,
  devicesUrl,
  messageCancelUrl,
  messageUrl,
  messagesUrl,
  trimBase,
} from "./urls.js";
import type {
  ListDevicesParams,
  ListMessagesParams,
  ListResponse,
  PaginationParams,
  PushApp,
  PushAppCreateRequest,
  PushAppUpdateRequest,
  PushClientOptions,
  PushDevice,
  PushMessage,
  RegisterDeviceRequest,
  SendOptions,
  SendPushRequest,
  SendPushResponse,
  SingleResponse,
  SuccessResponse,
} from "./types.js";

export function buildSendPushBody(request: SendPushRequest): SendPushRequest {
  return {
    to: request.to,
    type: request.type,
    payload: { ...request.payload },
    ...(request.schedule ? { schedule: request.schedule } : {}),
    ...(request.options ? { options: request.options } : {}),
    ...(request.metadata ? { metadata: request.metadata } : {}),
    ...(request.localization ? { localization: request.localization } : {}),
    ...(request.i18n ? { i18n: request.i18n } : {}),
  };
}

export class PushClient {
  readonly apiKey: string;
  readonly apiBase: string;
  readonly fetchImpl: typeof fetch;
  readonly useXApiKeyHeader: boolean;

  constructor(options: PushClientOptions) {
    const key = options.apiKey?.trim();
    if (!key) throw new Error("apiKey is required");
    this.apiKey = key;
    this.apiBase = trimBase(options.apiBase);
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.useXApiKeyHeader = options.useXApiKeyHeader ?? false;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return authHeaders(this.apiKey, this.useXApiKeyHeader, extra);
  }

  private async request<T extends { success: true }>(
    method: string,
    url: string,
    init?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    const headers = this.headers(init?.headers);
    if (init?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const raw = await readJson(response);
    if (!response.ok || (raw as { success?: boolean }).success !== true) {
      throwApiError(response, raw);
    }
    return raw as T;
  }

  // ——— Apps ———

  async listApps(params?: PaginationParams): Promise<ListResponse<PushApp>> {
    const q = buildQuery({ page: params?.page, limit: params?.limit });
    return this.request("GET", `${appsUrl(this.apiBase)}${q}`);
  }

  async createApp(body: PushAppCreateRequest): Promise<SingleResponse<PushApp>> {
    return this.request("POST", appsUrl(this.apiBase), { body });
  }

  async getApp(id: string): Promise<SingleResponse<PushApp>> {
    return this.request("GET", appUrl(id, this.apiBase));
  }

  async updateApp(id: string, body: PushAppUpdateRequest): Promise<SingleResponse<PushApp>> {
    return this.request("PUT", appUrl(id, this.apiBase), { body });
  }

  async deleteApp(id: string): Promise<SuccessResponse> {
    return this.request("DELETE", appUrl(id, this.apiBase));
  }

  // ——— Devices ———

  async listDevices(params?: ListDevicesParams): Promise<ListResponse<PushDevice>> {
    const q = buildQuery({
      page: params?.page,
      limit: params?.limit,
      appId: params?.appId,
      platform: params?.platform,
    });
    return this.request("GET", `${devicesUrl(this.apiBase)}${q}`);
  }

  async getDevice(id: string): Promise<SingleResponse<PushDevice>> {
    return this.request("GET", deviceUrl(id, this.apiBase));
  }

  async registerDevice(body: RegisterDeviceRequest): Promise<SingleResponse<PushDevice>> {
    return this.request("POST", devicesUrl(this.apiBase), { body });
  }

  async deleteDevice(id: string): Promise<SuccessResponse> {
    return this.request("DELETE", deviceUrl(id, this.apiBase));
  }

  // ——— Messages ———

  async send(request: SendPushRequest, options?: SendOptions): Promise<SendPushResponse> {
    const body = buildSendPushBody(request);
    const extra: Record<string, string> = {};
    if (options?.idempotencyKey) {
      extra["Idempotency-Key"] = options.idempotencyKey;
      extra["x-idempotency-key"] = options.idempotencyKey;
    }
    const response = await this.fetchImpl(messagesUrl(this.apiBase), {
      method: "POST",
      headers: this.headers(extra),
      body: JSON.stringify(body),
    });
    const raw = await readJson(response);
    if (!response.ok || (raw as SendPushResponse).success !== true) {
      throwApiError(response, raw);
    }
    const result = raw as SendPushResponse;
    if (!Array.isArray(result.data?.messageIds)) {
      throw new PushClientError("Response missing messageIds", response.status);
    }
    return result;
  }

  async listMessages(params?: ListMessagesParams): Promise<ListResponse<PushMessage>> {
    const q = buildQuery({
      page: params?.page,
      limit: params?.limit,
      status: params?.status,
      appId: params?.appId,
    });
    return this.request("GET", `${messagesUrl(this.apiBase)}${q}`);
  }

  async getMessage(id: string): Promise<SingleResponse<PushMessage>> {
    return this.request("GET", messageUrl(id, this.apiBase));
  }

  async cancelMessage(id: string): Promise<SuccessResponse> {
    return this.request("POST", messageCancelUrl(id, this.apiBase), { body: {} });
  }

  /** Alias for `cancelMessage`. */
  async cancel(id: string): Promise<SuccessResponse> {
    return this.cancelMessage(id);
  }
}
