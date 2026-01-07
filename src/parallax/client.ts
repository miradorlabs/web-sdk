/**
 * ParallaxClient - Main client for interacting with the Parallax Gateway
 */
import {
  CreateTraceRequest,
  CreateTraceResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { ParallaxGatewayServiceClient } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb';
import { ParallaxTrace } from './trace';

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
   * Send a CreateTraceRequest to the gateway
   * @param request Pre-built CreateTraceRequest
   * @returns Response from the create trace operation
   */
  async createTrace(request: CreateTraceRequest): Promise<CreateTraceResponse> {
    try {
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
   *   .setTxHint("0x123...", "ethereum")
   *   .create();
   * ```
   *
   * @param name Optional name of the trace (defaults to empty string)
   * @param includeClientMeta Optional flag to automatically include client metadata
   * @returns A ParallaxTrace builder instance
   */
  trace(name: string = '', includeClientMeta: boolean = true): ParallaxTrace {
    return new ParallaxTrace(this, name, includeClientMeta);
  }
}
