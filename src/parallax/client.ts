/**
 * ParallaxClient - Main client for interacting with the Parallax Gateway
 */
import {
  CreateTraceRequest,
  CreateTraceResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { ParallaxGatewayServiceClient } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { ParallaxTrace } from './trace';
import { getClientMetadata } from './metadata';
import type { CreateTraceOptions } from './types';

const DEFAULT_API_URL = 'https://parallax-gateway.dev.mirador.org:443';

const debugIssue = (trace: string, error: Error) => {
  console.error(`[ParallaxClient][${trace}] Error:`, error);
};

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
   * @param apiUrl Optional gateway URL (defaults to parallax-gateway.dev.mirador.org:443)
   */
  constructor(apiKey: string, apiUrl?: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl || DEFAULT_API_URL;

    // API key is required - always include in credentials
    const credentials = { 'x-parallax-api-key': apiKey };

    // Initialize the gRPC-Web client
    this.client = new ParallaxGatewayServiceClient(this.apiUrl, credentials);
  }

  /**
   * Gather client metadata for traces
   * Returns a metadata object with client environment details
   * Note: IP address is captured by the backend from request headers
   * @returns metadata
   */
  getClientMetadata(): { [key: string]: string } {
    return getClientMetadata();
  }

  /**
   * Creates a CreateTraceRequest with optional attributes and client metadata
   * @param options Options for creating the trace request
   * @returns a CreateTraceRequest object to be used for the createTrace request
   */
  async createTraceRequest({
    name,
    tags,
    attr,
    includeClientMeta = true,
  }: CreateTraceOptions): Promise<CreateTraceRequest> {
    const createTraceReq = new CreateTraceRequest();
    createTraceReq.setName(name);
    if (tags) {
      createTraceReq.setTagsList(tags);
    }
    const traceAttrs = createTraceReq.getAttributesMap();

    // Add client metadata first so user attrs can override
    if (includeClientMeta) {
      const clientMetadata = this.getClientMetadata();
      Object.entries(clientMetadata).forEach(([key, value]) => {
        traceAttrs.set(`client.${key}`, value);
      });
    }

    // User attrs applied after, allowing override of client.* keys
    if (attr) {
      Object.entries(attr).forEach(([key, value]) => {
        traceAttrs.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
    }
    return createTraceReq;
  }

  /**
   * Create a new trace (happy-path API)
   *
   * @example
   * ```typescript
   * const response = await client.createTrace({
   *   name: 'UserAction',
   *   attr: { userId: '123', action: 'click' },
   *   tags: ['ui', 'interaction'],
   * });
   * ```
   *
   * @param options Options for creating the trace
   * @returns Response from the create trace operation
   */
  async createTrace(options: CreateTraceOptions): Promise<CreateTraceResponse>;

  /**
   * Create a new trace (advanced API)
   * @param request Pre-built CreateTraceRequest
   * @returns Response from the create trace operation
   */
  async createTrace(request: CreateTraceRequest): Promise<CreateTraceResponse>;

  async createTrace(
    paramsOrOptions: CreateTraceRequest | CreateTraceOptions
  ): Promise<CreateTraceResponse> {
    try {
      let request: CreateTraceRequest;

      // Check if it's a CreateTraceOptions object (has 'name' property)
      if ('name' in paramsOrOptions && typeof paramsOrOptions.name === 'string') {
        const options = paramsOrOptions as CreateTraceOptions;

        // Validation
        if (!options.name || options.name.trim() === '') {
          throw new Error('Trace name is required and cannot be empty');
        }

        request = new CreateTraceRequest();
        request.setName(options.name);

        if (options.tags) {
          request.setTagsList(options.tags);
        }

        const traceAttrs = request.getAttributesMap();

        // Add client metadata first so user attrs can override
        if (options.includeClientMeta !== false) {
          const clientMetadata = this.getClientMetadata();
          Object.entries(clientMetadata).forEach(([key, value]) => {
            traceAttrs.set(`client.${key}`, value);
          });
        }

        // User attrs applied after
        if (options.attr) {
          Object.entries(options.attr).forEach(([key, value]) => {
            traceAttrs.set(
              key,
              typeof value === 'object' ? JSON.stringify(value) : String(value)
            );
          });
        }

        // Add events
        if (options.events && options.events.length > 0) {
          const eventsList: CreateTraceRequest.Event[] = [];
          for (const event of options.events) {
            const eventMsg = new CreateTraceRequest.Event();
            eventMsg.setEventName(event.name);
            if (event.details) {
              const detailsStr =
                typeof event.details === 'object'
                  ? JSON.stringify(event.details)
                  : event.details;
              eventMsg.setDetails(detailsStr);
            }
            const timestamp = new Timestamp();
            timestamp.fromDate(event.timestamp || new Date());
            eventMsg.setTimestamp(timestamp);
            eventsList.push(eventMsg);
          }
          request.setEventsList(eventsList);
        }

        // Add txHashHint
        if (options.txHashHint) {
          const txHint = new CreateTraceRequest.TxHashHint();
          txHint.setTxHash(options.txHashHint.txHash);
          txHint.setChainId(options.txHashHint.chainId);
          if (options.txHashHint.details) {
            txHint.setDetails(options.txHashHint.details);
          }
          const timestamp = new Timestamp();
          timestamp.fromDate(new Date());
          txHint.setTimestamp(timestamp);
          request.setTxHashHint(txHint);
        }
      } else {
        request = paramsOrOptions as CreateTraceRequest;
      }

      const metadata = { 'x-parallax-api-key': this.apiKey };
      return await this.client.createTrace(request, metadata);
    } catch (_error) {
      debugIssue('createTrace', new Error('Error creating trace'));
      throw _error;
    }
  }

  /**
   * Create a new trace builder
   *
   * Example usage:
   * ```typescript
   * const response = await client.trace("swap_execution")
   *   .addAttribute("user", "0xabc...")
   *   .addAttribute("slippage_bps", 25)
   *   .addTag("dex")
   *   .addTag("swap")
   *   .addEvent("wallet_connected", { wallet: "MetaMask" })
   *   .addEvent("quote_received")
   *   .submit("0x123...", "ethereum");
   * ```
   *
   * @param name The name of the trace
   * @param includeClientMeta Optional flag to automatically include client metadata
   * @returns A ParallaxTrace builder instance
   */
  trace(name: string, includeClientMeta: boolean = true): ParallaxTrace {
    return new ParallaxTrace(this, name, includeClientMeta);
  }
}
