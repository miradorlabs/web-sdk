/**
 * Parallax Web Client SDK
 * Browser SDK for the Parallax tracing platform
 */

// Classes
export { ParallaxClient } from './client';
export { ParallaxTrace } from './trace';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './stacktrace';

// Types
export type {
  ParallaxClientOptions,
  TraceOptions,
  ClientMetadata,
  TraceEvent,
  TxHashHint,
  ChainName,
  AddEventOptions,
  StackFrame,
  StackTrace,
} from './types';

// Metadata utilities (for advanced usage)
export {
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
} from './metadata';
