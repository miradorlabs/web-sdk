# Mirador Web3 Demo

An interactive demo showcasing how to integrate the Mirador Web SDK with Web3 wallet interactions. Connect your wallet, send real transactions, and see how Mirador tracks the entire lifecycle.

## Features

- **Multi-Wallet Support**: EIP-6963 wallet discovery - select from all installed browser wallets
- **Network Switching**: Change networks directly from the UI - supports mainnets and testnets
- **Multi-Network Support**: Works with Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, and testnets
- **Real Transactions**: Send actual ETH/tokens and track them with Mirador
- **Custom Attributes**: Add custom metadata to your traces
- **Tags**: Organize traces with custom tags
- **Activity Log**: Real-time logging of all actions
- **Transaction Monitoring**: Track transaction status from pending to confirmed

## Prerequisites

- Node.js 18+
- A Web3 wallet (MetaMask, Coinbase Wallet, Rainbow, Rabby, etc.)
- Some testnet ETH (for testing transactions)
- A Mirador API key

## Quick Start

### 1. Install Demo Dependencies

```bash
cd example
npm install
```

### 2. Build and Run

The simplest way to run everything:

```bash
npm run dev
```

This will:

1. Build the SDK
2. Bundle the demo application
3. Start the CORS proxy server
4. Serve the demo at `http://localhost:8000`

### Alternative: Step by Step

If you prefer to run things separately:

```bash
# Terminal 1: Start the proxy server (helps avoid CORS issues)
npm run proxy

# Terminal 2: Build and serve
npm run serve
```

Or build without serving:

```bash
npm run build        # Build SDK + bundle
npm run dev:no-proxy # Build and serve without proxy
```

## Usage

### 1. Enter Your API Key

Enter your Mirador API key to initialize the SDK. The key is saved to localStorage for convenience.

### 2. Select and Connect Your Wallet

The demo uses EIP-6963 to discover all installed wallet extensions. You'll see a list of available wallets - click one to select it, then click "Connect Selected Wallet".

Supported wallets include:

- MetaMask
- Coinbase Wallet
- Rainbow
- Rabby
- And any other EIP-6963 compatible wallet

### 3. Switch Networks (Optional)

Click the network name next to your wallet to open the network selector. You can switch between:

- **Mainnets**: Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain
- **Testnets**: Sepolia, Polygon Amoy, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, BNB Testnet

If the network isn't in your wallet, it will be automatically added.

### 4. Add Custom Attributes (Optional)

Before sending a transaction, you can add:
- **Custom Attributes**: Key-value pairs for additional context (e.g., `purpose: payment`)
- **Tags**: Labels for organizing and filtering traces (e.g., `urgent`, `business`)

### 5. Send a Transaction

1. Enter a recipient address
2. Enter an amount (use a small amount on testnet!)
3. Optionally customize the trace name
4. Click "Send Transaction"
5. Confirm the transaction in your wallet

### 6. View the Trace

After the transaction is sent, you'll see:
- The Mirador Trace ID
- The transaction hash
- Real-time status updates (Pending → Confirmed)

The trace is automatically closed when the transaction confirms, fails, or times out.

## Supported Networks

| Network | Chain ID | Symbol | Mirador Chain |
| ------- | -------- | ------ | ------------- |
| Ethereum | 1 | ETH | ethereum |
| Sepolia | 11155111 | ETH | ethereum |
| Polygon | 137 | MATIC | polygon |
| Polygon Amoy | 80002 | MATIC | polygon |
| Arbitrum One | 42161 | ETH | arbitrum |
| Arbitrum Sepolia | 421614 | ETH | arbitrum |
| Optimism | 10 | ETH | optimism |
| Optimism Sepolia | 11155420 | ETH | optimism |
| Base | 8453 | ETH | base |
| Base Sepolia | 84532 | ETH | base |
| BNB Chain | 56 | BNB | bsc |
| BNB Testnet | 97 | BNB | bsc |

## Getting Testnet ETH

To test transactions without spending real money:

- **Sepolia**: https://sepoliafaucet.com/
- **Goerli**: https://goerlifaucet.com/
- **Polygon Mumbai**: https://faucet.polygon.technology/

## Development

### Project Structure

```
example/
├── index.html        # Main HTML with UI and styles
├── app.js            # Application logic (wallet, transactions, traces)
├── bundle.js         # Built bundle (generated)
├── proxy-server.js   # CORS proxy for Mirador gateway
├── rollup.config.js  # Rollup configuration
└── package.json
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build SDK and bundle the demo |
| `npm run build-sdk` | Build only the parent SDK |
| `npm run proxy` | Start the CORS proxy server |
| `npm run serve` | Build and serve the demo |
| `npm run dev` | Build, start proxy, and serve (all in one) |
| `npm run dev:no-proxy` | Build and serve without proxy |

### Modifying the Demo

1. Edit `app.js` for logic changes
2. Edit `index.html` for UI changes
3. Run `npm run build` to rebuild the bundle
4. Refresh the browser to see changes

## How It Works

### Wallet Discovery (EIP-6963)

The demo uses EIP-6963 for multi-wallet discovery:

```javascript
// Listen for wallet announcements
window.addEventListener('eip6963:announceProvider', (event) => {
  const { info, provider } = event.detail;
  // info contains: name, icon, rdns, uuid
  // provider is the EIP-1193 provider
});

// Request all wallets to announce themselves
window.dispatchEvent(new Event('eip6963:requestProvider'));
```

### Transaction Flow

1. **Wallet Connection**: User selects a wallet, connects via EIP-1193 provider
2. **Trace Creation**: Creates a Mirador trace with wallet and transaction metadata
3. **Transaction Submission**: Sends the transaction via the selected wallet
4. **Trace Association**: Links the transaction hash via `addTxHint()`
5. **Confirmation Polling**: Monitors the transaction until confirmed on-chain
6. **Trace Close**: Closes the trace with confirmation details

### Example Trace Data

When you send a transaction, the following data is automatically captured:

```javascript
{
  name: "web3_transfer",
  attributes: {
    "wallet.address": "0x742d...0bEb",
    "wallet.type": "injected",
    "network.name": "Sepolia Testnet",
    "network.chainId": "11155111",
    "transaction.type": "transfer",
    "transaction.to": "0x1234...7890",
    "transaction.value": "0.001",
    "transaction.valueWei": "1000000000000000"
  },
  tags: ["web3", "transfer", "sepolia-testnet"],
  events: [
    { name: "trace init", data: {...} },
    { name: "transaction_initiated", data: { from, to, value } },
    { name: "transaction_sent", data: { txHash } },
    { name: "transaction_confirmed", data: { success, blockNumber, txHash } }
  ],
  txHashHints: [
    { txHash: "0x...", chain: "ethereum", details: "ETH Transfer" }
  ]
}
```

### SDK Usage Pattern

```javascript
import { Client } from '@miradorlabs/web-sdk';

// 1. Initialize the client
const client = new Client('your-api-key', { apiUrl: 'https://ingest.mirador.org' });

// 2. Create a trace
const trace = client.trace({ name: 'web3_transfer' });

// 3. Add attributes
trace
  .addAttribute('wallet.address', walletAddress)
  .addAttribute('network.chainId', chainId)
  .addAttribute('transaction.value', amount);

// 4. Add tags
trace.addTags(['web3', 'transfer']);

// 5. Add events as they happen
trace.addEvent('transaction_initiated', { from, to, value });

// 6. After getting tx hash, add it as a hint for blockchain correlation
trace.addTxHint(txHash, 'ethereum', 'ETH Transfer');

// 7. The trace auto-flushes, but you can force it
trace.flush();

// 8. Get the trace ID (available after flush completes)
const traceId = trace.getTraceId();

// 9. When done, close the trace
await trace.close('Transaction confirmed');
```

## Troubleshooting

### "No wallets detected"
Install a Web3 wallet browser extension (MetaMask, Coinbase Wallet, etc.).

### "Please select a wallet first"
Click on one of the wallet options to select it before connecting.

### "Proxy server not running"
Make sure to run `npm run proxy` in a separate terminal, or use `npm run dev` which starts it automatically.

### "Insufficient balance"
Get some testnet ETH from a faucet (links above).

### Transaction stuck on "Pending"
This can happen on congested networks. The demo will wait up to 2 minutes for confirmation.

### CORS Errors
Make sure the proxy server is running (`npm run proxy`).

### Network Not Supported
Switch to a supported network in your wallet. The demo will automatically detect the change.

### Build Errors

Make sure you've built the parent SDK first:

```bash
cd .. && npm install && npm run build
```

## Learn More

- [Mirador SDK Documentation](../README.md)
- [EIP-6963 Specification](https://eips.ethereum.org/EIPS/eip-6963)
