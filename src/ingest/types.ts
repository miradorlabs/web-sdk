/**
 * TypeScript interfaces for the Mirador SDK
 */

// Import shared types used locally in this file
import type { Logger, Severity } from '@miradorlabs/plugins';

// Re-export shared types from plugins package
export {
  Chain,
  Severity,
  type ChainName,
  type ChainInput,
  type EIP1193Provider,
  type TxHintOptions,
  type TransactionLike,
  type TransactionRequest,
  type Logger,
  type EvmTxHint,
  type SolanaTxHint,
  type SafeMsgHintData,
  type SafeTxHintData,
  type AddEventOptions,
} from '@miradorlabs/plugins';

/** Options for the MiradorProvider wrapper */
export interface MiradorProviderOptions {
  /** Bind to an existing trace instead of auto-creating per tx */
  trace?: import('./trace').Trace;
  /** Trace options for auto-created traces (ignored if trace is provided) */
  traceOptions?: TraceOptions;
  /**
   * Capture installed/active wallet metadata (name, rdns, uuid, version) on
   * intercepted transactions. Uses EIP-6963 + legacy `window.ethereum` flag
   * detection. No prompts are shown. Default: true.
   */
  captureWallets?: boolean;
  /** How long to wait for EIP-6963 announcements during discovery (default: 500ms) */
  walletDiscoveryTimeoutMs?: number;
}

/**
 * Lifecycle callbacks for observing trace events programmatically.
 */
export interface TraceCallbacks {
  /** Called once when the trace is first created on the server (first successful flush) */
  onCreated?: (traceId: string) => void;
  /** Called after a successful flush */
  onFlushed?: (traceId: string, itemCount: number) => void;
  /** Called when a flush operation fails after retries */
  onFlushError?: (error: Error, operation: string) => void;
  /** Called when the trace is closed */
  onClosed?: (traceId: string, reason?: string) => void;
  /** Called when items are dropped (e.g., queue full) */
  onDropped?: (count: number, reason: string) => void;
}

/**
 * Options for Client constructor
 */
export interface ClientOptions {
  /** Gateway URL (defaults to https://ingest.mirador.org:443) */
  apiUrl?: string;
  /** Keep-alive ping interval in milliseconds (default: 10000) */
  keepAliveIntervalMs?: number;
  /** Per-call timeout in milliseconds for gRPC operations (default: 5000) */
  callTimeoutMs?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Custom logger implementation (defaults to no-op) */
  logger?: Logger;
  /** Default lifecycle callbacks for all traces (can be overridden per-trace) */
  callbacks?: TraceCallbacks;
  /** Sample rate for traces, between 0 and 1 (default: 1 = send all traces). */
  sampleRate?: number;
  /** Custom sampler function. Takes precedence over sampleRate when provided. Return true to sample (send) the trace. */
  sampler?: (options: TraceOptions) => boolean;
}

/**
 * Options for creating a trace
 */
export interface TraceOptions {
  /** Trace name */
  name?: string;
  /** Resume an existing trace by ID (e.g., passed from backend SDK via HTTP header) */
  traceId?: string;
  /** Include browser/OS metadata in first flush (default: true) */
  includeUserMeta?: boolean;
  /** Maximum number of retry attempts on failure (default: 2) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff between retries (default: 500) */
  retryBackoff?: number;
  /** Automatically close trace on page visibility change (default: false) */
  autoClose?: boolean;
  /** Whether to automatically start keep-alive pings. Defaults to true for new traces, false when resuming via traceId. */
  autoKeepAlive?: boolean;
  /** Maximum trace lifetime in milliseconds (default: 0 = disabled). Auto-closes trace after this duration. */
  maxTraceLifetimeMs?: number;
  /** Maximum number of items in the pending queue before dropping (default: 4096) */
  maxQueueSize?: number;
  /** Per-trace lifecycle callbacks (overrides client-level defaults) */
  callbacks?: TraceCallbacks;
}

/**
 * Client metadata collected from the browser environment
 */
export interface ClientMetadata {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  userAgent: string;
  language: string;
  languages: string;
  screenWidth: string;
  screenHeight: string;
  viewportWidth: string;
  viewportHeight: string;
  colorDepth: string;
  pixelRatio: string;
  cpuCores: string;
  deviceMemory?: string;
  touchSupport: string;
  maxTouchPoints: string;
  connectionType?: string;
  connectionSpeed?: string;
  dataSaver?: string;
  cookiesEnabled: string;
  online: string;
  doNotTrack: string;
  timezone: string;
  timezoneOffset: string;
  url: string;
  origin: string;
  pathname: string;
  referrer: string;
  documentVisibility: string;
}

/**
 * An event to be recorded in a trace
 */
export interface TraceEvent {
  eventName: string;
  details?: string;
  timestamp: Date;
  severity?: Severity;
}

/**
 * A single frame in a stack trace
 */
export interface StackFrame {
  /** Function or method name */
  functionName: string;
  /** File path */
  fileName: string;
  /** Line number */
  lineNumber: number;
  /** Column number */
  columnNumber: number;
}

/**
 * A captured stack trace
 */
export interface StackTrace {
  /** Array of stack frames (top of stack first) */
  frames: StackFrame[];
  /** Raw stack string from Error.stack */
  raw: string;
}


