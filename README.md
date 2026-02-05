# Mirador Web Client SDK

Web browser SDK for the Mirador tracing platform. This package provides a browser-compatible client using gRPC-Web to interact with the Mirador Ingest Gateway API.

## Installation

```bash
npm install @miradorlabs/web
```

## Features

- **Keep-Alive** - Automatic periodic pings to maintain trace liveness (configurable interval)
- **Trace Lifecycle** - Explicit close trace method with automatic cleanup
- **Fluent Builder Pattern** - Method chaining for building traces
- **Browser-optimized** - Automatic client metadata collection (browser, OS, etc.)
- **Blockchain Integration** - Built-in support for correlating traces with blockchain transactions
- **Stack Trace Capture** - Automatic or manual capture of call stack for debugging
- **TypeScript Support** - Full type definitions included
- **Strict Ordering** - Flush calls maintain strict ordering even when async

## Quick Start (Default)

```typescript
import { Client } from '@miradorlabs/web';

const client = new Client('your-api-key');

const trace = client.trace({ name: 'SwapExecution' })
  .addAttribute('from', '0xabc...')
  .addTags(['dex', 'swap'])
  .addEvent('quote_received');
// → CreateTrace sent after 50ms of inactivity

trace.addEvent('transaction_signed')
     .addTxHint('0xtxhash...', 'ethereum');
// → UpdateTrace sent after 50ms of inactivity

// You can still call flush() explicitly to send immediately
trace.addEvent('confirmed');
trace.flush();  // → UpdateTrace sent immediately
```

## Manual Flush Mode

```typescript
import { Client } from '@miradorlabs/web';

const client = new Client('your-api-key');

const trace = client.trace({ name: 'SwapExecution', })
  .addAttribute('from', '0xabc...')
  .addTags(['dex', 'swap'])
  .addEvent('quote_received');

trace.flush();  // → CreateTrace

trace.addEvent('transaction_signed')
     .addTxHint('0xtxhash...', 'ethereum');

trace.flush();  // → UpdateTrace
```

## Immediate Flush Mode

Set `flushPeriodMs: 0` to flush immediately on every SDK call (no batching):

```typescript
import { Client } from '@miradorlabs/web';

const client = new Client('your-api-key');

const trace = client.trace({ name: 'SwapExecution', flushPeriodMs: 0 })
  .addAttribute('from', '0xabc...');  // → CreateTrace sent immediately

trace.addEvent('transaction_signed'); // → UpdateTrace sent immediately
trace.addTxHint('0x...', 'ethereum'); // → UpdateTrace sent immediately
```

## Keep-Alive & Trace Lifecycle

### Automatic Keep-Alive

The SDK automatically sends keep-alive pings to the server every 10 seconds (configurable) to maintain trace liveness. This starts automatically after the first successful trace creation.

```typescript
// Use default 10-second interval
const client = new Client('your-api-key');

// Or customize the interval
const client = new Client('your-api-key', {
  keepAliveIntervalMs: 15000  // Ping every 15 seconds
});

const trace = client.trace({ name: 'MyTrace' });
// Keep-alive starts automatically after first flush completes
```

### Closing Traces

Always close traces when you're done to clean up resources and notify the server:

```typescript
const trace = client.trace({ name: 'UserSession' });

// ... add events, attributes, etc ...

// Close when done
await trace.close('Session ended');

// All subsequent operations are ignored
trace.addEvent('ignored');  // Logs warning, does nothing
```

**Best Practices:**
- Always call `close()` when you're done with a trace
- Use try-catch blocks to ensure traces are closed even on errors
- Provide a meaningful reason to help with debugging

```typescript
const trace = client.trace({ name: 'CheckoutFlow' });

try {
  // ... trace user checkout flow ...
  await trace.close('Checkout completed');
} catch (error) {
  trace.addEvent('error', { message: error.message });
  await trace.close('Checkout failed');
}
```

### Auto-Close on Page Unload

For browser-based applications, you can enable automatic trace closing when the user navigates away or closes the tab:

```typescript
const trace = client.trace({
  name: 'UserSession',
  autoClose: true  // Automatically close on page unload
});

// Trace will automatically close with reason "Page unload" when:
// - User closes the tab/window
// - User navigates to a different page
// - Page is refreshed
```

**Important Notes:**
- Auto-close uses the `beforeunload` event
- The trace will be closed with the reason "Page unload"
- You can still manually call `close()` before page unload
- The event listener is automatically cleaned up when you manually close the trace

## API Reference

### Client

The main client for interacting with the Mirador Ingest Gateway.

#### Constructor

```typescript
new Client(apiKey: string, options?: ClientOptions)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | `string` | Yes | API key for authentication (sent as `x-ingest-api-key` header) |
| `options` | `ClientOptions` | No | Configuration options |

#### Options

```typescript
interface ClientOptions {
  apiUrl?: string;              // Gateway URL (defaults to ingest-gateway-dev.mirador.org:443)
  keepAliveIntervalMs?: number; // Keep-alive ping interval in milliseconds (default: 10000)
}
```

#### Methods

##### `trace(options?)`

Creates a new trace builder.

```typescript
const trace = client.trace({ name: 'MyTrace' });
const trace = client.trace({ name: 'MyTrace', });
const trace = client.trace({ flushPeriodMs: 100 });

// Stack trace capture is enabled by default - to disable:
const trace = client.trace({ name: 'MyTrace', captureStackTrace: false });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `undefined` | Optional name of the trace |
| `flushPeriodMs` | `number` | `50` | Debounce period in ms (0 = immediate flush on every call) |
| `includeUserMeta` | `boolean` | `true` | Include browser/OS metadata |
| `maxRetries` | `number` | `3` | Maximum retry attempts on network failure |
| `retryBackoff` | `number` | `1000` | Base delay in ms for exponential backoff (doubles each retry) |
| `autoClose` | `boolean` | `false` | Automatically close trace on page unload |
| `captureStackTrace` | `boolean` | `true` | Capture stack trace at trace creation point |

Returns: `Trace` builder instance

### Trace (Builder)

Fluent builder for constructing traces. All builder methods return `this` for chaining.

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

#### `addEvent(name, details?, options?)`

Add an event with optional details (string or object) and optional settings.

```typescript
trace.addEvent('wallet_connected', { wallet: 'MetaMask' })
     .addEvent('transaction_initiated')
     .addEvent('transaction_confirmed', { blockNumber: 12345 })

// With stack trace - captures where in your code the event was added
trace.addEvent('error_occurred', { code: 500 }, { captureStackTrace: true })

// Legacy: timestamp can still be passed as third parameter for backward compatibility
trace.addEvent('custom_event', 'details', new Date())
```

| Parameter | Type                       | Description                                         |
|-----------|----------------------------|-----------------------------------------------------|
| `name`    | `string`                   | Event name                                          |
| `details` | `string \| object`         | Optional event details (objects are stringified)    |
| `options` | `AddEventOptions \| Date`  | Options with `captureStackTrace`, or legacy Date    |

#### `addStackTrace(eventName?, additionalDetails?)`

Capture and add the current stack trace as an event. Useful for debugging or tracking code paths.

```typescript
trace.addStackTrace()  // Creates event named "stack_trace"
trace.addStackTrace('checkpoint', { stage: 'validation' })
```

| Parameter           | Type     | Description                                      |
|---------------------|----------|--------------------------------------------------|
| `eventName`         | `string` | Event name (defaults to "stack_trace")           |
| `additionalDetails` | `object` | Optional additional details to include           |

#### `addExistingStackTrace(stackTrace, eventName?, additionalDetails?)`

Add a previously captured stack trace as an event. Useful when you need to capture a stack trace at one point but record it later.

```typescript
import { captureStackTrace } from '@miradorlabs/web';

// Capture stack trace now
const stack = captureStackTrace();

// ... later ...
trace.addExistingStackTrace(stack, 'deferred_location', { reason: 'async operation' })
```

| Parameter           | Type         | Description                                      |
|---------------------|--------------|--------------------------------------------------|
| `stackTrace`        | `StackTrace` | Previously captured stack trace                  |
| `eventName`         | `string`     | Event name (defaults to "stack_trace")           |
| `additionalDetails` | `object`     | Optional additional details to include           |

#### `addTxHint(txHash, chain, details?)`

Add a transaction hash hint for blockchain correlation. Multiple hints can be added.

```typescript
trace.addTxHint('0x123...', 'ethereum', 'Main transaction')
     .addTxHint('0x456...', 'polygon', 'Bridge transaction')
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `txHash` | `string` | Transaction hash |
| `chain` | `ChainName` | Chain name: 'ethereum' \| 'polygon' \| 'arbitrum' \| 'base' \| 'optimism' \| 'bsc' |
| `details` | `string` | Optional details about the transaction |

#### `flush()`

Flush pending data to the gateway. Fire-and-forget - returns immediately but maintains strict ordering.

- First flush calls `CreateTrace`
- Subsequent flushes call `UpdateTrace`

```typescript
trace.flush();
```

Returns: `void`

#### `getTraceId()`

Get the trace ID (available after first flush completes).

```typescript
const traceId = trace.getTraceId();  // string | null
```

#### `close(reason?)`

Close the trace and stop all timers (flush timer and keep-alive timer). After calling this method, all subsequent operations will be ignored.

```typescript
await trace.close();
await trace.close('User completed workflow');
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `reason` | `string` | Optional reason for closing the trace |

Returns: `Promise<void>`

**Important:** Once a trace is closed:
- All method calls (`addAttribute`, `addEvent`, `addTag`, `addTxHint`, `flush`) will be ignored with a warning
- The keep-alive timer will be stopped
- A close request will be sent to the server

#### `isClosed()`

Check if the trace has been closed.

```typescript
const closed = trace.isClosed();  // boolean
```

## Complete Example: Transaction Tracking

```typescript
import { Client } from '@miradorlabs/web';

// Create client with custom keep-alive interval (optional)
const client = new Client('your-api-key', {
  keepAliveIntervalMs: 15000  // Override default 10s interval
});

async function handleWalletTransaction(userAddress: string, recipientAddress: string, amount: string) {
  const trace = client.trace({ name: 'SendETH' })
    .addAttribute('from', userAddress)
    .addAttribute('to', recipientAddress)
    .addAttribute('value', amount)
    .addTags(['transaction', 'send', 'ethereum'])
    .addEvent('wallet_connected', { wallet: 'MetaMask' });
  // → CreateTrace sent automatically
  // → Keep-alive timer starts automatically

  trace.addEvent('user_signed');

  try {
    const receipt = await sendTransaction();

    trace.addEvent('transaction_sent', { txHash: receipt.hash })
         .addTxHint(receipt.hash, 'ethereum');
    // → UpdateTrace sent automatically

    // Close the trace when done
    await trace.close('Transaction completed successfully');
  } catch (error) {
    trace.addEvent('transaction_failed', { error: error.message });
    await trace.close('Transaction failed');
  }
}
```

## Automatic Client Metadata Collection

When `includeUserMeta: true` is set (default), the SDK automatically collects:

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

## Stack Trace Utilities

The SDK exports utilities for capturing and formatting stack traces:

```typescript
import {
  captureStackTrace,
  formatStackTrace,
  formatStackTraceReadable
} from '@miradorlabs/web';

// Capture current stack trace
const stack = captureStackTrace();
// stack.frames: Array of { functionName, fileName, lineNumber, columnNumber }
// stack.raw: Original Error.stack string

// Format for storage (JSON string)
const json = formatStackTrace(stack);

// Format for display (human-readable)
const readable = formatStackTraceReadable(stack);
// Output:
//   at myFunction (/path/to/file.js:42:10)
//   at caller (/path/to/other.js:15:5)
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import {
  Client,
  Trace,
  ClientOptions,
  TraceOptions,      // { captureStackTrace?: boolean, ... }
  AddEventOptions,   // { captureStackTrace?: boolean }
  StackFrame,        // { functionName, fileName, lineNumber, columnNumber }
  StackTrace,        // { frames: StackFrame[], raw: string }
  ChainName,         // 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'bsc'
} from '@miradorlabs/web';
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

## Example Application

A complete working example is available in the [`example/`](./example/) directory. It demonstrates:

- Wallet connection using EIP-6963 (Multi Injected Provider Discovery)
- Creating and managing traces
- Adding attributes, tags, and events
- Blockchain transaction correlation with `addTxHint()`
- Network switching and balance display

To run the example:

```bash
cd example
npm install
npm run build
npm start
```

Then open <http://localhost:8000> in your browser.

## License

MIT

## Author

@miradorlabs
