// Parallax SDK Web Client
import {
  CreateTraceRequest,
  CreateTraceResponse,
  StartSpanRequest,
  StartSpanResponse,
  FinishSpanRequest,
  FinishSpanResponse,
  AddSpanEventRequest,
  AddSpanEventResponse,
  AddSpanErrorRequest,
  AddSpanErrorResponse,
  AddSpanHintRequest,
  AddSpanHintResponse,
} from "mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb";
import { ParallaxGatewayServiceClient } from "mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb";

const GRPC_GATEWAY_API_URL = "https://gateway-parallax-dev.platform.svc.cluster.local:50053";

const debugIssue = (trace: string, error: Error) => {
  // Handle our own debugging / logging here
  console.error(`[ParallaxClient][${trace}] Error:`, error);
}

class ParallaxClient {
  public apiUrl: string = GRPC_GATEWAY_API_URL;
  private client: ParallaxGatewayServiceClient;

  constructor(public apiKey?: string, apiUrl?: string) {
    if (apiUrl) {
      this.apiUrl = apiUrl;
    }

    // Create credentials object with API key if provided
    const credentials = apiKey ? { 'x-api-key': apiKey } : undefined;

    // Initialize the gRPC-Web client
    this.client = new ParallaxGatewayServiceClient(this.apiUrl, credentials);
  }

  /**
   * Gather client metadata for traces/spans
   * Returns a metadata object with client environment details
   * This includes browser, OS, screen size, IP address, and more
   * @returns metadata
   */
  async getClientMetadata(): Promise<{ [key: string]: string }> {
    const metadata: { [key: string]: string } = {};
    // Browser info
    metadata.userAgent = navigator.userAgent;
    metadata.platform = navigator.platform;
    metadata.language = navigator.language;

    // Screen info
    metadata.screenWidth = window.screen.width.toString();
    metadata.screenHeight = window.screen.height.toString();
    metadata.viewportWidth = window.innerWidth.toString();
    metadata.viewportHeight = window.innerHeight.toString();

    // Try to get IP address (non-blocking)
    // Note: This may be blocked by Content Security Policy (CSP)
    // If blocked, the backend should capture IP from request headers instead
    try {
      // Use ipify API (simple and fast JSON response)
      const ipResponse: Response | Error = await fetch('https://api.ipify.org?format=json');

      if (ipResponse && ipResponse.ok) {
        const data = await ipResponse.json();
        if (data && data.ip) {
          metadata.ip = data.ip;
        } else {
          metadata.ip = 'client_unavailable';
        }
      } else {
        metadata.ip = 'client_unavailable';
      }
    } catch (error) {
      // IP lookup failed (CSP block, timeout, or network error)
      // This is expected if CSP blocks external requests
      // Backend should capture IP from request headers instead
      if (error instanceof Error && error.message.includes('Content Security Policy')) {
        console.debug('IP fetch blocked by CSP - backend will capture from headers');
      } else {
        console.debug('Could not fetch IP address');
      }
      metadata.ip = 'client_unavailable';
    }

    // Browser details (parse from user agent)
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) {
      metadata.browser = 'Chrome';
    } else if (ua.includes('Firefox')) {
      metadata.browser = 'Firefox';
    } else if (ua.includes('Safari')) {
      metadata.browser = 'Safari';
    } else if (ua.includes('Edge')) {
      metadata.browser = 'Edge';
    } else {
      metadata.browser = 'Unknown';
    }

    // OS detection
    if (ua.includes('Windows')) {
      metadata.os = 'Windows';
    } else if (ua.includes('Mac')) {
      metadata.os = 'macOS';
    } else if (ua.includes('Linux')) {
      metadata.os = 'Linux';
    } else if (ua.includes('Android')) {
      metadata.os = 'Android';
    } else if (ua.includes('iOS')) {
      metadata.os = 'iOS';
    } else {
      metadata.os = 'Unknown';
    }

    // Timezone
    metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    metadata.timezoneOffset = new Date().getTimezoneOffset().toString();

    // Page info
    metadata.url = window.location.href;
    metadata.referrer = document.referrer || 'direct';

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
  async createTraceRequest({name, tags, attr, includeClientMeta = false}: {name: string, tags?: string[], attr?: { [key: string]: string }, includeClientMeta?: boolean}): Promise<CreateTraceRequest> {
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
      const clientMetadata = await this.getClientMetadata();
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
      return await this.client.createTrace(params, null);
    } catch (_error) {
      debugIssue("createTrace", new Error('Error creating trace'));
      throw _error;
    }
  }

  /**
   * Create a StartSpanRequest with optional attributes and client metadata
   * @param traceId trace id to associate the span with
   * @param name name of the span
   * @param parentSpanId (optional) create a span off a parent span id
   * @param attr (optional) attributes to add to the span
   * @param includeClientMeta (optional) flag to include client metadata (ip, browser, os, etc)
   * @returns 
   */
  async createStartSpanRequest({ traceId, name, parentSpanId, attr, includeClientMeta = false}: {traceId: string, name: string, parentSpanId?: string, attr?: { [key: string]: string }, includeClientMeta?: boolean}): Promise<StartSpanRequest> {
    const startSpanReq = new StartSpanRequest();
    startSpanReq.setTraceId(traceId);
    startSpanReq.setName(name);
    if (parentSpanId) {
      startSpanReq.setParentSpanId(parentSpanId);
    }
    const spanAttrs = startSpanReq.getAttributesMap();

    if (attr) {
      Object.entries(attr).forEach(([key, value]) => {
        if (key.includes('client.')) {
          console.warn(`Attribute key "${key}" is reserved for client metadata. It will be prefixed with "custom."`);
        } else {
          spanAttrs.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
    }
    try {
      if (includeClientMeta) {
        const clientMetadata = await this.getClientMetadata();
        Object.entries(clientMetadata).forEach(([key, value]) => {
          spanAttrs.set(`client.${key}`, value);
        });
      }
    } catch (error) {
      console.error('Error gathering client metadata for span:', error);
    }
    return startSpanReq;
  }

  /**
   * Start a new span within a trace
   * @param params Parameters to start a new span
   */
  async startSpan(params: StartSpanRequest): Promise<StartSpanResponse> {
    try {
      return await this.client.startSpan(params, null);
    } catch (_error) {
      debugIssue("startSpan", new Error('Error starting span'));
      throw _error;
    }
  }

  /**
   * Create a FinishSpanRequest
   * @param params Parameters to finish a span - traceId, spanId, status (optional) (success, errorMessage) 
   * @returns FinishSpanRequest
   */
  createFinishSpanRequest({ traceId, spanId, status }: { traceId: string, spanId: string, status?: { success: boolean, errorMessage: string } }): FinishSpanRequest {
    const request = new FinishSpanRequest();
    request.setTraceId(traceId);
    request.setSpanId(spanId);
    if (status !== undefined) {
      const spanStatus = new FinishSpanRequest.SpanStatus();
      spanStatus.setCode(status.success ? FinishSpanRequest.SpanStatus.StatusCode.STATUS_CODE_OK : FinishSpanRequest.SpanStatus.StatusCode.STATUS_CODE_ERROR);
      if (status.errorMessage) {
        spanStatus.setMessage(status.errorMessage);
      }
      request.setStatus(spanStatus);
    }
    return request;
  }

  /**
   * Finish a span within a trace
   * @param params Parameters to finish a span
   */
  async finishSpan(params: FinishSpanRequest): Promise<FinishSpanResponse> {
    try {
      return await this.client.finishSpan(params, null);
    } catch (_error) {
      debugIssue("finishSpan", new Error('Error finishing span'));
      throw _error;
    }
  }

  /**
   * Creates the add span event request
   * @param params - Parameters to create an AddSpanEventRequest - traceId, spanId, eventName, attr (optional) 
   * @returns AddSpanEventRequest
   */
  createAddSpanEventRequest({ traceId, spanId, eventName, attr }: { traceId: string, spanId: string, eventName: string,  attr?: { [key: string]: string } }): AddSpanEventRequest {
    const request = new AddSpanEventRequest();
    request.setTraceId(traceId);
    request.setSpanId(spanId);
    request.setEventName(eventName);
    const eventAttrs = request.getAttributesMap();
    if (attr) {
      Object.entries(attr).forEach(([key, value]) => {
        eventAttrs.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      });
    }
    eventAttrs.set('timestamp', new Date().toISOString());
    return request;
  }

  /**
   * Add an event to a span
   * @param params Parameters to add an event to a span
   */
  async addSpanEvent(params: AddSpanEventRequest): Promise<AddSpanEventResponse> {
    try {
      return await this.client.addSpanEvent(params, null);
    } catch (_error) {
      debugIssue("addSpanEvent", new Error('Error adding span event'));
      throw _error;
    }
  }

  /**
   * Creates the add span error request
   * @param params - params used to generate the error request ( traceid, span id, error message, error type, stack trace)
   * @returns AddSpanErrorRequest
   */
  createAddSpanErrorRequest({ traceId, spanId, errorMessage, errorType, stackTrace }: { traceId: string, spanId: string, errorMessage: string, errorType?: string, stackTrace?: string }): AddSpanErrorRequest {
    const request = new AddSpanErrorRequest();
    request.setTraceId(traceId);
    request.setSpanId(spanId);
    request.setMessage(errorMessage);
    if (errorType) {
      request.setErrorType(errorType);
    }
    if (stackTrace) {
      request.setStackTrace(stackTrace);
    }
    return request;
  }

  /**
   * Add an error to a span
   * @param params Parameters to add an error to a span
   */
  async addSpanError(params: AddSpanErrorRequest): Promise<AddSpanErrorResponse> {
    try {
      return await this.client.addSpanError(params, null);
    } catch (_error) {
      debugIssue("addSpanError", new Error('Error adding span error'));
      throw _error;
    }
  }

  /**
   * Creates the add span hint request
   * @param params - params used to generate the span hint (trace id, parentSpanId, txHash and chainId)
   * @returns AddSpanHintRequest
   */
  createAddSpanHintRequest({ traceId, parentSpanId, txHash, chainId }: { traceId: string, parentSpanId: string, txHash?: string, chainId?: number }): AddSpanHintRequest {
    const hintReq = new AddSpanHintRequest();
    hintReq.setTraceId(traceId);
    hintReq.setParentSpanId(parentSpanId);

    if (txHash && chainId !== undefined) {
      const chainTxReq = new AddSpanHintRequest.ChainTransaction();
      chainTxReq.setTxHash(txHash);
      chainTxReq.setChainId(chainId);
      hintReq.setChainTransaction(chainTxReq);
    }
    return hintReq;
  }

  /**
   * Add a hint to a span
   * @param params Parameters to add a hint to a span
   */
  async addSpanHint(params: AddSpanHintRequest): Promise<AddSpanHintResponse> {
    try {
      return await this.client.addSpanHint(params, null);
    } catch (_error) {
      debugIssue("addSpanHint", new Error('Error adding span hint'));
      throw _error;
    }
  }
}

export { ParallaxClient };
