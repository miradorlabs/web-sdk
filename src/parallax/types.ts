/**
 * TypeScript interfaces for the Parallax SDK
 */

/**
 * Configuration options for ParallaxClient
 * @deprecated Use ParallaxClientOptions instead
 */
export interface ParallaxClientConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * Options for ParallaxClient constructor
 */
export interface ParallaxClientOptions {
  /** Gateway URL (defaults to parallax-gateway-dev.mirador.org:443) */
  apiUrl?: string;
}

/**
 * Options for creating a trace
 */
export interface TraceOptions {
  /** Trace name */
  name?: string;
  /** Enable auto-flush mode (default: true) */
  autoFlush?: boolean;
  /** Debounce period in ms before auto-flush triggers (default: 50) */
  flushPeriod?: number;
  /** Include browser/OS metadata in first flush (default: true) */
  includeClientMeta?: boolean;
  /** Maximum number of retry attempts on failure (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff between retries (default: 1000) */
  retryBackoff?: number;
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
}

/**
 * Supported chain names (maps to Chain enum in proto)
 */
export type ChainName = 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'bsc';

/**
 * Transaction hash hint for blockchain correlation
 */
export interface TxHashHint {
  txHash: string;
  chain: ChainName;
  details?: string;
  timestamp: Date;
}

