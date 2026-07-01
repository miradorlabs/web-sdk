# Mirador Web SDK

[![npm](https://img.shields.io/npm/v/@miradorlabs/web-sdk)](https://www.npmjs.com/package/@miradorlabs/web-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Browser SDK for [Mirador](https://mirador.org) — cross-chain observability for blockchain applications. Capture transactions, correlate bridge flows, and trace user actions across EVM and Solana chains from your frontend.

> Looking for the server-side SDK? See [`@miradorlabs/nodejs-sdk`](https://github.com/miradorlabs/nodejs-sdk).

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Quick Start (Default)](#quick-start-default)
- [Manual Flush Mode](#manual-flush-mode)
- [Keep-Alive & Trace Lifecycle](#keep-alive--trace-lifecycle)
- [API Reference](#api-reference)
  - [Client](#client)
  - [Trace (Builder)](#trace-builder)
  - [Spans](#spans)
- [Logger](#logger)
- [Lifecycle Callbacks (TraceCallbacks)](#lifecycle-callbacks-tracecallbacks)
- [Sampling](#sampling)
- [Complete Example: Transaction Tracking](#complete-example-transaction-tracking)
- [Tracing Transaction Input Data with ethers.js](#tracing-transaction-input-data-with-ethersjs)
- [Cross-SDK Trace Sharing](#cross-sdk-trace-sharing)
- [MiradorProvider](#miradorprovider)
- [Chain Utilities](#chain-utilities)
- [Automatic Client Metadata Collection](#automatic-client-metadata-collection)
- [Stack Trace Utilities](#stack-trace-utilities)
- [TypeScript Support](#typescript-support)
- [Browser Compatibility](#browser-compatibility)
- [Module Formats](#module-formats)
- [Development](#development)
- [Example Application](#example-application)
- [Links](#links)
- [License](#license)

## Installation

```bash
npm install @miradorlabs/web-sdk
```

## Features

- **Keep-Alive** - Automatic periodic pings with in-flight guard, single retry, and auto-stop after 3 consecutive failures
- **Trace Lifecycle** - Explicit close trace method with automatic cleanup and flush queue draining
- **Fluent Builder Pattern** - Method chaining for building traces
- **Spans** - Time and nest units of work with `trace.startSpan()` / `trace.span(name, fn)`; events nest under the active span
- **Browser-optimized** - Automatic client metadata collection (browser, OS, etc.)
- **Blockchain Integration** - Built-in support for correlating traces with blockchain transactions
- **Stack Trace Capture** - Automatic or manual capture of call stack for debugging
- **TypeScript Support** - Full type definitions included
- **Strict Ordering** - Flush calls maintain strict ordering even when async
- **Cross-SDK Trace Sharing** - Resume traces across frontend and backend SDKs
- **Safe Multisig Tracking** - Track Safe message and transaction confirmations via `web3.safe.addMsgHint()` and `web3.safe.addTxHint()`
- **Solana Transaction Tracking** - Correlate Solana transactions to a trace via `web3.solana.addTxHint(signature)`
- **Relay Bridge Tracking** - Track Relay (relay.link) intent-based bridges across chains via `web3.relay.addQuoteHint()` — backend processor emits the full lifecycle (deposit → solver-committed → fill / refund) as trace events
- **Canton Transaction Tracking** - Correlate Canton (Daml Ledger API v2) transactions to a trace via `web3.canton.addTxHint(updateId, partyId?)` — `partyId` is optional (omit it for observer co-hosts)
- **EIP-1193 Provider Integration** - Send transactions directly through traces with `sendTransaction()`
- **Wallet Discovery** - `MiradorProvider` auto-detects installed wallets via EIP-6963 (with legacy `window.ethereum` fallback) and tags each trace with the wallet that signed (name, rdns, version)
- **Configurable Logger** - Pluggable `Logger` interface (defaults to no-op; enable with `debug: true` or provide custom logger)
- **Lifecycle Callbacks** - `TraceCallbacks` for observing flush success/failure, close, and dropped items
- **Sampling** - `sampleRate` (0–1) or custom `sampler` function; sampled-out traces return `NoopTrace`
- **Rate Limiting** - Automatic 30s client-wide backoff on `RESOURCE_EXHAUSTED` (gRPC code 8)
- **Retry with Jitter** - Full jitter backoff (`random(0, base * 2^attempt)`) on retryable gRPC errors
- **Queue Size Limits** - Configurable `maxQueueSize` (default 4096) with `onDropped` callback
- **Flush Batch Splitting** - Large flushes automatically split at 100 items with overflow re-scheduling
- **Trace Abandonment** - After retry exhaustion, trace stops all API calls to prevent runaway retries
- **Max Trace Lifetime** - Optional `maxTraceLifetimeMs` to auto-close long-running traces
- **Call Timeout** - Per-call `callTimeoutMs` (default 5000ms) wrapping all gRPC operations

## Quick Start (Default)

```typescript
import { Client } from '@miradorlabs/web-sdk';

const client = new Client('your-api-key');

const trace = client.trace({ name: 'SwapExecution' })
  .addAttribute('from', '0xabc...')
  .addTags(['dex', 'swap'])
  .info('quote_received');
// → FlushTrace sent after 50ms of inactivity

trace.info('transaction_signed')
     .web3.evm.addTxHint('0xtxhash...', 'ethereum');
// → FlushTrace sent after 50ms of inactivity

// You can still call flush() explicitly to send immediately
trace.info('confirmed');
trace.flush();  // → FlushTrace sent immediately
```

## Manual Flush Mode

```typescript
import { Client } from '@miradorlabs/web-sdk';

const client = new Client('your-api-key');

const trace = client.trace({ name: 'SwapExecution', })
  .addAttribute('from', '0xabc...')
  .addTags(['dex', 'swap'])
  .info('quote_received');

trace.flush();  // → FlushTrace

trace.info('transaction_signed')
     .web3.evm.addTxHint('0xtxhash...', 'ethereum');

trace.flush();  // → FlushTrace
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
trace.info('ignored');  // Logs warning, does nothing
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
  trace.error('error', { message: error.message });
  await trace.close('Checkout failed');
}
```

### Auto-Close on Page Visibility Change

For browser-based applications, you can enable automatic trace closing when the page becomes hidden:

```typescript
const trace = client.trace({
  name: 'UserSession',
  autoClose: true  // Automatically close when page becomes hidden
});

// Trace will automatically close with reason "Page hidden" when:
// - User switches to a different tab
// - User minimizes the browser
// - User navigates to a different page
// - User closes the tab/window
```

**Important Notes:**
- Auto-close uses the `visibilitychange` event on `document`
- The trace will be closed with the reason "Page hidden"
- You can still manually call `close()` before the page becomes hidden
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
  apiUrl?: string;              // Gateway URL (defaults to https://ingest.mirador.org:443)
  keepAliveIntervalMs?: number; // Keep-alive ping interval in milliseconds (default: 10000)
  provider?: EIP1193Provider;   // EIP-1193 provider for transaction operations
  callTimeoutMs?: number;       // Per-call timeout for gRPC operations (default: 5000)
  debug?: boolean;              // Enable debug logging via console (default: false)
  logger?: Logger;              // Custom logger implementation (defaults to no-op)
  callbacks?: TraceCallbacks;   // Default lifecycle callbacks for all traces
  sampleRate?: number;          // Sample rate 0–1 (default: 1 = send all)
  sampler?: (options: TraceOptions) => boolean; // Custom sampler (overrides sampleRate)
}
```

#### Methods

##### `trace(options?)`

Creates a new trace builder.

```typescript
const trace = client.trace({ name: 'MyTrace' });
const trace = client.trace({ name: 'MyTrace', });

// Stack trace capture is enabled by default - to disable:
const trace = client.trace({ name: 'MyTrace', captureStackTrace: false });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | `undefined` | Optional name of the trace |
| `traceId` | `string` | auto-generated | Resume an existing trace by ID, or auto-generated W3C trace ID (32 hex chars) |
| `includeUserMeta` | `boolean` | `true` | Include browser/OS metadata |
| `maxRetries` | `number` | `2` | Maximum retry attempts on retryable gRPC errors |
| `retryBackoff` | `number` | `500` | Base delay in ms for full jitter backoff |
| `autoClose` | `boolean` | `false` | Automatically close trace on page visibility change |
| `provider` | `EIP1193Provider` | `undefined` | EIP-1193 provider for transaction operations |
| `autoKeepAlive` | `boolean` | `true`/`false` | Auto keep-alive (default: true for new, false when resuming) |
| `maxTraceLifetimeMs` | `number` | `0` | Max trace lifetime in ms (0 = disabled). Auto-closes trace after this duration |
| `maxQueueSize` | `number` | `4096` | Max pending items before dropping |
| `callbacks` | `TraceCallbacks` | `undefined` | Per-trace lifecycle callbacks (overrides client-level) |

> **Note:** A W3C-compatible trace ID (32 hex chars) is automatically generated when you call `client.trace()`. If you pass `traceId`, the trace resumes an existing trace instead.

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

#### `info(name, details?, options?)` / `warn(...)` / `error(...)`

Record an event with the corresponding severity level. All three share the same signature.

```typescript
trace.info('wallet_connected', { wallet: 'MetaMask' })
     .info('transaction_initiated')
     .info('transaction_confirmed', { blockNumber: 12345 })

trace.warn('rate_limit', 'approaching limit')

trace.error('processing_failed', { code: 500 })

// With stack trace capture
trace.error('crash', { code: 500 }, { captureStackTrace: true })
```

| Parameter | Type               | Description                                      |
|-----------|--------------------|--------------------------------------------------|
| `name`    | `string`           | Event name                                       |
| `details` | `string \| object` | Optional event details (objects are stringified) |
| `options` | `object`           | Optional settings (e.g. `{ captureStackTrace: true }`) |

#### `addEvent(name, details?, options?)`

Low-level event method. Prefer `info()`, `warning()`, `error()` for clarity.

```typescript
trace.addEvent('custom_event', 'details', { severity: Severity.Warn })

// Legacy: timestamp can still be passed as third parameter for backward compatibility
trace.addEvent('custom_event', 'details', new Date())
```

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
import { captureStackTrace } from '@miradorlabs/web-sdk';

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

#### Spans

Open a span with `startSpan(name, options?)`, or wrap a function with `span(name, fn)`. Spans are timed, nestable units of work within a trace. Events recorded while a span is open nest under it in the trace timeline.

`startSpan()` opens a span and returns a `Span` handle; call `span.end()` to close it:

```typescript
const span = trace.startSpan('swap_quote', { attributes: { dex: 'uniswap' } });
span.setAttribute('amountIn', '1.5');
span.info('quote_received', { price: '3200.50' });
span.end({ status: 'OK' });
```

| Parameter | Type          | Description                                          |
|-----------|---------------|-----------------------------------------------------|
| `name`    | `string`      | Span name                                            |
| `options` | `SpanOptions` | Optional `parentSpanId` and/or initial `attributes` |

`span(name, fn)` runs a function inside a span that ends automatically — status `OK` when it returns, or `ERROR` (with the error message) when it throws. Works with sync and async functions and returns the function's result:

```typescript
const quote = await trace.span('fetch_quote', async (span) => {
  span.setAttribute('pair', 'ETH/USDC');
  return await getQuote();   // throws → span ends ERROR and rethrows
});
```

**Nesting** — a span opened via `trace.startSpan()` parents to the innermost open span (or the trace root); open a child directly from a span with `span.startSpan()`:

```typescript
await trace.span('checkout', async (checkout) => {
  const charge = checkout.startSpan('charge');
  await chargeCard();
  charge.end({ status: 'OK' });
});
```

**Span methods:**

| Method | Description |
|--------|-------------|
| `setAttribute(key, value)` / `setAttributes(obj)` | Set span attributes (before the span first flushes) |
| `addEvent(name, details?, options?)`              | Record an event nested under the span |
| `info(...)` / `warn(...)` / `error(...)`          | Event shortcuts with severity |
| `startSpan(name, options?)`                       | Open a child span |
| `end(options?)`                                   | End the span; `options` = `{ status?: 'OK' \| 'ERROR' \| 'UNSET', message?: string }` |
| `id`                                              | The W3C span id (16 hex chars) |

> Ambient nesting (`trace.info()` attaching to the open span) is reliable in synchronous code. In concurrent async code, prefer the span's own methods (`span.info()`) for precise attribution.

#### Web3Plugin Methods

The following methods are available when `Web3Plugin` is registered. They are accessed via the `web3.evm`, `web3.safe`, `web3.solana`, `web3.relay`, and `web3.canton` namespaces on the trace.

##### `web3.evm.addTxHint(txHash, chain, options?)`

Add a transaction hash hint for blockchain correlation. Accepts `Chain` enum or chain name string.

```typescript
import { Chain } from '@miradorlabs/web-sdk';

trace.web3.evm.addTxHint('0x123...', Chain.Ethereum, 'Main transaction');
trace.web3.evm.addTxHint('0x456...', 'polygon', 'Bridge transaction'); // string also works
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `txHash` | `string` | Transaction hash |
| `chain` | `Chain \| ChainName` | Chain enum value or name string |
| `options` | `string \| TxHintOptions` | Optional details string, or options with `input` and `details` |

##### `web3.safe.addMsgHint(msgHash, chain, details?)`

Add a Safe message hint for tracking Safe multisig message confirmations.

```typescript
trace.web3.safe.addMsgHint('0xmsgHash...', Chain.Ethereum);
trace.web3.safe.addMsgHint('0xotherHash...', Chain.Base, 'Token approval');
```

##### `web3.safe.addTxHint(safeTxHash, chain, details?)`

Add a Safe transaction hint for tracking Safe multisig transaction executions.

```typescript
trace.web3.safe.addTxHint('0xsafeTxHash...', Chain.Ethereum);
trace.web3.safe.addTxHint('0xotherHash...', Chain.Base, 'Token transfer');
```

##### `web3.solana.addTxHint(signature, details?)`

Correlate a Solana transaction to the trace. The `signature` is Solana's ed25519 transaction signature (base58, ~88 chars). No chain argument — the chain identity is implicit, since Solana lives outside the EVM `Chain` enum.

```typescript
trace.web3.solana.addTxHint(tx.signature);
trace.web3.solana.addTxHint(tx.signature, 'Jupiter swap');
```

| Parameter   | Type     | Required | Description |
|-------------|----------|----------|-------------|
| `signature` | `string` | yes      | Solana transaction signature (base58) |
| `details`   | `string` | no       | Optional free-form note attached to the hint |

##### `web3.relay.addQuoteHint(requestId, message?)`

Record a [Relay](https://relay.link) intent hint at quote time — *before* the user deposits — so the Mirador backend can pick the intent up and emit its full lifecycle (deposit → solver-committed → fill, or refund / failed / not-found) as events on the trace.

```typescript
// Minimal — just the Relay requestId.
trace.web3.relay.addQuoteHint('rly_request_123');

// With an optional free-form note (rides on RelayHint.details).
trace.web3.relay.addQuoteHint('rly_request_456', 'queued from swap modal');
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requestId` | `string` | yes | Relay's API correlation key |
| `message` | `string` | no | Free-form note attached to the hint for debugging context |

The relayhint backend processor resolves the full quote server-side from the `requestId` (via bridge-api / Relay's status feed) — you don't need to ship chain IDs, currencies, amounts, or any other metadata from the client.

##### `web3.canton.addTxHint(updateId, partyId?, details?)`

Correlate a Canton (Daml Ledger API v2) transaction to the trace by its ledger **`updateId`** — the unique id of the on-ledger update. Like Solana, Canton lives outside the EVM `Chain` enum, so there's no chain argument; the chain identity is implicit (emitted as `chain_name = "canton"`).

`partyId` is optional: include it to scope the update to a specific party, or omit it when the participant only co-hosts the contract as an observer — the backend can resolve the update from the `updateId` alone.

```typescript
trace.web3.canton.addTxHint('1220...updateId');
trace.web3.canton.addTxHint('1220...updateId', 'Alice::1220...');         // scope to a party
trace.web3.canton.addTxHint('1220...updateId', 'Alice::1220...', 'mint'); // + a note
```

| Parameter  | Type     | Required | Description |
|------------|----------|----------|-------------|
| `updateId` | `string` | yes      | Canton ledger update id (the transaction's unique identifier) |
| `partyId`  | `string` | no       | Party to scope the update to; omit for observer co-hosts |
| `details`  | `string` | no       | Optional free-form note attached to the hint |

The canton-hint backend processor resolves the full transaction server-side from the `updateId` and emits its events onto the trace.

##### `web3.evm.addTx(tx, chain?)`

Add a transaction object, automatically extracting hash, chain, and input data.

```typescript
const tx = await signer.sendTransaction({ to, data });
trace.web3.evm.addTx(tx, Chain.Ethereum);

// Chain inferred from tx.chainId if not provided
trace.web3.evm.addTx({ hash: txHash, data: calldata, chainId: 1 });
```

##### `web3.evm.sendTransaction(tx, provider?)`

Send a transaction through the trace's EIP-1193 provider, automatically capturing events (`tx:send`, `tx:sent`, `tx:error`), input data, and tx hint.

```typescript
const client = new Client('key', { plugins: [Web3Plugin({ provider: window.ethereum })] });
const trace = client.trace({ name: 'Swap' });

const txHash = await trace.web3.evm.sendTransaction({
  from: '0xabc...',
  to: '0xRouterAddress...',
  data: '0x38ed1739...',
});
```

##### `web3.evm.setProvider(provider)`

Set an EIP-1193 provider for transaction operations. Automatically detects chain ID.

```typescript
trace.web3.evm.setProvider(window.ethereum);
```

##### `web3.evm.addInputData(inputData)`

Add transaction input data (calldata) as a trace event.

```typescript
trace.web3.evm.addInputData('0xa9059cbb000000000000000000000000...')
```

#### `flush()`

Flush pending data to the gateway. Fire-and-forget - returns immediately but maintains strict ordering.

Each flush sends `FlushTrace` (an idempotent create-or-update RPC).

```typescript
trace.flush();
```

Returns: `void`

#### `getTraceId()`

Get the trace ID. Always available immediately since trace IDs are generated at `client.trace()` time.

```typescript
const traceId = trace.getTraceId();  // string
```

Returns: `string`

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
- All method calls (`addAttribute`, `addEvent`, `addTag`, `web3.evm.addTxHint`, `web3.safe.addMsgHint`, `web3.safe.addTxHint`, `web3.solana.addTxHint`, `web3.relay.addQuoteHint`, `web3.canton.addTxHint`, `flush`) will be ignored with a warning
- The keep-alive timer will be stopped
- A close request will be sent to the server

#### `isClosed()`

Check if the trace has been closed.

```typescript
const closed = trace.isClosed();  // boolean
```

## Logger

By default, the SDK silences all log output. Enable logging with `debug: true` for console output, or provide a custom `Logger`:

```typescript
// Debug mode — logs to console.debug/warn/error
const client = new Client('key', { debug: true });

// Custom logger
const client = new Client('key', {
  logger: {
    debug: (...args) => myLogger.debug(...args),
    warn:  (...args) => myLogger.warn(...args),
    error: (...args) => myLogger.error(...args),
  },
});
```

## Lifecycle Callbacks (TraceCallbacks)

Observe trace lifecycle events programmatically:

```typescript
const client = new Client('key', {
  callbacks: {
    onFlushed:    (traceId, itemCount) => console.log(`Flushed ${itemCount} items`),
    onFlushError: (error, operation)   => console.error(`${operation} failed:`, error),
    onClosed:     (traceId, reason)    => console.log(`Trace closed: ${reason}`),
    onDropped:    (count, reason)      => console.warn(`Dropped ${count} items: ${reason}`),
  },
});

// Per-trace overrides
const trace = client.trace({
  name: 'ImportantFlow',
  callbacks: { onFlushed: (id, n) => analytics.track('flush', { id, n }) },
});
```

## Sampling

Control which traces are actually sent:

```typescript
// Fixed sample rate — send 10% of traces
const client = new Client('key', { sampleRate: 0.1 });

// Custom sampler — full control
const client = new Client('key', {
  sampler: (options) => {
    // Always sample traces named "critical"
    if (options.name === 'critical') return true;
    return Math.random() < 0.1;
  },
});
```

When a trace is sampled out, `client.trace()` returns a `NoopTrace` — a zero-cost stub with the same API surface. All method calls are no-ops, and `getTraceId()` returns a sentinel value (`'0'.repeat(32)`).

```typescript
import { NoopTrace } from '@miradorlabs/web-sdk';

const trace = client.trace({ name: 'MaybeSampled' });
if (trace instanceof NoopTrace) {
  // This trace was sampled out — no network calls will be made
}
```

## Complete Example: Transaction Tracking

```typescript
import { Client } from '@miradorlabs/web-sdk';

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
    .info('wallet_connected', { wallet: 'MetaMask' });
  // → FlushTrace sent automatically
  // → Keep-alive timer starts automatically

  trace.info('user_signed');

  try {
    const receipt = await sendTransaction();

    trace.info('transaction_sent', { txHash: receipt.hash })
         .web3.evm.addTxHint(receipt.hash, 'ethereum');
    // → FlushTrace sent automatically

    // Close the trace when done
    await trace.close('Transaction completed successfully');
  } catch (error) {
    trace.error('transaction_failed', { error: error.message });
    await trace.close('Transaction failed');
  }
}
```

## Tracing Transaction Input Data with ethers.js

When a transaction fails on-chain, the input data (calldata) is still available and contains the encoded function call and parameters. Recording it with `addTxInputData()` lets you decode and debug the failure later in the Mirador dashboard.

```typescript
import { Client } from '@miradorlabs/web-sdk';
import { BrowserProvider, parseEther } from 'ethers';

const client = new Client('your-api-key');

async function sendTracedTransaction() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const trace = client.trace({ name: 'TokenTransfer' })
    .addAttribute('from', signer.address)
    .addTags(['transfer', 'ethereum']);

  try {
    const tx = await signer.sendTransaction({
      to: '0xRecipientAddress...',
      value: parseEther('0.1'),
      data: '0xa9059cbb000000000000000000000000...', // encoded ERC-20 transfer
    });

    trace.info('transaction_sent', { txHash: tx.hash })
         .web3.evm.addTxHint(tx.hash, 'ethereum')
         .web3.evm.addInputData(tx.data);  // record the calldata for debugging

    const receipt = await tx.wait();
    trace.info('transaction_confirmed', { blockNumber: receipt.blockNumber });
    await trace.close('Transfer completed');
  } catch (error) {
    // Even on failure, tx.data may be available from the error or the sent tx
    trace.error('transaction_failed', { error: error.message });
    await trace.close('Transfer failed');
  }
}
```

## Cross-SDK Trace Sharing

You can share a trace ID between the web SDK and the Node.js SDK to create a unified trace that spans both frontend and backend. This is useful when a user action in the browser triggers server-side processing that should be correlated under the same trace.

### Frontend → Backend

Pass the trace ID from the browser to your backend via an HTTP header. Trace IDs are available immediately since they're generated at `client.trace()` time:

```typescript
import { Client } from '@miradorlabs/web-sdk';

const client = new Client('your-api-key');
const trace = client.trace({ name: 'Checkout' })
  .addAttribute('user', '0xabc...')
  .info('checkout_started');

// Trace ID is available immediately — no need to wait for flush
const traceId = trace.getTraceId();

// Pass trace ID to your backend
const response = await fetch('/api/process-order', {
  headers: { 'x-mirador-trace-id': traceId },
});
```

On the backend (Node.js SDK):

```typescript
import { Client } from '@miradorlabs/nodejs-sdk';

const client = new Client('your-api-key');

app.post('/api/process-order', async (req, res) => {
  const traceId = req.headers['x-mirador-trace-id'];

  // Resume the trace — FlushTrace is idempotent, so this adds to the existing trace
  const trace = client.trace({ name: 'ProcessOrder', traceId })
    .addAttribute('step', 'backend')
    .info('order_processing');
  // → auto-flushed via FlushTrace

  // ...
  await trace.close('Order processed');
});
```

### Backend → Frontend

Pass a trace ID from your backend to the browser and resume it:

```typescript
// Backend creates the trace and returns the ID
const traceId = await getTraceIdFromBackend();

// Resume trace by passing traceId at creation time
const trace = client.trace({ name: 'Dashboard', traceId });
```

## MiradorProvider

`MiradorProvider` is an EIP-1193 provider wrapper that automatically captures transaction data and wallet metadata for Mirador traces. Wrap any existing provider to get automatic tracing for `eth_sendTransaction` and `eth_sendRawTransaction` calls.

```typescript
import { Client, MiradorProvider } from '@miradorlabs/web-sdk';

const client = new Client('your-api-key');

// Option 1: Auto-create a new trace per transaction
const provider = new MiradorProvider(window.ethereum, client);

// Option 2: Bind to an existing trace
const trace = client.trace({ name: 'Swap' });
const provider = new MiradorProvider(window.ethereum, client, { trace });

// Option 3: Configure trace options for auto-created traces
const provider = new MiradorProvider(window.ethereum, client, {
  traceOptions: { name: 'WalletTx' }
});

// Use like any EIP-1193 provider — transactions are automatically traced
const txHash = await provider.request({
  method: 'eth_sendTransaction',
  params: [{ from: '0xabc...', to: '0xdef...', value: '0x0' }],
});
```

For each intercepted transaction, `MiradorProvider`:
- Sets the underlying provider on the trace for chain detection
- Captures `tx:sent` event with transaction hash on success
- Captures `tx:error` event with error details on failure
- Adds transaction hash hint and input data automatically
- Attaches wallet metadata (see [Wallet Capture](#wallet-capture) below)

### Using with ethers.js

`MiradorProvider` is itself an EIP-1193 provider, so you can wrap a wallet provider before handing it to ethers' `BrowserProvider`. ethers will route every `eth_sendTransaction` call through the wrapper:

```typescript
import { Client, MiradorProvider } from '@miradorlabs/web-sdk';
import { BrowserProvider, parseEther } from 'ethers';

const client = new Client('your-api-key');
const trace = client.trace({ name: 'TokenTransfer' });

const wrapped = new MiradorProvider(window.ethereum, client, { trace });
const ethersProvider = new BrowserProvider(wrapped);
const signer = await ethersProvider.getSigner();

// tx hint, input data, and wallet metadata are auto-attached to `trace`
const tx = await signer.sendTransaction({
  to: '0xRecipient...',
  value: parseEther('0.1'),
});

trace.info('transaction_sent', { txHash: tx.hash });
```

### Wallet Capture

When `captureWallets` is enabled (default), `MiradorProvider` enumerates installed wallets via [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) (Multi Injected Provider Discovery), with a legacy `window.ethereum` fallback for wallets that haven't migrated. Each wallet is also queried for its client version via the `web3_clientVersion` JSON-RPC method. No wallet prompts are shown — discovery is fully passive.

On every intercepted transaction, the following attributes are attached to the trace:

| Attribute | Type | Description |
|-----------|------|-------------|
| `wallet.installed` | JSON array | Every detected wallet: `[{ name, rdns, version?, source }, ...]` |
| `wallet.active.name` | string | Name of the wallet that signed (e.g. `"MetaMask"`) |
| `wallet.active.rdns` | string | Reverse-DNS identifier (e.g. `"io.metamask"`) |
| `wallet.active.uuid` | string | Stable per-install UUID (EIP-6963 only) |
| `wallet.active.version` | string | Client version (e.g. `"MetaMask/v12.0.4/Mobile"`) — omitted if the wallet doesn't support `web3_clientVersion` |
| `wallet.active.source` | `'eip6963'` \| `'legacy'` | How the active wallet was identified |

Disable or tune via options:

```typescript
new MiradorProvider(window.ethereum, client, {
  captureWallets: false,             // disable entirely
  walletDiscoveryTimeoutMs: 1000,    // wait longer for slow EIP-6963 announcements (default: 500ms)
});
```

Discovery runs in the background at construction time, so it's typically settled long before the user finishes interacting with the wallet popup. If a tx fires before discovery completes, the SDK waits up to `walletDiscoveryTimeoutMs` before attaching attributes — failures during capture never block or fail the transaction.

> **Privacy note:** The list of installed wallets combined with browser metadata is a fingerprinting vector. The SDK does **not** capture wallet addresses or accounts — those remain under the dApp's control. If you disclose tracking in your privacy policy, you may want to mention installed-wallet detection.

#### Standalone wallet discovery

For non-transaction flows (e.g. attaching wallet metadata to a trace before any tx is signed), you can call `discoverInstalledWallets()` directly:

```typescript
import { discoverInstalledWallets, identifyProvider } from '@miradorlabs/web-sdk';

const discovery = await discoverInstalledWallets();
trace.addAttribute('wallet.installed', discovery.wallets);

// Later, identify which wallet a given provider corresponds to
const active = await identifyProvider(window.ethereum, discovery);
if (active) trace.addAttribute('wallet.active', active);
```

## Chain Utilities

### `Chain` Enum

Supported EVM chains, keyed by chain ID:

```typescript
import { Chain } from '@miradorlabs/web-sdk';

Chain.Ethereum  // 1
Chain.Polygon   // 137
Chain.Arbitrum  // 42161
Chain.Base      // 8453
Chain.Optimism  // 10
Chain.BSC       // 56
Chain.HyperEVM  // 999
```

All chain parameters accept `ChainInput` — either a `Chain` enum value or a chain name string (`'ethereum'`, `'polygon'`, `'hyperevm'`, etc.).

> Solana is **not** part of the `Chain` enum — Solana doesn't have a numeric chain ID. Use `web3.solana.addTxHint(signature)` instead.
>
> Canton is likewise outside the `Chain` enum — use `web3.canton.addTxHint(updateId, partyId?)`.

### `toChain(chainId)`

Convert a raw chain ID to a `Chain` enum value.

```typescript
import { toChain, Chain } from '@miradorlabs/web-sdk';

toChain(1);     // Chain.Ethereum
toChain(137);   // Chain.Polygon
toChain(42161); // Chain.Arbitrum
toChain(999);   // Chain.HyperEVM
toChain('0x1'); // Chain.Ethereum (hex string)
toChain(7777);  // undefined
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

### Metadata Utilities

The SDK exports the metadata collection functions for advanced usage:

```typescript
import {
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
} from '@miradorlabs/web-sdk';

const metadata = getClientMetadata();  // Full ClientMetadata object
const browser = detectBrowser();       // e.g., { name: 'Chrome', version: '120.0' }
const os = detectOS();                 // e.g., { name: 'macOS', version: '14.0' }
const device = detectDeviceType();     // 'desktop' | 'mobile' | 'tablet'
```

## Stack Trace Utilities

The SDK exports utilities for capturing and formatting stack traces:

```typescript
import {
  captureStackTrace,
  formatStackTrace,
  formatStackTraceReadable
} from '@miradorlabs/web-sdk';

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
  // Classes
  Client,
  Trace,
  NoopTrace,
  MiradorProvider,

  // Utilities
  captureStackTrace,
  formatStackTrace,
  formatStackTraceReadable,
  toChain,
  Chain,
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
  discoverInstalledWallets,
  identifyProvider,

  // Types
  ClientOptions,
  TraceOptions,             // { name?, traceId?, includeUserMeta?, autoClose?, provider?, autoKeepAlive?, maxTraceLifetimeMs?, maxQueueSize?, callbacks?, ... }
  Severity,                 // Info, Warn, Error
  AddEventOptions,          // { captureStackTrace?: boolean, severity?: Severity } (for addEvent)
  StackFrame,               // { functionName, fileName, lineNumber, columnNumber }
  StackTrace,               // { frames: StackFrame[], raw: string }
  ChainName,                // 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'bsc'
  ChainInput,               // Chain | ChainName
  TraceEvent,               // { eventName, details?, timestamp }
  TxHashHint,               // { txHash, chain, details?, timestamp }
  SafeTxHintData,           // { safeTxHash, chain, details?, timestamp }
  SafeMsgHintData,          // { messageHash, chain, details?, timestamp }
  ClientMetadata,           // Browser/OS metadata fields
  EIP1193Provider,          // { request(args): Promise<unknown> }
  TxHintOptions,            // { input?, details? }
  TransactionLike,          // { hash, data?, input?, chainId? }
  TransactionRequest,       // { from, to?, data?, value?, ... }
  MiradorProviderOptions,   // { trace?, traceOptions?, captureWallets?, walletDiscoveryTimeoutMs? }
  WalletInfo,               // { name, rdns, uuid?, version?, source: 'eip6963' | 'legacy' }
  WalletDiscovery,          // { wallets: WalletInfo[], announcementsByProvider: Map<EIP1193Provider, EIP6963Announcement> }
  EIP6963Announcement,      // { info: { uuid, name, icon, rdns }, provider: EIP1193Provider }
  Logger,                   // { debug(), warn(), error() }
  TraceCallbacks,           // { onFlushed?, onFlushError?, onClosed?, onDropped? }
} from '@miradorlabs/web-sdk';
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
pnpm build
```

### Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

### Publishing

```bash
pnpm release:patch  # 1.0.x
pnpm release:minor  # 1.x.0
pnpm release:major  # x.0.0
```

## Example Applications

The [`examples/`](./examples/) directory contains runnable demos, one per use case:

### [`examples/default/`](./examples/default/) — EVM + multi-wallet

The flagship demo. Runs on port `8000`.

- Wallet connection using EIP-6963 (Multi Injected Provider Discovery)
- Creating and managing traces (attributes, tags, events)
- `MiradorProvider` wrapping the wallet so `eth_sendTransaction` is auto-traced (tx hint, input data, and `wallet.installed` / `wallet.active.*` capture)
- Safe multisig tracking with `web3.safe.addMsgHint()` and `web3.safe.addTxHint()`
- Network switching and balance display across Ethereum, Polygon, Arbitrum, Optimism, Base, BSC

```bash
cd examples/default
npm install
npm run dev
```

### [`examples/solana/`](./examples/solana/) — Solana tx hints

Phantom + a devnet SOL transfer, traced with `web3.solana.addTxHint(signature)`. Runs on port `8001`.

- Phantom wallet integration via the injected `window.solana` provider
- `web3.solana.addTxHint(signature, details?)` — no chain argument, signature is the identifier
- Trace open → sign + send → addTxHint → confirm → close

```bash
cd examples/solana
npm install
npm run dev
```

## Links

- [Mirador Website](https://mirador.org)
- [Documentation](https://docs.mirador.org)
- [Node.js SDK](https://github.com/miradorlabs/nodejs-sdk) — server-side companion
- [CLI](https://github.com/miradorlabs/mirador-cli) — query traces from the terminal

## License

MIT
