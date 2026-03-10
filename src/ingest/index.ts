/**
 * Mirador Ingest Web Client SDK
 * Browser SDK for the Mirador tracing platform
 */

// Classes
export { Client } from './client';
export { Trace } from './trace';
export { MiradorProvider } from './provider';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './stacktrace';

// Chain utilities
export { chainIdToName } from './chains';

// Types
export type {
  ClientOptions,
  TraceOptions,
  ClientMetadata,
  TraceEvent,
  TxHashHint,
  SafeMsgHintData,
  SafeTxHintData,
  ChainName,
  AddEventOptions,
  StackFrame,
  StackTrace,
  EIP1193Provider,
  TxHintOptions,
  TransactionLike,
  TransactionRequest,
  MiradorProviderOptions,
} from './types';

// Metadata utilities (for advanced usage)
export {
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
} from './metadata';
