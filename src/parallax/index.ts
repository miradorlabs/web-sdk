/**
 * Parallax Web Client SDK
 * Browser SDK for the Parallax tracing platform
 */

// Classes
export { ParallaxClient } from './client';
export { ParallaxTrace } from './trace';

// Types
export type {
  ParallaxClientOptions,
  TraceOptions,
  ClientMetadata,
  TraceEvent,
  TxHashHint,
  ChainName,
} from './types';

// Metadata utilities (for advanced usage)
export {
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
} from './metadata';
