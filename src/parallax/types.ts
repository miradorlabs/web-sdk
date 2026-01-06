/**
 * TypeScript interfaces for the Parallax SDK
 */

/**
 * Configuration options for ParallaxClient
 */
export interface ParallaxClientConfig {
  apiKey: string;
  apiUrl?: string;
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
 * Transaction hash hint for blockchain correlation
 */
export interface TxHashHint {
  txHash: string;
  chainId: string;
  details?: string;
  timestamp: Date;
}

/**
 * Event input for the happy-path createTrace API
 */
export interface TraceEventInput {
  name: string;
  details?: string | object;
  timestamp?: Date;
}

/**
 * Transaction hash hint input for the happy-path createTrace API
 */
export interface TxHashHintInput {
  txHash: string;
  chainId: string;
  details?: string;
}

/**
 * Attribute value type - accepts primitives and objects (objects are stringified)
 */
export type TraceAttributeValue = string | number | boolean | object;

/**
 * Options for creating a trace (happy-path API)
 */
export interface CreateTraceOptions {
  name: string;
  tags?: string[];
  attr?: { [key: string]: TraceAttributeValue };
  events?: TraceEventInput[];
  txHashHint?: TxHashHintInput;
  includeClientMeta?: boolean;
}
