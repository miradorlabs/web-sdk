/**
 * ParallaxClient - Main client for interacting with the Parallax Gateway
 */
import {
  CreateTraceRequest,
  UpdateTraceRequest,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { ParallaxGatewayServiceClient } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb';
import { ParallaxTrace } from './trace';
import type { ParallaxClientOptions, TraceOptions } from './types';

const DEFAULT_API_URL = 'https://parallax-gateway-dev.mirador.org:443';

/**
 * Main client for interacting with the Parallax Gateway API
 */
export class ParallaxClient {
  public apiUrl: string;
  public apiKey: string;
  private client: ParallaxGatewayServiceClient;

  /**
   * Create a new ParallaxClient instance
   * @param apiKey Required API key for authentication (sent as x-parallax-api-key header)
   * @param options Optional configuration options
   */
  constructor(apiKey: string, options?: ParallaxClientOptions) {
    this.apiKey = apiKey;
    this.apiUrl = options?.apiUrl || DEFAULT_API_URL;

    const credentials = { 'x-parallax-api-key': apiKey };
    this.client = new ParallaxGatewayServiceClient(this.apiUrl, credentials);
  }

  /** @internal */
  async _sendTrace(request: CreateTraceRequest) {
    const metadata = { 'x-parallax-api-key': this.apiKey };
    return await this.client.createTrace(request, metadata);
  }

  /** @internal */
  async _updateTrace(request: UpdateTraceRequest) {
    const metadata = { 'x-parallax-api-key': this.apiKey };
    return await this.client.updateTrace(request, metadata);
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
      autoFlush: options?.autoFlush ?? true,
      flushPeriod: options?.flushPeriod ?? 50,
      includeClientMeta: options?.includeClientMeta ?? true,
    });
  }
}
