# Parallax Web Client SDK

Web browser SDK for the Parallax tracing platform. This package provides a browser-compatible client using gRPC-Web to interact with the Parallax Gateway API.

## Installation

```bash
npm install @miradorlabs/parallax-web
```

## Features

- **Fluent Builder Pattern** - Method chaining for creating traces
- **Browser-optimized** - Automatic client metadata collection (browser, OS, etc.)
- **Blockchain Integration** - Built-in support for correlating traces with blockchain transactions
- **TypeScript Support** - Full type definitions included
- **Single Request** - All trace data submitted in one efficient gRPC call

## Quick Start

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

// API key is required, gateway URL is optional
const client = new ParallaxClient('your-api-key');

// Create and submit a trace
const response = await client.trace('SwapExecution')
  .addAttribute('from', '0xabc...')
  .addAttribute('slippage', { bps: 50, tolerance: 'auto' })  // objects are stringified
  .addTags(['dex', 'swap'])
  .addEvent('quote_received', { provider: 'Uniswap' })
  .addEvent('transaction_signed')
  .setTxHint('0xtxhash...', 'ethereum')  // optional
  .create();

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

##### `trace(name?, includeClientMeta?)`

Creates a new trace builder.

```typescript
const trace = client.trace('MyTrace');  // client metadata included by default
const trace = client.trace();           // name is optional (defaults to empty string)
// Or explicitly disable client metadata: client.trace('MyTrace', false)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `name` | `string` | `''` | Optional name of the trace |
| `includeClientMeta` | `boolean` | `true` | Include browser/OS metadata |

Returns: `ParallaxTrace` builder instance

##### `getClientMetadata()`

Get collected client metadata (synchronous).

```typescript
const metadata = client.getClientMetadata();
// { browser: 'Chrome', browserVersion: '120', os: 'macOS', osVersion: '14.0', ... }
```

### ParallaxTrace (Builder)

Fluent builder for constructing traces. All methods return `this` for chaining.

#### `addAttribute(key, value)`

Add a single attribute. Objects are automatically stringified.

```typescript
trace.addAttribute('user', '0xabc...')
     .addAttribute('amount', 1.5)
     .addAttribute('config', { slippage: 50, deadline: 300 })  // stringified to JSON
```

#### `addAttributes(attrs)`

Add multiple attributes at once. Objects are automatically stringified.

```typescript
trace.addAttributes({
  from: '0xabc...',
  to: '0xdef...',
  value: 1.0,
  metadata: { source: 'web', version: '1.0' }  // stringified to JSON
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

#### `setTxHint(txHash, chain, details?)`

Set the transaction hash hint for blockchain correlation.

```typescript
trace.setTxHint('0x123...', 'ethereum', 'Main transaction')
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `txHash` | `string` | Transaction hash |
| `chain` | `ChainName` | Chain name: 'ethereum' \| 'polygon' \| 'arbitrum' \| 'base' \| 'optimism' \| 'bsc' |
| `details` | `string` | Optional details about the transaction |

#### `create()`

Submit the trace to the gateway.

```typescript
const response = await trace.create();
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
      .setTxHint(receipt.hash, 'ethereum')
      .create();

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
      .create();

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
  ChainName,  // 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'bsc'
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
