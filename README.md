# Parallax Web Client SDK

Web browser SDK for the Parallax tracing platform. This package provides a browser-compatible client using gRPC-Web to interact with the Parallax Gateway API.

## Installation

```bash
npm install @miradorlabs/parallax-web
```

## Features

- **Simple Builder Pattern** - Fluent API for creating traces with method chaining
- **Browser-optimized** - Automatic client metadata collection (browser, OS, IP, etc.)
- **Blockchain Integration** - Built-in support for correlating traces with blockchain transactions
- **TypeScript Support** - Full type definitions included
- **Single Request** - All trace data submitted in one efficient gRPC call

## Quick Start

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

// API key is required, gateway URL is optional
const client = new ParallaxClient('your-api-key');

// Create and submit a trace using the builder pattern
const response = await client.trace('SendTransaction')  // client metadata included by default
  .addAttribute('from', userAddress)
  .addAttribute('to', recipientAddress)
  .addAttribute('value', amount)
  .addTags(['transaction', 'ethereum'])
  .addEvent('wallet_connected', { wallet: 'MetaMask' })
  .addEvent('transaction_sent', { txHash, success: true })
  .submit(txHash, '1');  // txHash, chainId

console.log('Trace ID:', response.getTraceId());
```

## API Reference

### ParallaxClient

The main client for interacting with the Parallax Gateway.

#### Constructor

```typescript
new ParallaxClient(apiKey: string, apiUrl?: string)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | `string` | Yes | API key for authentication (sent as `x-parallax-api-key` header) |
| `apiUrl` | `string` | No | Gateway URL (defaults to `https://parallax-gateway.dev.mirador.org:443`) |

#### Methods

##### `trace(name, includeClientMeta?)`

Creates a new trace builder.

```typescript
const trace = client.trace('MyTrace');  // client metadata included by default
// Or explicitly disable: client.trace('MyTrace', false)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | - | Name of the trace |
| `includeClientMeta` | `boolean` | `true` | Include browser/OS metadata |

Returns: `ParallaxTrace` builder instance

##### `createTrace(request)`

Low-level method to send a `CreateTraceRequest` directly.

```typescript
const response = await client.createTrace(request);
```

##### `getClientMetadata()`

Get collected client metadata (synchronous).

```typescript
const metadata = client.getClientMetadata();
// { browser: 'Chrome', browserVersion: '120', os: 'macOS', osVersion: '14.0', ... }
```

### ParallaxTrace (Builder)

Fluent builder for constructing traces. All methods return `this` for chaining.

#### `addAttribute(key, value)`

Add a single attribute.

```typescript
trace.addAttribute('user', '0xabc...')
     .addAttribute('amount', '1.5')
```

#### `addAttributes(attrs)`

Add multiple attributes at once.

```typescript
trace.addAttributes({
  from: '0xabc...',
  to: '0xdef...',
  value: '1.0'
})
```

#### `addTag(tag)` / `addTags(tags)`

Add tags to categorize the trace.

```typescript
trace.addTag('transaction')
     .addTags(['ethereum', 'send'])
```

#### `addEvent(name, details?)`

Add an event with optional details (string or object).

```typescript
trace.addEvent('wallet_connected', { wallet: 'MetaMask' })
     .addEvent('transaction_initiated')
     .addEvent('transaction_confirmed', { blockNumber: 12345 })
```

#### `setTxHash(txHash, chainId, details?)`

Set the transaction hash hint (can also be set in `submit()`).

```typescript
trace.setTxHash('0x123...', '1', 'Main transaction')
```

#### `submit(txHash?, chainId?)`

Submit the trace to the gateway. Optionally include transaction hash (overrides `setTxHash()`).

```typescript
// Without transaction hash
const response = await trace.submit();

// With transaction hash
const response = await trace.submit('0x123...', '1');
```

Returns: `Promise<CreateTraceResponse>`

## Complete Example: Transaction Tracking

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

const client = new ParallaxClient('your-api-key');

async function handleWalletTransaction(userAddress: string, recipientAddress: string, amount: string) {
  try {
    // Build trace with all transaction details (client metadata included by default)
    const response = await client.trace('SendETH')
      .addAttribute('from', userAddress)
      .addAttribute('to', recipientAddress)
      .addAttribute('value', amount)
      .addAttribute('network', 'ethereum')
      .addTags(['transaction', 'send', 'ethereum'])
      .addEvent('wallet_connected', { wallet: 'MetaMask' })
      .addEvent('transaction_initiated')
      .addEvent('user_signed')
      .addEvent('transaction_sent', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        success: true
      })
      .submit(receipt.hash, '1');

    console.log('Trace ID:', response.getTraceId());

  } catch (error) {
    // Track failed transactions
    await client.trace('SendETH_Error')
      .addAttribute('from', userAddress)
      .addAttribute('errorType', error.name)
      .addAttribute('errorMessage', error.message)
      .addAttribute('success', 'false')
      .addTags(['transaction', 'send', 'error'])
      .addEvent('transaction_error', {
        error: error.message,
        stack: error.stack
      })
      .submit();

    throw error;
  }
}
```

## Automatic Client Metadata Collection

When `includeClientMeta: true` is set, the SDK automatically collects:

| Metadata | Description |
|----------|-------------|
| `client.browser` | Chrome, Firefox, Safari, Edge |
| `client.browserVersion` | Browser version number |
| `client.os` | Windows, macOS, Linux, Android, iOS |
| `client.osVersion` | Operating system version |
| `client.deviceType` | desktop, mobile, or tablet |
| `client.userAgent` | Full user agent string |
| `client.language` | Primary browser language |
| `client.languages` | All preferred languages (comma-separated) |
| `client.screenWidth` / `client.screenHeight` | Screen dimensions |
| `client.viewportWidth` / `client.viewportHeight` | Viewport dimensions |
| `client.colorDepth` | Screen color depth |
| `client.pixelRatio` | Device pixel ratio (for retina displays) |
| `client.cpuCores` | Number of CPU cores |
| `client.deviceMemory` | Device memory in GB (if available) |
| `client.touchSupport` | Whether touch is supported |
| `client.connectionType` | Network connection type (4g, 3g, wifi, etc.) |
| `client.cookiesEnabled` | Whether cookies are enabled |
| `client.online` | Whether browser is online |
| `client.doNotTrack` | Do Not Track preference |
| `client.timezone` | User's timezone |
| `client.timezoneOffset` | Timezone offset from UTC |
| `client.url` | Current page URL |
| `client.origin` | Page origin |
| `client.pathname` | Page pathname |
| `client.referrer` | Page referrer |
| `client.documentVisibility` | Document visibility state |

Note: IP address is captured by the backend from request headers.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import {
  ParallaxClient,
  ParallaxTrace,
  CreateTraceRequest,
  CreateTraceResponse,
} from '@miradorlabs/parallax-web';
```

## Browser Compatibility

This SDK uses modern browser APIs and is compatible with:

- ES2020+
- Fetch API
- Promises
- Modern browsers (Chrome, Firefox, Safari, Edge)

For older browsers, you may need polyfills.

## Module Formats

The package provides multiple module formats:

- **ESM** (`dist/index.esm.js`): For modern bundlers (Webpack, Vite, Rollup)
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

### Publishing

```bash
npm run release:patch  # 1.0.x
npm run release:minor  # 1.x.0
npm run release:major  # x.0.0
```

## License

ISC

## Author

@mirador
