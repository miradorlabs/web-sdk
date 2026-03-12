/**
 * Client - Main client for interacting with the Mirador Ingest Gateway
 */
import {
  FlushTraceRequest,
  KeepAliveRequest,
  CloseTraceRequest,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { IngestGatewayServiceClient } from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb';
import { Trace } from './trace';
import type { ClientOptions, TraceOptions } from './types';

/**
 * Generate a W3C-compatible trace ID (32 lowercase hex chars / 128 bits)
 */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Default configuration values
const DEFAULT_API_URL = 'https://ingest.mirador.org:443';
const DEFAULT_INCLUDE_USER_META = true;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BACKOFF = 1000;
const DEFAULT_KEEP_ALIVE_INTERVAL_MS = 10000;
const DEFAULT_AUTO_CLOSE = false;

/**
 * Main Client for interacting with Mirador's Ingest Gateway API
 */
export class Client {
  public apiUrl: string;
  public apiKey: string;
  public keepAliveIntervalMs: number;
  private client: IngestGatewayServiceClient;
  private provider?: import('./types').EIP1193Provider;

  /**
   * Create a new Client instance
   * @param apiKey Required API key for authentication (sent as x-ingest-api-key header)
   * @param options Optional configuration options
   */
  constructor(apiKey: string, options?: ClientOptions) {
    this.apiKey = apiKey;
    this.apiUrl = options?.apiUrl || DEFAULT_API_URL;
    this.keepAliveIntervalMs = options?.keepAliveIntervalMs || DEFAULT_KEEP_ALIVE_INTERVAL_MS;
    this.provider = options?.provider;

    const credentials = { 'x-ingest-api-key': apiKey };
    this.client = new IngestGatewayServiceClient(this.apiUrl, credentials);
  }

  /** @internal */
  async _flushTrace(request: FlushTraceRequest) {
    const metadata = { 'x-ingest-api-key': this.apiKey };
    const timestamp = new Timestamp();
    timestamp.fromDate(new Date());
    request.setSendClientTimestamp(timestamp);
    return await this.client.flushTrace(request, metadata);
  }

  /** @internal */
  async _keepAlive(request: KeepAliveRequest) {
    const metadata = { 'x-ingest-api-key': this.apiKey };
    return await this.client.keepAlive(request, metadata);
  }

  /** @internal */
  async _closeTrace(request: CloseTraceRequest) {
    const metadata = { 'x-ingest-api-key': this.apiKey };
    return await this.client.closeTrace(request, metadata);
  }

  /**
   * Create a new trace builder
   *
   * @param options Trace configuration options
   * @returns A Trace builder instance
   */
  trace(options?: TraceOptions): Trace {
    // Generate a W3C trace ID (32 hex chars) if not provided
    const traceId = options?.traceId ?? generateTraceId();

    return new Trace(this, {
      name: options?.name,
      traceId,
      includeUserMeta: options?.includeUserMeta ?? DEFAULT_INCLUDE_USER_META,
      maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryBackoff: options?.retryBackoff ?? DEFAULT_RETRY_BACKOFF,
      keepAliveIntervalMs: this.keepAliveIntervalMs,
      autoClose: options?.autoClose ?? DEFAULT_AUTO_CLOSE,
      provider: options?.provider ?? this.provider,
      autoKeepAlive: options?.autoKeepAlive ?? !options?.traceId,
    });
  }
}
