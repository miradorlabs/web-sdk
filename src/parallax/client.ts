/**
 * ParallaxClient - Main client for interacting with the Parallax Gateway
 */
import {
  CreateTraceRequest,
  UpdateTraceRequest,
  KeepAliveRequest,
  CloseTraceRequest,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { ParallaxGatewayServiceClient } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb';
import { ParallaxTrace } from './trace';
import type { ParallaxClientOptions, TraceOptions } from './types';

// Default configuration values
const DEFAULT_API_URL = 'https://parallax-gateway-dev.mirador.org:443';
const DEFAULT_AUTO_FLUSH = true;
const DEFAULT_FLUSH_PERIOD_MS = 10;
const DEFAULT_INCLUDE_CLIENT_META = true;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_BACKOFF = 1000;
const DEFAULT_KEEP_ALIVE_INTERVAL_MS = 10000;

/**
 * Main client for interacting with the Parallax Gateway API
 */
export class ParallaxClient {
  public apiUrl: string;
  public apiKey: string;
  public keepAliveIntervalMs: number;
  private client: ParallaxGatewayServiceClient;

  /**
   * Create a new ParallaxClient instance
   * @param apiKey Required API key for authentication (sent as x-parallax-api-key header)
   * @param options Optional configuration options
   */
  constructor(apiKey: string, options?: ParallaxClientOptions) {
    this.apiKey = apiKey;
    this.apiUrl = options?.apiUrl || DEFAULT_API_URL;
    this.keepAliveIntervalMs = options?.keepAliveIntervalMs || DEFAULT_KEEP_ALIVE_INTERVAL_MS;

    const credentials = { 'x-parallax-api-key': apiKey };
    this.client = new ParallaxGatewayServiceClient(this.apiUrl, credentials);
  }

  /** @internal */
  async _sendTrace(request: CreateTraceRequest) {
    const metadata = { 'x-parallax-api-key': this.apiKey };
    const timestamp = new Timestamp();
    timestamp.fromDate(new Date());
    request.setSendClientTimestamp(timestamp);
    return await this.client.createTrace(request, metadata);
  }

  /** @internal */
  async _updateTrace(request: UpdateTraceRequest) {
    const metadata = { 'x-parallax-api-key': this.apiKey };
    const timestamp = new Timestamp();
    timestamp.fromDate(new Date());
    request.setSendClientTimestamp(timestamp);
    return await this.client.updateTrace(request, metadata);
  }

  /** @internal */
  async _keepAlive(request: KeepAliveRequest) {
    const metadata = { 'x-parallax-api-key': this.apiKey };
    return await this.client.keepAlive(request, metadata);
  }

  /** @internal */
  async _closeTrace(request: CloseTraceRequest) {
    const metadata = { 'x-parallax-api-key': this.apiKey };
    return await this.client.closeTrace(request, metadata);
  }

  /**
   * Create a new trace builder
   *
   * @param options Trace configuration options
   * @returns A ParallaxTrace builder instance
   */
  trace(options?: TraceOptions): ParallaxTrace {
    return new ParallaxTrace(this, {
      name: options?.name,
      autoFlush: options?.autoFlush ?? DEFAULT_AUTO_FLUSH,
      flushPeriodMs: options?.flushPeriodMs ?? DEFAULT_FLUSH_PERIOD_MS,
      includeClientMeta: options?.includeClientMeta ?? DEFAULT_INCLUDE_CLIENT_META,
      maxRetries: options?.maxRetries ?? DEFAULT_MAX_RETRIES,
      retryBackoff: options?.retryBackoff ?? DEFAULT_RETRY_BACKOFF,
      keepAliveIntervalMs: this.keepAliveIntervalMs,
    });
  }
}
