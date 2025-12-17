# Parallax Web Client SDK

Web browser SDK for the Parallax tracing platform. This package provides a browser-compatible client using gRPC-Web to interact with the Parallax Gateway API.

## Installation

```bash
npm install @miradorlabs/parallax-web
```

## Features

- 🚀 **ParallaxService** - High-level API for transaction tracing with automatic lifecycle management
- 🔧 **ParallaxClient** - Low-level client for advanced use cases
- 🌐 **Browser-optimized** - Automatic client metadata collection (browser, OS, IP, etc.)
- ⛓️ **Blockchain integration** - Built-in support for correlating transactions with blockchain events
- 📦 **TypeScript support** - Full type definitions included
- 🎯 **Automatic root spans** - Creating a trace now automatically creates a root span

## Quick Start with ParallaxService (Recommended)

The `ParallaxService` provides a simplified API for tracking transactions:

```typescript
import { parallaxService } from '@miradorlabs/parallax-web';

// Start tracking a transaction (creates trace + root span automatically)
const { traceId, rootSpanId, txId } = await parallaxService.startTransactionTrace(
  {
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    value: '0.1',
    network: 'ethereum',
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
  'SendTransaction',
  { includeClientMeta: true } // Automatically collects browser, OS, IP, etc.
);

// Associate the blockchain transaction hash
await parallaxService.associateTransactionHash(txId, '0xabc123...', 1);

// Add events as the transaction progresses
await parallaxService.addTransactionEvent(txId, 'wallet_signed', {
  timestamp: new Date().toISOString(),
});

// Track errors if they occur
try {
  // transaction logic
} catch (error) {
  await parallaxService.addTransactionError(txId, error, 'TransactionError');
}

// Finish the trace when done
await parallaxService.finishTransactionTrace(txId, { success: true });
```

### ParallaxService API

#### `startTransactionTrace(txData, name, options)`

Starts a new transaction trace with automatic root span creation.

**Important:** When you create a trace, a root span is **automatically created** on the backend. You receive a `rootSpanId` in the response - no need to call `startSpan` separately!

**Parameters:**
- `txData`: Transaction details (from, to, value, network, etc.)
- `name`: Trace name (default: 'WalletTransaction')
- `options`: Optional configuration
  - `apiKey`: API key for authentication
  - `gatewayUrl`: Custom gateway URL
  - `includeClientMeta`: Include browser/OS metadata (default: true)

**Returns:** `{ traceId, rootSpanId, txId }`

#### Other Methods

- `associateTransactionHash(txId, txHash, chainId)` - Link blockchain transaction
- `addTransactionEvent(txId, eventName, attributes)` - Add event to trace
- `addTransactionError(txId, error, errorType)` - Track errors with stack traces
- `finishTransactionTrace(txId, options)` - Complete the trace
- `getTransactionInfo(txId)` - Get active transaction info
- `getAllActiveTransactions()` - List all active transactions
- `getClient()` - Access underlying ParallaxClient for advanced usage

See [PARALLAX_SERVICE_USAGE.md](./PARALLAX_SERVICE_USAGE.md) for comprehensive documentation.

## Advanced Usage with ParallaxClient

For more control, use the low-level `ParallaxClient`:

### Basic Setup

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

// Initialize the client
const client = new ParallaxClient('your-api-key');

// Or with a custom gateway URL
const client = new ParallaxClient('your-api-key', 'https://your-gateway.example.com:50053');
```

### Helper Methods

The client provides helper methods to create requests easily:

#### Creating a Trace

```typescript
// Use the helper method
const createTraceReq = await client.createTraceRequest({
  name: 'My Application Trace',
  attr: {
    'project.id': 'my-project',
    'environment': 'production',
  },
  tags: ['web', 'user-action'],
  includeClientMeta: true, // Includes browser, OS, IP, etc.
});

const traceResponse = await client.createTrace(createTraceReq);
const traceId = traceResponse.getTraceId();
const rootSpanId = traceResponse.getRootSpanId(); // Root span automatically created!
```

#### Starting a Span (Child Span)

Note: You only need to call `startSpan` if you want to create **child spans**. The root span is automatically created when you create a trace.

```typescript
// Create a child span under the root span
const startSpanReq = await client.createStartSpanRequest({
  traceId: traceId,
  name: 'User Login',
  parentSpanId: rootSpanId, // Use root span as parent
  attr: {
    'user.id': 'user-123',
    'action': 'login',
  },
  includeClientMeta: false, // Optional
});

const spanResponse = await client.startSpan(startSpanReq);
const spanId = spanResponse.getSpanId();
```

#### Adding Span Events

```typescript
const eventReq = client.createAddSpanEventRequest({
  traceId: traceId,
  spanId: spanId,
  eventName: 'User Authenticated',
  attr: {
    'auth.method': 'oauth',
    'auth.provider': 'google',
  },
});

await client.addSpanEvent(eventReq);
```

#### Adding Span Errors

```typescript
try {
  // some operation
} catch (error) {
  const errorReq = client.createAddSpanErrorRequest({
    traceId: traceId,
    spanId: spanId,
    errorMessage: error.message,
    errorType: 'ValidationError',
    stackTrace: error.stack,
  });

  await client.addSpanError(errorReq);
}
```

#### Adding Span Hints (Blockchain Transactions)

```typescript
const hintReq = client.createAddSpanHintRequest({
  traceId: traceId,
  parentSpanId: rootSpanId,
  txHash: '0x1234567890abcdef',
  chainId: 1, // Ethereum mainnet
});

await client.addSpanHint(hintReq);
```

#### Finishing a Span

```typescript
const finishReq = client.createFinishSpanRequest({
  traceId: traceId,
  spanId: spanId,
  status: {
    success: true,
    errorMessage: '', // or error message if failed
  },
});

await client.finishSpan(finishReq);
```

## Complete Example: Transaction Tracking

```typescript
import { parallaxService } from '@miradorlabs/parallax-web';

async function handleWalletTransaction(userAddress, recipientAddress, amount) {
  let txId;

  try {
    // 1. Start the trace (automatically creates root span)
    const result = await parallaxService.startTransactionTrace(
      {
        from: userAddress,
        to: recipientAddress,
        value: amount,
        network: 'ethereum',
        walletAddress: userAddress,
      },
      'SendETH',
      { includeClientMeta: true }
    );

    txId = result.txId;
    console.log('Trace started:', result.traceId);

    // 2. User signs the transaction
    await parallaxService.addTransactionEvent(txId, 'user_signing', {});

    const signedTx = await wallet.signTransaction(txData);

    await parallaxService.addTransactionEvent(txId, 'transaction_signed', {});

    // 3. Send to network
    await parallaxService.addTransactionEvent(txId, 'sending_to_network', {});

    const txReceipt = await provider.sendTransaction(signedTx);

    // 4. Associate the blockchain transaction hash
    await parallaxService.associateTransactionHash(txId, txReceipt.hash, 1);

    // 5. Wait for confirmation
    await parallaxService.addTransactionEvent(txId, 'waiting_confirmation', {
      txHash: txReceipt.hash,
    });

    await txReceipt.wait();

    // 6. Success!
    await parallaxService.finishTransactionTrace(txId, { success: true });
    console.log('Transaction completed successfully');

  } catch (error) {
    console.error('Transaction failed:', error);

    if (txId) {
      await parallaxService.addTransactionError(txId, error, 'TransactionError');
      await parallaxService.finishTransactionTrace(txId, {
        success: false,
        error: error.message,
      });
    }

    throw error;
  }
}
```

## Automatic Client Metadata Collection

When `includeClientMeta: true` is set, the SDK automatically collects:

- **Browser**: Chrome, Firefox, Safari, Edge, etc.
- **Operating System**: Windows, macOS, Linux, Android, iOS
- **User Agent**: Full user agent string
- **Platform**: Browser platform
- **Language**: Browser language
- **Screen**: Width and height
- **Viewport**: Width and height
- **Timezone**: User's timezone and offset
- **URL**: Current page URL
- **Referrer**: Page referrer
- **IP Address**: Client IP (if not blocked by CSP)

All metadata is prefixed with `client.` in trace attributes.

## Environment Detection

The SDK automatically detects the environment:

- **Localhost/127.0.0.1**: Uses proxy at `${window.location.protocol}//${window.location.host}/parallax-gateway`
- **Production**: Uses `https://gateway-parallax-dev.mirador.org`

Override with the `gatewayUrl` option.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
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
} from '@miradorlabs/parallax-web';
```

## Browser Compatibility

This SDK uses modern browser APIs and is compatible with:

- ES2020+
- Fetch API
- Promises
- Uint8Array
- Modern browsers (Chrome, Firefox, Safari, Edge)

For older browsers, you may need polyfills.

## Module Formats

The package provides multiple module formats:

- **ESM** (`dist/index.esm.js`): For modern bundlers (Webpack, Vite, Rollup)
- **UMD** (`dist/index.umd.js`): For browser globals and older module systems
- **TypeScript** (`dist/index.d.ts`): Type definitions

## Key Differences from Node.js Client

The web client (`@miradorlabs/parallax-web`) differs from the Node.js client (`@miradorlabs/parallax`):

| Feature | Web Client | Node.js Client |
|---------|------------|----------------|
| Transport | gRPC-Web (HTTP/1.1) | gRPC (@grpc/grpc-js) |
| Protocol | `https://` | `http://` or `https://` |
| Environment | Browser | Node.js |
| Protobuf | google-protobuf (classes) | ts-proto (plain objects) |
| API Style | `.getTraceId()` setters/getters | `.traceId` properties |
| Client Metadata | Browser-specific | Server-specific |

## Important Update: Automatic Root Span Creation

**Breaking Change (v1.0.5+):**

When you call `createTrace()`, a root span is now **automatically created** on the backend. The response includes:
- `traceId`: The trace identifier
- `rootSpanId`: The automatically created root span ID

**You no longer need to:**
- Call `startSpan()` immediately after `createTrace()`
- Manually create the first span

**When to use `startSpan()`:**
- Only when you need **child spans** for more detailed tracking
- Use `rootSpanId` as the `parentSpanId` for child spans

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

### Publishing

```bash
npm run release:patch  # 1.0.x
npm run release:minor  # 1.x.0
npm run release:major  # x.0.0
```

## Documentation

- [ParallaxService Usage Guide](./PARALLAX_SERVICE_USAGE.md) - Comprehensive guide for the high-level API
- [Examples](./examples) - More usage examples

## License

ISC

## Author

@mirador
