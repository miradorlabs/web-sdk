# Parallax Web Client SDK

Web browser SDK for the Parallax tracing platform. This package provides a browser-compatible client using gRPC-Web to interact with the Parallax Gateway API.

## Installation

```bash
npm install @miradorlabs/parallax-web
```

## Usage

### Basic Setup

```typescript
import { ParallaxClient, CreateTraceRequest } from '@miradorlabs/parallax-web';

// Initialize the client with your API key
const client = new ParallaxClient('your-api-key');

// Or with a custom gateway URL
const client = new ParallaxClient('your-api-key', 'https://your-gateway.example.com:50053');
```

### Creating a Trace

```typescript
import { CreateTraceRequest } from '@miradorlabs/parallax-web';

const request = new CreateTraceRequest();
request.setName('My Application Trace');

// Set attributes using the map
const attributesMap = request.getAttributesMap();
attributesMap.set('project.id', 'my-project');
attributesMap.set('environment', 'production');

request.setTagsList(['web', 'user-action']);

const traceResponse = await client.createTrace(request);
const traceId = traceResponse.getTraceId();
```

### Starting a Span

```typescript
import { StartSpanRequest } from '@miradorlabs/parallax-web';

const request = new StartSpanRequest();
request.setName('User Login');
request.setTraceId(traceId);

// Set attributes using the map
const attributesMap = request.getAttributesMap();
attributesMap.set('user.id', 'user-123');
attributesMap.set('action', 'login');

const spanResponse = await client.startSpan(request);
const spanId = spanResponse.getSpanId();
```

### Adding Span Events

```typescript
import { AddSpanEventRequest } from '@miradorlabs/parallax-web';

const request = new AddSpanEventRequest();
request.setTraceId(traceId);
request.setSpanId(spanId);
request.setEventName('User Authenticated');

const attributesMap = request.getAttributesMap();
attributesMap.set('auth.method', 'oauth');
attributesMap.set('auth.provider', 'google');

await client.addSpanEvent(request);
```

### Adding Span Errors

```typescript
import { AddSpanErrorRequest } from '@miradorlabs/parallax-web';

const request = new AddSpanErrorRequest();
request.setTraceId(traceId);
request.setSpanId(spanId);
request.setErrorType('ValidationError');
request.setMessage('Invalid email format');
request.setStackTrace(error.stack);

const attributesMap = request.getAttributesMap();
attributesMap.set('error.field', 'email');

await client.addSpanError(request);
```

### Adding Span Hints (Blockchain Transactions)

```typescript
import { AddSpanHintRequest } from '@miradorlabs/parallax-web';

const chainTx = new AddSpanHintRequest.ChainTransaction();
chainTx.setTxHash('0x1234567890abcdef');
chainTx.setChainId(1); // Ethereum mainnet

const request = new AddSpanHintRequest();
request.setTraceId(traceId);
request.setParentSpanId(spanId);
request.setChainTransaction(chainTx);

await client.addSpanHint(request);
```

### Finishing a Span

```typescript
import { FinishSpanRequest } from '@miradorlabs/parallax-web';

const spanStatus = new FinishSpanRequest.SpanStatus();
spanStatus.setCode(FinishSpanRequest.SpanStatus.StatusCode.STATUS_CODE_OK);

const request = new FinishSpanRequest();
request.setTraceId(traceId);
request.setSpanId(spanId);
request.setStatus(spanStatus);

await client.finishSpan(request);
```

## Complete Example

```typescript
import {
  ParallaxClient,
  CreateTraceRequest,
  StartSpanRequest,
  AddSpanEventRequest,
  FinishSpanRequest,
} from '@miradorlabs/parallax-web';

async function trackUserAction() {
  const client = new ParallaxClient('your-api-key');

  try {
    // Create trace
    const createTraceReq = new CreateTraceRequest();
    createTraceReq.setName('User Purchase Flow');
    createTraceReq.getAttributesMap().set('user.id', 'user-123');
    createTraceReq.setTagsList(['purchase', 'web']);

    const traceResponse = await client.createTrace(createTraceReq);
    const traceId = traceResponse.getTraceId();

    // Start span
    const startSpanReq = new StartSpanRequest();
    startSpanReq.setName('Checkout Process');
    startSpanReq.setTraceId(traceId);
    startSpanReq.getAttributesMap().set('cart.items', '3');

    const spanResponse = await client.startSpan(startSpanReq);
    const spanId = spanResponse.getSpanId();

    // Add event
    const addEventReq = new AddSpanEventRequest();
    addEventReq.setTraceId(traceId);
    addEventReq.setSpanId(spanId);
    addEventReq.setEventName('Payment Initiated');
    addEventReq.getAttributesMap().set('payment.method', 'card');

    await client.addSpanEvent(addEventReq);

    // Finish span
    const finishSpanReq = new FinishSpanRequest();
    finishSpanReq.setTraceId(traceId);
    finishSpanReq.setSpanId(spanId);

    const spanStatus = new FinishSpanRequest.SpanStatus();
    spanStatus.setCode(FinishSpanRequest.SpanStatus.StatusCode.STATUS_CODE_OK);
    finishSpanReq.setStatus(spanStatus);

    await client.finishSpan(finishSpanReq);
  } catch (error) {
    console.error('Tracing error:', error);
  }
}
```

## Browser Compatibility

This SDK uses the Fetch API and is compatible with modern browsers that support:
- ES2020
- Fetch API
- Promises
- Uint8Array

For older browsers, you may need polyfills.

## Module Formats

The package provides multiple module formats:

- **ESM** (`dist/index.esm.js`): For modern bundlers (Webpack, Vite, etc.)
- **UMD** (`dist/index.umd.js`): For browser globals and older module systems
- **TypeScript** (`dist/index.d.ts`): Type definitions

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run format
```

## Differences from Node.js Client

The web client differs from `@miradorlabs/parallax` (Node.js) in the following ways:

- Uses **gRPC-Web** instead of gRPC (`@grpc/grpc-js`)
- Uses browser **Fetch API** instead of Node.js HTTP
- Uses **https** URLs instead of insecure connections
- Designed for browser environments (no Node.js dependencies)

## License

ISC

## Author

@mirador
