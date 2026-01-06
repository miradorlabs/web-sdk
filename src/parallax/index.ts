/**
 * Parallax Web Client SDK
 * Browser SDK for the Parallax tracing platform
 */

// Classes
export { ParallaxClient } from './client';
export { ParallaxTrace } from './trace';

// Types
export type {
  ParallaxClientConfig,
  ClientMetadata,
  TraceEvent,
  TxHashHint,
  TraceEventInput,
  TxHashHintInput,
  TraceAttributeValue,
  CreateTraceOptions,
} from './types';

// Metadata utilities (for advanced usage)
export {
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
} from './metadata';

// Proto types (re-export for convenience)
export {
  CreateTraceRequest,
  CreateTraceResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
