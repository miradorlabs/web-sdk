// Core SDK exports
export { Client, Trace } from './src/ingest';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './src/ingest';

// Metadata utilities
export { getClientMetadata, detectBrowser, detectOS, detectDeviceType } from './src/ingest';

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
} from './src/ingest';

// Re-export proto types for convenience
export {
  CreateTraceRequest,
  CreateTraceResponse,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';