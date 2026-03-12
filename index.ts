// Core SDK exports
export { Client, Trace, NoopTrace, MiradorProvider } from './src/ingest';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './src/ingest';

// Chain utilities
export { chainIdToName } from './src/ingest';

// Metadata utilities
export { getClientMetadata, detectBrowser, detectOS, detectDeviceType } from './src/ingest';

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
  Logger,
  TraceCallbacks,
} from './src/ingest';

// Re-export proto types for convenience
export {
  FlushTraceRequest,
  FlushTraceResponse,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';