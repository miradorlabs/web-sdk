export * from './src/parallax';
export { GrpcWebRpc } from './src/grpc';

// Export ParallaxService
export { ParallaxService, parallaxService } from './src/parallax/ParallaxService';

// Re-export proto types for convenience
export {
  CreateTraceRequest,
  CreateTraceResponse,
  StartSpanRequest,
  StartSpanResponse,
  FinishSpanRequest,
  FinishSpanResponse,
  AddSpanEventRequest,
  AddSpanEventResponse,
  AddSpanErrorRequest,
  AddSpanErrorResponse,
  AddSpanHintRequest,
  AddSpanHintResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
