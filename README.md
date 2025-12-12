# Parallax Web Client SDK

Web browser SDK for the Parallax tracing platform. This package provides a browser-compatible client using gRPC-Web to interact with the Parallax Gateway API.

## Installation

```bash
npm install @miradorlabs/parallax-web
```

## Usage

### Basic Setup

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

// Initialize the client with your API key
const client = new ParallaxClient('your-api-key');

// Or with a custom gateway URL
const client = new ParallaxClient('your-api-key', 'https://your-gateway.example.com:50053');
```

### Creating a Trace

```typescript
const traceResponse = await client.createTrace({
  name: 'My Application Trace',
  attributes: {
    'project.id': 'my-project',
    'environment': 'production',
  },
  tags: ['web', 'user-action'],
});

const traceId = traceResponse.traceId;
```

### Starting a Span

```typescript
const spanResponse = await client.startSpan({
  name: 'User Login',
  traceId: traceId,
  attributes: {
    'user.id': 'user-123',
    'action': 'login',
  },
});

const spanId = spanResponse.spanId;
```

### Adding Span Attributes

```typescript
await client.addSpanAttributes({
  traceId: traceId,
  spanId: spanId,
  attributes: {
    'response.status': '200',
    'response.time': '145ms',
  },
});
```

### Adding Span Events

```typescript
await client.addSpanEvent({
  traceId: traceId,
  spanId: spanId,
  eventName: 'User Authenticated',
  attributes: {
    'auth.method': 'oauth',
    'auth.provider': 'google',
  },
});
```

### Adding Span Errors

```typescript
await client.addSpanError({
  traceId: traceId,
  spanId: spanId,
  errorType: 'ValidationError',
  message: 'Invalid email format',
  stackTrace: error.stack,
  attributes: {
    'error.field': 'email',
  },
});
```

### Adding Span Hints (Blockchain Transactions)

```typescript
await client.addSpanHint({
  traceId: traceId,
  parentSpanId: spanId,
  chainTransaction: {
    txHash: '0x1234567890abcdef',
    chainId: 1, // Ethereum mainnet
  },
});
```

### Finishing a Span

```typescript
await client.finishSpan({
  traceId: traceId,
  spanId: spanId,
});
```

## Complete Example

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

async function trackUserAction() {
  const client = new ParallaxClient('your-api-key');

  try {
    // Create trace
    const { traceId } = await client.createTrace({
      name: 'User Purchase Flow',
      attributes: { 'user.id': 'user-123' },
      tags: ['purchase', 'web'],
    });

    // Start span
    const { spanId } = await client.startSpan({
      name: 'Checkout Process',
      traceId: traceId,
      attributes: { 'cart.items': '3' },
    });

    // Add event
    await client.addSpanEvent({
      traceId: traceId,
      spanId: spanId,
      eventName: 'Payment Initiated',
      attributes: { 'payment.method': 'card' },
    });

    // Finish span
    await client.finishSpan({
      traceId: traceId,
      spanId: spanId,
    });
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
