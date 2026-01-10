/**
 * ParallaxTrace builder class for constructing traces with method chaining
 */
import {
  CreateTraceRequest,
  CreateTraceResponse,
  UpdateTraceRequest,
  UpdateTraceResponse,
  TraceData,
  Attributes,
  Tags,
  Event,
  TxHashHint as TxHashHintProto,
  Chain,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { ResponseStatus } from 'mirador-gateway-parallax-web/proto/common/v1/status_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import type { TraceEvent, TxHashHint, ChainName } from './types';
import { getClientMetadata } from './metadata';

/**
 * Maps chain names to proto Chain enum values
 */
const CHAIN_MAP: Record<ChainName, Chain> = {
  ethereum: Chain.CHAIN_ETHEREUM,
  polygon: Chain.CHAIN_POLYGON,
  arbitrum: Chain.CHAIN_ARBITRUM,
  base: Chain.CHAIN_BASE,
  optimism: Chain.CHAIN_OPTIMISM,
  bsc: Chain.CHAIN_BSC,
};

/**
 * Interface for the client that ParallaxTrace uses to submit traces
 * @internal
 */
export interface TraceSubmitter {
  _sendTrace(request: CreateTraceRequest): Promise<CreateTraceResponse>;
  _updateTrace(request: UpdateTraceRequest): Promise<UpdateTraceResponse>;
}

/** Options passed to ParallaxTrace constructor (with defaults applied) */
interface ResolvedTraceOptions {
  name?: string;
  autoFlush: boolean;
  flushPeriod: number;
  includeClientMeta: boolean;
  maxRetries: number;
  retryBackoff: number;
}

/**
 * Builder class for constructing traces with method chaining.
 * Supports auto-flush mode (default) where data is automatically sent after a period of inactivity,
 * or manual flush mode where you explicitly call flush().
 */
export class ParallaxTrace {
  private name?: string;
  private client: TraceSubmitter;
  private includeClientMeta: boolean;

  // Flush configuration
  private autoFlush: boolean;
  private flushPeriod: number;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  // Retry configuration
  private maxRetries: number;
  private retryBackoff: number;

  // State tracking
  private traceId: string | null = null;
  private pendingAttributes: { [key: string]: string } = {};
  private pendingTags: string[] = [];
  private pendingEvents: TraceEvent[] = [];
  private pendingTxHashHints: TxHashHint[] = [];

  // Queue for maintaining strict ordering of flushes
  private flushQueue: Promise<void> = Promise.resolve();

  constructor(client: TraceSubmitter, options: ResolvedTraceOptions) {
    this.client = client;
    this.name = options.name;
    this.autoFlush = options.autoFlush;
    this.flushPeriod = options.flushPeriod;
    this.includeClientMeta = options.includeClientMeta;
    this.maxRetries = options.maxRetries;
    this.retryBackoff = options.retryBackoff;
  }

  /**
   * Schedule an auto-flush after the configured period.
   * Resets the timer on each call.
   * If flushPeriod is 0, flushes immediately on every call.
   */
  private scheduleFlush(): void {
    if (!this.autoFlush) return;

    // flushPeriod === 0 means flush immediately on every call
    if (this.flushPeriod === 0) {
      this.flush();
      return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.flushPeriod);
  }

  /**
   * Add an attribute to the trace
   * @param key Attribute key
   * @param value Attribute value (objects are stringified, primitives converted to string)
   * @returns This trace builder for chaining
   */
  addAttribute(key: string, value: string | number | boolean | object): this {
    this.pendingAttributes[key] =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value);
    this.scheduleFlush();
    return this;
  }

  /**
   * Add multiple attributes to the trace
   * @param attributes Object containing key-value pairs (objects are stringified)
   * @returns This trace builder for chaining
   */
  addAttributes(attributes: { [key: string]: string | number | boolean | object }): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.pendingAttributes[key] =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value);
    }
    this.scheduleFlush();
    return this;
  }

  /**
   * Add a tag to the trace
   * @param tag Tag to add
   * @returns This trace builder for chaining
   */
  addTag(tag: string): this {
    this.pendingTags.push(tag);
    this.scheduleFlush();
    return this;
  }

  /**
   * Add multiple tags to the trace
   * @param tags Array of tags to add
   * @returns This trace builder for chaining
   */
  addTags(tags: string[]): this {
    this.pendingTags.push(...tags);
    this.scheduleFlush();
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

    this.pendingEvents.push({
      eventName,
      details: detailsString,
      timestamp: timestamp || new Date(),
    });
    this.scheduleFlush();
    return this;
  }

  /**
   * Add a transaction hash hint for blockchain correlation.
   * Multiple hints can be added to the same trace.
   * @param txHash Transaction hash
   * @param chain Chain name (e.g., "ethereum", "polygon", "base")
   * @param details Optional details about the transaction
   * @returns This trace builder for chaining
   */
  addTxHint(txHash: string, chain: ChainName, details?: string): this {
    this.pendingTxHashHints.push({
      txHash,
      chain,
      details,
      timestamp: new Date(),
    });
    this.scheduleFlush();
    return this;
  }

  /**
   * Flush pending data to the gateway.
   * Fire-and-forget - returns immediately but maintains strict ordering of requests.
   * First flush calls CreateTrace, subsequent flushes call UpdateTrace.
   */
  flush(): void {
    // Cancel any pending auto-flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Check if there's anything to flush
    const hasPendingData =
      Object.keys(this.pendingAttributes).length > 0 ||
      this.pendingTags.length > 0 ||
      this.pendingEvents.length > 0 ||
      this.pendingTxHashHints.length > 0;

    if (!hasPendingData && this.traceId !== null) {
      return; // Nothing to flush
    }

    // Capture pending data NOW (before it changes)
    const traceData = this.buildTraceData();

    // Clear pending immediately so next flush doesn't re-send
    this.clearPending();

    // Chain onto the queue for strict ordering
    // Check traceId inside the queue to ensure proper ordering
    this.flushQueue = this.flushQueue.then(async () => {
      if (this.traceId === null) {
        await this.createTrace(traceData);
      } else {
        await this.updateTrace(traceData);
      }
    }).catch(err => {
      console.error('[ParallaxTrace] Flush error:', err);
    });
  }

  /**
   * Build TraceData from pending state
   */
  private buildTraceData(): TraceData {
    const traceData = new TraceData();

    // Add pending attributes (+ client metadata on first flush)
    const allAttrs = { ...this.pendingAttributes };
    if (this.traceId === null && this.includeClientMeta) {
      const clientMeta = getClientMetadata();
      for (const [key, value] of Object.entries(clientMeta)) {
        allAttrs[`client.${key}`] = value;
      }
    }
    if (Object.keys(allAttrs).length > 0) {
      const attrsMsg = new Attributes();
      const attrsMap = attrsMsg.getAttributesMap();
      for (const [key, value] of Object.entries(allAttrs)) {
        attrsMap.set(key, value);
      }
      traceData.addAttributes(attrsMsg);
    }

    // Add pending tags
    if (this.pendingTags.length > 0) {
      const tagsMsg = new Tags();
      tagsMsg.setTagsList(this.pendingTags);
      traceData.addTags(tagsMsg);
    }

    // Add pending events
    for (const event of this.pendingEvents) {
      const eventMsg = new Event();
      eventMsg.setName(event.eventName);
      if (event.details) {
        eventMsg.setDetails(event.details);
      }
      const ts = new Timestamp();
      ts.fromDate(event.timestamp);
      eventMsg.setTimestamp(ts);
      traceData.addEvents(eventMsg);
    }

    // Add pending tx hints
    for (const hint of this.pendingTxHashHints) {
      const hintMsg = new TxHashHintProto();
      hintMsg.setTxHash(hint.txHash);
      hintMsg.setChain(CHAIN_MAP[hint.chain]);
      if (hint.details) {
        hintMsg.setDetails(hint.details);
      }
      const ts = new Timestamp();
      ts.fromDate(hint.timestamp);
      hintMsg.setTimestamp(ts);
      traceData.addTxHashHints(hintMsg);
    }

    return traceData;
  }

  /**
   * Sleep for the specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute an operation with exponential backoff retry
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err as Error;

        if (attempt < this.maxRetries) {
          const delay = this.retryBackoff * Math.pow(2, attempt);
          console.warn(
            `[ParallaxTrace] ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Send CreateTrace request
   */
  private async createTrace(traceData: TraceData): Promise<void> {
    const request = new CreateTraceRequest();
    if (this.name) {
      request.setName(this.name);
    }
    request.setData(traceData);

    try {
      const response = await this.retryWithBackoff(
        () => this.client._sendTrace(request),
        'CreateTrace'
      );
      if (response.getStatus()?.getCode() === ResponseStatus.StatusCode.STATUS_CODE_SUCCESS) {
        this.traceId = response.getTraceId();
      } else {
        console.error('[ParallaxTrace] CreateTrace failed:', response.getStatus()?.getErrorMessage());
      }
    } catch (err) {
      console.error('[ParallaxTrace] CreateTrace error after retries:', err);
    }
  }

  /**
   * Send UpdateTrace request
   */
  private async updateTrace(traceData: TraceData): Promise<void> {
    const request = new UpdateTraceRequest();
    request.setTraceId(this.traceId!);
    request.setData(traceData);

    try {
      const response = await this.retryWithBackoff(
        () => this.client._updateTrace(request),
        'UpdateTrace'
      );
      if (response.getStatus()?.getCode() !== ResponseStatus.StatusCode.STATUS_CODE_SUCCESS) {
        console.error('[ParallaxTrace] UpdateTrace failed:', response.getStatus()?.getErrorMessage());
      }
    } catch (err) {
      console.error('[ParallaxTrace] UpdateTrace error after retries:', err);
    }
  }

  /**
   * Clear all pending data
   */
  private clearPending(): void {
    this.pendingAttributes = {};
    this.pendingTags = [];
    this.pendingEvents = [];
    this.pendingTxHashHints = [];
  }

  /**
   * Get the trace ID (available after first flush completes)
   * @returns The trace ID or null if not yet created
   */
  getTraceId(): string | null {
    return this.traceId;
  }
}
