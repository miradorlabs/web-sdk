/**
 * Mirador Ingest Web Client SDK
 * Browser SDK for the Mirador tracing platform
 */

// Classes
export { Client } from './client';
export { Trace } from './trace';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './stacktrace';

// Secret obfuscation utilities
export { obfuscateSecrets } from './secrets';

// Types
export type {
  ClientOptions,
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
