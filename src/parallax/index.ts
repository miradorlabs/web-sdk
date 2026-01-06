// Parallax SDK Web Client
import {
  CreateTraceRequest,
  CreateTraceResponse,
} from "mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb";
import { ParallaxGatewayServiceClient } from "mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

const GRPC_GATEWAY_API_URL = "https://parallax-gateway.dev.mirador.org:443";

const debugIssue = (trace: string, error: Error) => {
  // Handle our own debugging / logging here
  console.error(`[ParallaxClient][${trace}] Error:`, error);
}

class ParallaxClient {
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
    this.apiUrl = apiUrl || GRPC_GATEWAY_API_URL;

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
    const metadata: { [key: string]: string } = {};
    const ua = navigator.userAgent;

    // Browser detection with version
    if (ua.includes('Edg/')) {
      metadata.browser = 'Edge';
      metadata.browserVersion = ua.match(/Edg\/(\d+(\.\d+)?)/)?.[1] || 'unknown';
    } else if (ua.includes('Chrome/')) {
      metadata.browser = 'Chrome';
      metadata.browserVersion = ua.match(/Chrome\/(\d+(\.\d+)?)/)?.[1] || 'unknown';
    } else if (ua.includes('Firefox/')) {
      metadata.browser = 'Firefox';
      metadata.browserVersion = ua.match(/Firefox\/(\d+(\.\d+)?)/)?.[1] || 'unknown';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      metadata.browser = 'Safari';
      metadata.browserVersion = ua.match(/Version\/(\d+(\.\d+)?)/)?.[1] || 'unknown';
    } else {
      metadata.browser = 'Unknown';
      metadata.browserVersion = 'unknown';
    }

    // OS detection with version
    if (ua.includes('Windows NT')) {
      metadata.os = 'Windows';
      const ntVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1];
      metadata.osVersion = ntVersion === '10.0' ? '10/11' : ntVersion || 'unknown';
    } else if (ua.includes('Mac OS X')) {
      metadata.os = 'macOS';
      metadata.osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'unknown';
    } else if (ua.includes('Android')) {
      metadata.os = 'Android';
      metadata.osVersion = ua.match(/Android (\d+(\.\d+)?)/)?.[1] || 'unknown';
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      metadata.os = 'iOS';
      metadata.osVersion = ua.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'unknown';
    } else if (ua.includes('Linux')) {
      metadata.os = 'Linux';
      metadata.osVersion = 'unknown';
    } else {
      metadata.os = 'Unknown';
      metadata.osVersion = 'unknown';
    }

    // Device type
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
      metadata.deviceType = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
    } else {
      metadata.deviceType = 'desktop';
    }

    // Core browser info
    metadata.userAgent = ua;
    metadata.language = navigator.language;
    metadata.languages = navigator.languages?.join(',') || navigator.language;

    // Screen and display
    metadata.screenWidth = window.screen.width.toString();
    metadata.screenHeight = window.screen.height.toString();
    metadata.viewportWidth = window.innerWidth.toString();
    metadata.viewportHeight = window.innerHeight.toString();
    metadata.colorDepth = window.screen.colorDepth.toString();
    metadata.pixelRatio = window.devicePixelRatio?.toString() || '1';

    // Hardware capabilities
    metadata.cpuCores = navigator.hardwareConcurrency?.toString() || 'unknown';
    // deviceMemory is a non-standard Chrome API
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (nav.deviceMemory) {
      metadata.deviceMemory = nav.deviceMemory.toString();
    }

    // Touch support
    metadata.touchSupport = ('ontouchstart' in window || navigator.maxTouchPoints > 0).toString();
    metadata.maxTouchPoints = navigator.maxTouchPoints?.toString() || '0';

    // Connection info (Network Information API - non-standard)
    interface NetworkInformation {
      effectiveType?: string;
      downlink?: number;
      saveData?: boolean;
    }
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      metadata.connectionType = connection.effectiveType || 'unknown';
      if (connection.downlink) {
        metadata.connectionSpeed = connection.downlink.toString();
      }
      if (connection.saveData !== undefined) {
        metadata.dataSaver = connection.saveData.toString();
      }
    }

    // Browser state
    metadata.cookiesEnabled = navigator.cookieEnabled.toString();
    metadata.online = navigator.onLine.toString();
    metadata.doNotTrack = navigator.doNotTrack || 'unspecified';

    // Timezone
    metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    metadata.timezoneOffset = new Date().getTimezoneOffset().toString();

    // Page context
    metadata.url = window.location.href;
    metadata.origin = window.location.origin;
    metadata.pathname = window.location.pathname;
    metadata.referrer = document.referrer || 'direct';

    // Document state
    metadata.documentVisibility = document.visibilityState;

    return metadata;
  }

  /**
   * Creates a CreateTraceRequest with optional attributes and client metadata
   * @param name name of the trace
   * @param tags optional tags for trace
   * @param attr optional attributes for trace
   * @param includeClientMeta optional flag to include client metadata (ip, browser, os, etc)
   * @returns a CreateTraceRequest object to be used for the createTrace request
   */
  async createTraceRequest({name, tags, attr, includeClientMeta = true}: {name: string, tags?: string[], attr?: { [key: string]: string }, includeClientMeta?: boolean}): Promise<CreateTraceRequest> {
    const createTraceReq = new CreateTraceRequest();
    createTraceReq.setName(name);
    if (tags) {
      createTraceReq.setTagsList(tags);
    }
    const traceAttrs = createTraceReq.getAttributesMap();

    if (attr) {
      Object.entries(attr).forEach(([key, value]) => {
        if (key.includes('client.')) {
          console.warn(`Attribute key "${key}" is reserved for client metadata. It will be prefixed with "custom."`);
        } else {
          traceAttrs.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
    }
    if (includeClientMeta) {
      const clientMetadata = this.getClientMetadata();
      Object.entries(clientMetadata).forEach(([key, value]) => {
        traceAttrs.set(`client.${key}`, value);
      });
    }
    return createTraceReq;
  }


  /**
   * Create a new trace
   * @param params Parameters to create a new trace
   * @returns Response from the create trace operation
   */
  async createTrace(params: CreateTraceRequest): Promise<CreateTraceResponse> {
    try {
      const metadata = { 'x-parallax-api-key': this.apiKey };
      return await this.client.createTrace(params, metadata);
    } catch (_error) {
      debugIssue("createTrace", new Error('Error creating trace'));
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

/**
 * Builder class for constructing traces with method chaining
 * Automatically handles web-specific features like client metadata
 */
class ParallaxTrace {
  private name: string;
  private attributes: { [key: string]: string } = {};
  private tags: string[] = [];
  private events: Array<{ eventName: string; details?: string; timestamp: Date }> = [];
  private txHashHint?: {
    txHash: string;
    chainId: string;
    details?: string;
    timestamp: Date;
  };
  private client: ParallaxClient;
  private includeClientMeta: boolean;

  constructor(client: ParallaxClient, name: string, includeClientMeta: boolean = true) {
    this.client = client;
    this.name = name;
    this.includeClientMeta = includeClientMeta;
  }

  /**
   * Add an attribute to the trace
   * @param key Attribute key
   * @param value Attribute value (will be converted to string)
   * @returns This trace builder for chaining
   */
  addAttribute(key: string, value: string | number | boolean): this {
    this.attributes[key] = String(value);
    return this;
  }

  /**
   * Add multiple attributes to the trace
   * @param attributes Object containing key-value pairs
   * @returns This trace builder for chaining
   */
  addAttributes(attributes: { [key: string]: string | number | boolean }): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.attributes[key] = String(value);
    }
    return this;
  }

  /**
   * Add a tag to the trace
   * @param tag Tag to add
   * @returns This trace builder for chaining
   */
  addTag(tag: string): this {
    this.tags.push(tag);
    return this;
  }

  /**
   * Add multiple tags to the trace
   * @param tags Array of tags to add
   * @returns This trace builder for chaining
   */
  addTags(tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  /**
   * Add an event to the trace
   * @param eventName Name of the event
   * @param details Optional details (can be a JSON string or object that will be stringified)
   * @param timestamp Optional timestamp (defaults to current time)
   * @returns This trace builder for chaining
   */
  addEvent(eventName: string, details?: string | object, timestamp?: Date): this {
    const detailsString = typeof details === 'object' && details !== null
      ? JSON.stringify(details)
      : details;

    this.events.push({
      eventName,
      details: detailsString,
      timestamp: timestamp || new Date(),
    });
    return this;
  }

  /**
   * Set or update the transaction hash hint
   * @param txHash Transaction hash
   * @param chainId Chain ID (e.g., "ethereum", "polygon")
   * @param details Optional details about the transaction
   * @param timestamp Optional timestamp (defaults to current time)
   * @returns This trace builder for chaining
   */
  setTxHash(txHash: string, chainId: string, details?: string, timestamp?: Date): this {
    this.txHashHint = {
      txHash,
      chainId,
      details,
      timestamp: timestamp || new Date(),
    };
    return this;
  }

  /**
   * Submit the trace without a transaction hash hint (if not already set via setTxHash)
   * @returns Response from the create trace operation
   */
  async submit(): Promise<CreateTraceResponse>;

  /**
   * Submit the trace with a transaction hash hint (overrides any previously set via setTxHash)
   * @param txHash Transaction hash
   * @param chainId Chain ID (e.g., "ethereum", "polygon")
   * @param details Optional details about the transaction
   * @returns Response from the create trace operation
   */
  async submit(txHash: string, chainId: string, details?: string): Promise<CreateTraceResponse>;

  async submit(txHash?: string, chainId?: string, details?: string): Promise<CreateTraceResponse> {
    // If txHash and chainId are provided in submit(), they override any previously set txHashHint
    const finalTxHashHint = txHash && chainId ? {
      txHash,
      chainId,
      details,
      timestamp: new Date(),
    } : this.txHashHint;

    // Build the CreateTraceRequest
    const request = new CreateTraceRequest();
    request.setName(this.name);
    request.setTagsList(this.tags);

    // Add attributes
    const attrsMap = request.getAttributesMap();
    for (const [key, value] of Object.entries(this.attributes)) {
      attrsMap.set(key, value);
    }

    // Add client metadata if requested
    if (this.includeClientMeta) {
      const clientMetadata = this.client.getClientMetadata();
      for (const [key, value] of Object.entries(clientMetadata)) {
        attrsMap.set(`client.${key}`, value);
      }
    }

    // Add events
    const eventsList: CreateTraceRequest.Event[] = [];
    for (const event of this.events) {
      const eventMsg = new CreateTraceRequest.Event();
      eventMsg.setEventName(event.eventName);
      if (event.details) {
        eventMsg.setDetails(event.details);
      }
      const timestamp = new Timestamp();
      timestamp.fromDate(event.timestamp);
      eventMsg.setTimestamp(timestamp);
      eventsList.push(eventMsg);
    }
    request.setEventsList(eventsList);

    // Add transaction hash hint if present
    if (finalTxHashHint) {
      const txHint = new CreateTraceRequest.TxHashHint();
      txHint.setTxHash(finalTxHashHint.txHash);
      txHint.setChainId(finalTxHashHint.chainId);
      if (finalTxHashHint.details) {
        txHint.setDetails(finalTxHashHint.details);
      }
      const timestamp = new Timestamp();
      timestamp.fromDate(finalTxHashHint.timestamp);
      txHint.setTimestamp(timestamp);
      request.setTxHashHint(txHint);
    }

    return this.client.createTrace(request);
  }
}

export { ParallaxClient, ParallaxTrace };
