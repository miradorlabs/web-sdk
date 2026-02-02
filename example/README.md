# Mirador Web Client Demo

An interactive web application demonstrating how to use the Mirador SDK to create and manage transaction traces.

## Features

- **Builder Pattern Interface**: Use the fluent API to construct traces step-by-step
- **Real-time Trace Building**: Add attributes, tags, and events dynamically
- **Transaction Hash Support**: Optionally associate traces with blockchain transactions
- **Activity Logging**: See all SDK operations in real-time
- **Client Metadata**: Automatically includes browser, OS, and screen information

## Getting Started

### Quick Start (Recommended)

The easiest way to run the demo:

```bash
cd ./example
npm install
npm run dev
```

This will:
1. Install dependencies (Rollup)
2. Bundle from TypeScript source
3. Compile TypeScript and bundle everything
4. Start a local web server
5. Open your browser automatically

That's it! The demo will be running at http://localhost:8000

### Manual Setup

If you prefer to run it manually:

```bash
# 1. Install dependencies
npm install

# 2. Build the bundle
npm run build

# 3. Start a web server
npm start           # Using Python
# OR
npm run serve       # Using http-server (auto-opens browser)
```

### Alternative: Using VS Code Live Server
1. Run `npm run build` to create the bundle
2. Install the "Live Server" extension in VS Code
3. Right-click on `index.html`
4. Select "Open with Live Server"

## How to Use

### Step 1: Create a Trace
1. Fill in the trace name (e.g., "swap_execution", "payment_flow")
2. Enter transaction details:
   - From address
   - To address
   - Value (in ETH)
   - Network (Ethereum, Polygon, etc.)
3. Click "Create Trace"

This initializes a trace builder with:
- Default transaction attributes
- Network-specific tags
- Automatic client metadata (browser, OS, screen size, etc.)

### Step 2: Add Custom Attributes (Optional)
Add any custom key-value pairs to enrich your trace:
- `slippage_bps`: "50"
- `gas_limit`: "21000"
- `dex`: "uniswap"
- Any other relevant metadata

### Step 3: Add Tags (Optional)
Add tags to categorize your trace:
- "dex"
- "swap"
- "critical"
- "production"

### Step 4: Add Events (Optional)
Track important moments in the transaction lifecycle:
- Event name: "wallet_connected"
- Details: `{"wallet": "MetaMask", "version": "10.0.0"}`

Or:
- Event name: "quote_received"
- Details: (leave empty for timestamp-only events)

**JSON Support**: If your details start with `{` or `[`, they'll be parsed as JSON automatically.

### Step 5: Submit the Trace
Submit your trace to the Mirador Gateway:

**Without Transaction Hash:**
- Just click "Submit Trace"
- Use this when you don't have a blockchain tx hash yet

**With Transaction Hash:**
- Enter the transaction hash
- Enter the chain ID (1 for Ethereum, 137 for Polygon, etc.)
- Click "Submit Trace"

## Example Usage Flow

```javascript
// The demo app uses the builder pattern like this:

// 1. Create trace builder
const trace = client.trace("swap_execution", true); // includeUserMeta

// 2. Add attributes
trace
  .addAttribute("from", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")
  .addAttribute("to", "0x1234567890123456789012345678901234567890")
  .addAttribute("value", "0.5")
  .addAttribute("network", "ethereum")
  .addAttribute("slippage_bps", "50");

// 3. Add tags
trace
  .addTag("dex")
  .addTag("swap")
  .addTag("uniswap");

// 4. Add events
trace
  .addEvent("wallet_connected", { wallet: "MetaMask" })
  .addEvent("quote_received", { amount: "0.5 ETH", price: "$2000" })
  .addEvent("tx_signed");

// 5. Submit with transaction hash
const response = await trace.submit(
  "0x1234567890abcdef...", // txHash
  "1",                     // chainId (Ethereum)
  "Swap transaction"       // details (optional)
);

console.log("Trace ID:", response.getTraceId());
```

## Understanding the Builder Pattern

The Mirador SDK uses a **builder pattern** for creating traces:

```javascript
client.trace(name, includeUserMeta)
  .addAttribute(key, value)     // Add single attribute
  .addAttributes({...})          // Add multiple attributes
  .addTag(tag)                   // Add single tag
  .addTags([...])                // Add multiple tags
  .addEvent(name, details, ts)   // Add event
  .setTxHash(hash, chainId)      // Set transaction hash
  .submit()                      // Submit without tx hash
  .submit(hash, chainId)         // Submit with tx hash
```

**Benefits:**
- ✅ Method chaining for clean, readable code
- ✅ All data collected before submission
- ✅ Type-safe with TypeScript
- ✅ Automatic JSON stringification for objects
- ✅ Optional client metadata collection

## Activity Log

The demo includes a real-time activity log showing:
- ✅ Successful operations (green)
- ❌ Errors (red)
- ℹ️  Information messages (blue)
- ⚠️  Warnings (yellow)

All SDK operations are logged with timestamps for debugging.

## API Configuration

By default, the demo connects to:
```javascript
const client = new Client(
  'demo-api-key',
  'https://ingest-gateway-dev.mirador.org:443'
);
```

To use a different endpoint, modify `app.js`:
```javascript
const client = new MiradorClient(
  'your-api-key',
  'https://your-gateway-url:port'
);
```

## Client Metadata

When `includeUserMeta` is `true`, the SDK automatically includes:
- Browser name and version
- Operating system
- Screen resolution
- Viewport size
- User agent
- Language
- Timezone
- Current URL
- Referrer

All metadata is prefixed with `client.*` (e.g., `client.browser`, `client.os`)

## Troubleshooting

### CORS Errors
If you see CORS errors in the console:
- Make sure you're serving the files via HTTP (not opening `file://` directly)
- Check that the Mirador Gateway allows requests from your origin

### Import Errors
If you see module import errors:
- Ensure the SDK is built: `npm run build`
- Check that `dist/index.esm.js` exists
- Verify you're using a browser that supports ES modules

### Connection Errors
If trace submission fails:
- Check that the gateway URL is correct
- Verify your API key is valid
- Check the browser console for detailed error messages
- Look at the Activity Log for specific error details

## Code Structure

```
example/
├── index.html          # Main HTML page with styles
├── app.js              # Application logic using Mirador SDK
└── README.md           # This file
```

The demo is intentionally simple (vanilla JavaScript + HTML/CSS) to focus on SDK usage without framework complexity.

## Next Steps

After exploring the demo:
1. Check the Activity Log to see all SDK operations
2. Open the browser DevTools to see network requests
3. Modify `app.js` to experiment with different trace patterns
4. Integrate the builder pattern into your own application

## Learn More

- [Mirador SDK Documentation](../README.md)
- [API Reference](../src/ingest/index.ts)
