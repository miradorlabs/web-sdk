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
