/**
 * Client - Main client for interacting with the Mirador Ingest Gateway
 */
import {
  CreateTraceRequest,
  UpdateTraceRequest,
  KeepAliveRequest,
  CloseTraceRequest,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { IngestGatewayServiceClient } from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb';
import { Trace, NoopTrace } from './trace';
import type { ClientOptions, TraceOptions, Logger, TraceCallbacks } from './types';

// Default configuration values
const DEFAULT_API_URL = 'https://ingest.mirador.org:443';
const DEFAULT_INCLUDE_USER_META = true;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BACKOFF = 500;
const DEFAULT_KEEP_ALIVE_INTERVAL_MS = 10000;
const DEFAULT_AUTO_CLOSE = false;
const DEFAULT_CALL_TIMEOUT_MS = 5000;
const DEFAULT_MAX_TRACE_LIFETIME_MS = 0; // 0 = disabled

/** Default no-op logger that silences all output */
const NOOP_LOGGER: Logger = {
  debug() {},
  warn() {},
  error() {},
};

/** Default console logger (uses dynamic lookup so test spies work) */
const CONSOLE_LOGGER: Logger = {
  debug(...args: unknown[]) { console.debug(...args); },
  warn(...args: unknown[]) { console.warn(...args); },
  error(...args: unknown[]) { console.error(...args); },
};

/**
 * Main Client for interacting with Mirador's Ingest Gateway API
 */
export class Client {
  public apiUrl: string;
  public apiKey: string;
  public keepAliveIntervalMs: number;
  private callTimeoutMs: number;
  private client: IngestGatewayServiceClient;
  private provider?: import('./types').EIP1193Provider;

  /** @internal */ readonly logger: Logger;
  /** @internal */ readonly callbacks?: TraceCallbacks;
  /** @internal */ rateLimitedUntil: number = 0;

  private sampleRate: number;
  private sampler?: (options: TraceOptions) => boolean;

  /**
   * Create a new Client instance
   * @param apiKey Required API key for authentication (sent as x-ingest-api-key header)
   * @param options Optional configuration options
   */
  constructor(apiKey: string, options?: ClientOptions) {
    this.apiKey = apiKey;
    this.apiUrl = options?.apiUrl || DEFAULT_API_URL;
    this.keepAliveIntervalMs = options?.keepAliveIntervalMs || DEFAULT_KEEP_ALIVE_INTERVAL_MS;
    this.callTimeoutMs = options?.callTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS;
    this.provider = options?.provider;
    this.callbacks = options?.callbacks;
    this.sampleRate = options?.sampleRate ?? 1;
    this.sampler = options?.sampler;

    // Configure logger: custom > debug console > noop
    if (options?.logger) {
      this.logger = options.logger;
    } else if (options?.debug) {
      this.logger = CONSOLE_LOGGER;
    } else {
      this.logger = NOOP_LOGGER;
    }

    const credentials = { 'x-ingest-api-key': apiKey };
    this.client = new IngestGatewayServiceClient(this.apiUrl, credentials);
  }

  /** @internal */
  async _sendTrace(request: CreateTraceRequest) {
    const metadata = { 'x-ingest-api-key': this.apiKey };
    const timestamp = new Timestamp();
    timestamp.fromDate(new Date());
    request.setSendClientTimestamp(timestamp);
    return await this.client.createTrace(request, metadata);
  }

  /** @internal */
  async _updateTrace(request: UpdateTraceRequest) {
    const metadata = { 'x-ingest-api-key': this.apiKey };
    const timestamp = new Timestamp();
    timestamp.fromDate(new Date());
    request.setSendClientTimestamp(timestamp);
    return await this.client.updateTrace(request, metadata);
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
    // Sampling: check if this trace should be sampled out
    const traceOptions = options ?? {};
    if (this.sampler) {
      if (!this.sampler(traceOptions)) {
        return new NoopTrace();
      }
    } else if (this.sampleRate < 1) {
      if (Math.random() >= this.sampleRate) {
        return new NoopTrace();
      }
    }

    return new Trace(this, {
      name: traceOptions.name,
      traceId: traceOptions.traceId,
      includeUserMeta: traceOptions.includeUserMeta ?? DEFAULT_INCLUDE_USER_META,
      maxRetries: traceOptions.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryBackoff: traceOptions.retryBackoff ?? DEFAULT_RETRY_BACKOFF,
      keepAliveIntervalMs: this.keepAliveIntervalMs,
      autoClose: traceOptions.autoClose ?? DEFAULT_AUTO_CLOSE,
      provider: traceOptions.provider ?? this.provider,
      autoKeepAlive: traceOptions.autoKeepAlive ?? !traceOptions.traceId,
      callTimeoutMs: this.callTimeoutMs,
      maxTraceLifetimeMs: traceOptions.maxTraceLifetimeMs ?? DEFAULT_MAX_TRACE_LIFETIME_MS,
      maxQueueSize: traceOptions.maxQueueSize,
      callbacks: traceOptions.callbacks ?? this.callbacks,
    });
  }
}
