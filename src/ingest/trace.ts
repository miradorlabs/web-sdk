/**
 * Mirador Trace builder class for constructing traces with method chaining
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
  KeepAliveRequest,
  KeepAliveResponse,
  CloseTraceRequest,
  CloseTraceResponse,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { ResponseStatus } from 'mirador-gateway-ingest-web/proto/gateway/common/v1/status_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import type { TraceEvent, TxHashHint, ChainName, AddEventOptions, StackTrace } from './types';
import { getClientMetadata } from './metadata';
import { captureStackTrace } from './stacktrace';
import { obfuscateSecrets } from './secrets';

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
 * Interface for the client that MiradorTrace uses to submit traces
 * @internal
 */
export interface TraceSubmitter {
  _sendTrace(request: CreateTraceRequest): Promise<CreateTraceResponse>;
  _updateTrace(request: UpdateTraceRequest): Promise<UpdateTraceResponse>;
  _keepAlive(request: KeepAliveRequest): Promise<KeepAliveResponse>;
  _closeTrace(request: CloseTraceRequest): Promise<CloseTraceResponse>;
}

/** Options passed to MiradorTrace constructor (with defaults applied) */
interface ResolvedTraceOptions {
  name?: string;
  autoFlush: boolean;
  flushPeriodMs: number;
  includeClientMeta: boolean;
  maxRetries: number;
  retryBackoff: number;
  keepAliveIntervalMs: number;
  autoClose: boolean;
  captureStackTrace: boolean;
  locals?: Record<string, unknown>;
}

/**
 * Builder class for constructing traces with method chaining.
 * Supports auto-flush mode (default) where data is automatically sent after a period of inactivity,
 * or manual flush mode where you explicitly call flush().
 */
export class Trace {
  private name?: string;
  private client: TraceSubmitter;
  private includeClientMeta: boolean;

  // Flush configuration
  private autoFlush: boolean;
  private flushPeriodMs: number;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  // Keep-alive configuration
  private keepAliveIntervalMs: number;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  // Auto-close configuration
  private autoClose: boolean;
  private unloadHandler: (() => void) | null = null;

  // Retry configuration
  private maxRetries: number;
  private retryBackoff: number;

  // State tracking
  private traceId: string | null = null;
  private closed: boolean = false;
  private pendingAttributes: { [key: string]: string } = {};
  private pendingTags: string[] = [];
  private pendingEvents: TraceEvent[] = [];
  private pendingTxHashHints: TxHashHint[] = [];
  private creationStackTrace: StackTrace | null = null;
  private creationLocals: Record<string, unknown> | null = null;

  // Queue for maintaining strict ordering of flushes
  private flushQueue: Promise<void> = Promise.resolve();

  constructor(client: TraceSubmitter, options: ResolvedTraceOptions) {
    this.client = client;
    this.name = options.name;
    this.autoFlush = options.autoFlush;
    this.flushPeriodMs = options.flushPeriodMs;
    this.includeClientMeta = options.includeClientMeta;
    this.maxRetries = options.maxRetries;
    this.retryBackoff = options.retryBackoff;
    this.keepAliveIntervalMs = options.keepAliveIntervalMs;
    this.autoClose = options.autoClose;

    if (options.captureStackTrace) {
      // Skip 2 frames: this constructor and the trace() method that called it
      this.creationStackTrace = captureStackTrace(2);
    }

    if (options.locals) {
      // Obfuscate secrets immediately at capture time
      this.creationLocals = obfuscateSecrets(options.locals) as Record<string, unknown>;
    }

    // Set up auto-close on page unload if enabled
    if (this.autoClose && typeof window !== 'undefined') {
      this.unloadHandler = () => {
        // Use sendBeacon for reliable delivery during page unload
        this.close('Page unload');
      };
      window.addEventListener('beforeunload', this.unloadHandler);
    }
  }

  /**
   * Schedule an auto-flush after the configured period.
   * Resets the timer on each call.
   * If flushPeriodMs is 0, flushes immediately on every call.
   */
  private scheduleFlush(): void {
    if (!this.autoFlush) return;

    // flushPeriodMs === 0 means flush immediately on every call
    if (this.flushPeriodMs === 0) {
      this.flush();
      return;
    }

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.flushPeriodMs);
  }

  /**
   * Add an attribute to the trace
   * @param key Attribute key
   * @param value Attribute value (objects are stringified, primitives converted to string)
   * @returns This trace builder for chaining
   */
  addAttribute(key: string, value: string | number | boolean | object): this {
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addAttribute call.');
      return this;
    }
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
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addAttributes call.');
      return this;
    }
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
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addTag call.');
      return this;
    }
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
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addTags call.');
      return this;
    }
    this.pendingTags.push(...tags);
    this.scheduleFlush();
    return this;
  }

  /**
   * Add an event to the trace
   * @param eventName Name of the event
   * @param details Optional details (can be a JSON string or object that will be stringified)
   * @param options Optional settings including captureStackTrace, or a Date for backward compatibility
   * @returns This trace builder for chaining
   */
  addEvent(eventName: string, details?: string | object, options?: AddEventOptions | Date): this {
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addEvent call.');
      return this;
    }

    // Handle backward compatibility: options can be a Date (legacy timestamp parameter)
    let timestamp: Date | undefined;
    let eventOptions: AddEventOptions | undefined;

    if (options instanceof Date) {
      timestamp = options;
    } else {
      eventOptions = options;
    }

    // Build details object with optional stack trace
    let finalDetails: string | undefined;
    if (eventOptions?.captureStackTrace) {
      const stackTrace = captureStackTrace(1); // Skip 1 frame (this method)
      const detailsObj = typeof details === 'object' && details !== null
        ? details
        : details !== undefined
          ? { message: details }
          : {};
      finalDetails = JSON.stringify({
        ...detailsObj,
        stackTrace: {
          frames: stackTrace.frames,
          raw: stackTrace.raw,
        },
      });
    } else {
      finalDetails =
        typeof details === 'object' && details !== null
          ? JSON.stringify(details)
          : details;
    }

    this.pendingEvents.push({
      eventName,
      details: finalDetails,
      timestamp: timestamp || new Date(),
    });
    this.scheduleFlush();
    return this;
  }

  /**
   * Capture and add the current stack trace as an event
   * @param eventName Name for the stack trace event (defaults to "stack_trace")
   * @param additionalDetails Optional additional details to include with the stack trace
   * @returns This trace builder for chaining
   */
  addStackTrace(eventName: string = 'stack_trace', additionalDetails?: object): this {
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addStackTrace call.');
      return this;
    }

    const stackTrace = captureStackTrace(1); // Skip 1 frame (this method)
    const details = {
      ...additionalDetails,
      stackTrace: {
        frames: stackTrace.frames,
        raw: stackTrace.raw,
      },
    };

    this.pendingEvents.push({
      eventName,
      details: JSON.stringify(details),
      timestamp: new Date(),
    });
    this.scheduleFlush();
    return this;
  }

  /**
   * Add a pre-captured stack trace as an event
   * @param stackTrace The stack trace to add
   * @param eventName Name for the stack trace event (defaults to "stack_trace")
   * @param additionalDetails Optional additional details to include with the stack trace
   * @returns This trace builder for chaining
   */
  addExistingStackTrace(stackTrace: StackTrace, eventName: string = 'stack_trace', additionalDetails?: object): this {
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addExistingStackTrace call.');
      return this;
    }

    const details = {
      ...additionalDetails,
      stackTrace: {
        frames: stackTrace.frames,
        raw: stackTrace.raw,
      },
    };

    this.pendingEvents.push({
      eventName,
      details: JSON.stringify(details),
      timestamp: new Date(),
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
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring addTxHint call.');
      return this;
    }
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
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is closed. Ignoring flush call.');
      return;
    }

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

    // Capture context for error reporting
    const isCreateOp = this.traceId === null;
    const traceName = this.name;

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
      const operation = isCreateOp ? 'CreateTrace' : 'UpdateTrace';
      const context = traceName ? ` (trace: ${traceName})` : '';
      console.error(`[MiradorTrace] Flush error during ${operation}${context}:`, err);
    });
  }

  /**
   * Build TraceData from pending state
   */
  private buildTraceData(): TraceData {
    const traceData = new TraceData();

    // Add "trace init" event on first flush with stack trace and locals
    if (this.traceId === null && (this.creationStackTrace || this.creationLocals)) {
      const initEventMsg = new Event();
      initEventMsg.setName('trace init');

      const initDetails: Record<string, unknown> = {};

      if (this.creationStackTrace) {
        initDetails.stackTrace = {
          frames: this.creationStackTrace.frames,
          raw: this.creationStackTrace.raw,
        };

        if (this.creationStackTrace.frames.length > 0) {
          const topFrame = this.creationStackTrace.frames[0];
          initDetails.file = topFrame.fileName;
          initDetails.line = topFrame.lineNumber;
          initDetails.function = topFrame.functionName;
        }
      }

      if (this.creationLocals) {
        // Locals are already obfuscated at capture time
        initDetails.locals = this.creationLocals;
      }

      initEventMsg.setDetails(JSON.stringify(initDetails));
      const initTs = new Timestamp();
      initTs.fromDate(new Date());
      initEventMsg.setTimestamp(initTs);
      traceData.addEvents(initEventMsg);
    }

    // Add pending attributes (+ user metadata on first flush)
    const allAttrs = { ...this.pendingAttributes };
    if (this.traceId === null && this.includeClientMeta) {
      const clientMeta = getClientMetadata();
      for (const [key, value] of Object.entries(clientMeta)) {
        allAttrs[`user.${key}`] = value;
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
            `[MiradorTrace] ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`
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
        this.startKeepAlive();
      } else {
        console.error('[MiradorTrace] CreateTrace failed:', response.getStatus()?.getErrorMessage());
      }
    } catch (err) {
      console.error('[MiradorTrace] CreateTrace error after retries:', err);
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
        console.error('[MiradorTrace] UpdateTrace failed:', response.getStatus()?.getErrorMessage());
      }
    } catch (err) {
      console.error('[MiradorTrace] UpdateTrace error after retries:', err);
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
   * Start the keep-alive timer to ping the server periodically
   */
  private startKeepAlive(): void {
    if (this.keepAliveTimer !== null) {
      return; // Already started
    }

    this.keepAliveTimer = setInterval(() => {
      this.sendKeepAlive();
    }, this.keepAliveIntervalMs);
  }

  /**
   * Send a keep-alive ping to the server
   */
  private async sendKeepAlive(): Promise<void> {
    if (!this.traceId || this.closed) {
      return;
    }

    const request = new KeepAliveRequest();
    request.setTraceId(this.traceId);

    try {
      const response = await this.client._keepAlive(request);
      if (!response.getAccepted()) {
        console.warn('[MiradorTrace] KeepAlive was not accepted by server');
      }
    } catch (err) {
      console.error('[MiradorTrace] KeepAlive error:', err);
    }
  }

  /**
   * Stop the keep-alive timer
   */
  private stopKeepAlive(): void {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Close the trace and stop all timers.
   * After calling this method, all subsequent operations (addAttribute, addEvent, etc.) will be ignored.
   * @param reason Optional reason for closing the trace
   */
  async close(reason?: string): Promise<void> {
    if (this.closed) {
      console.warn('[MiradorTrace] Trace is already closed.');
      return;
    }

    this.closed = true;

    // Stop all timers
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.stopKeepAlive();

    // Remove unload handler if it was registered
    if (this.unloadHandler && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.unloadHandler);
      this.unloadHandler = null;
    }

    // Send close request if we have a trace ID
    if (this.traceId) {
      const request = new CloseTraceRequest();
      request.setTraceId(this.traceId);
      if (reason) {
        request.setText(reason);
      }

      try {
        const response = await this.client._closeTrace(request);
        if (!response.getAccepted()) {
          console.warn('[MiradorTrace] CloseTrace was not accepted by server');
        }
      } catch (err) {
        console.error('[MiradorTrace] CloseTrace error:', err);
      }
    }
  }

  /**
   * Get the trace ID (available after first flush completes)
   * @returns The trace ID or null if not yet created
   */
  getTraceId(): string | null {
    return this.traceId;
  }

  /**
   * Check if the trace is closed
   * @returns True if the trace is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}
