// Core SDK exports
export { ParallaxClient, ParallaxTrace } from './src/parallax';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './src/parallax';

// Metadata utilities
export { getClientMetadata, detectBrowser, detectOS, detectDeviceType } from './src/parallax';

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
} from './src/parallax';

// Re-export proto types for convenience
export {
  CreateTraceRequest,
  CreateTraceResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
