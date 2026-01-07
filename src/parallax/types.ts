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

