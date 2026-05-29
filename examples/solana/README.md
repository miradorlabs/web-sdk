# Mirador Web SDK — Solana Demo

A focused demo showing how to correlate a Solana transaction with a Mirador trace using the new `web3.solana.addTxHint(signature)` API. Connects Phantom, sends a small SOL transfer on devnet, and records the resulting signature on the trace.

## What it demonstrates

- `Client` setup against the Mirador Ingest Gateway
- `web3.solana.addTxHint(signature, details?)` — the single new method that wires a Solana tx into a trace
- The end-to-end flow: open a trace → stage attributes + tags → build + sign + send via Phantom → hint the signature → close the trace on confirmation

The Solana hint carries **no chain argument** — Solana lives outside the EVM `Chain` enum, since it has no numeric chain ID. The hint is emitted on the wire as `chain_name = "solana"`.

## Prerequisites

- Node.js 22+
- [Phantom](https://phantom.com/) browser extension
- A Mirador API key
- ~0.01 devnet SOL ([get some from the Solana faucet](https://faucet.solana.com/))

## Quick Start

```bash
cd examples/solana
npm install
npm run dev
```

`npm run dev` builds the parent SDK, bundles the demo, starts the CORS proxy on `:3003`, and serves the page on `:8001`.

Then open the served page, paste your API key, click **Connect Phantom**, paste a recipient devnet pubkey, and hit **Send Transaction**.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run build` | Build parent SDK + bundle the demo |
| `npm run proxy` | Start the gRPC-Web CORS proxy (port 3003) |
| `npm run serve` | Build + serve on port 8001 |
| `npm run dev` | Build + proxy + serve, all in one |
| `npm run dev:no-proxy` | Build + serve without the proxy (useful if hitting a gateway that already has CORS) |

## Project Structure

```
examples/solana/
├── index.html         # UI shell + styles
├── app.ts             # Entry point — wires DOM events
├── src/
│   ├── api-key.ts     # API key save/load + Client init
│   ├── config.ts      # Gateway + Solana RPC URLs
│   ├── form.ts        # Attributes/tags form helpers
│   ├── state.ts       # Module-level state + DOM element refs
│   ├── transaction.ts # Builds + signs + sends the SOL transfer, calls addTxHint
│   ├── types.ts       # Shared types
│   ├── utils.ts       # Logging + formatting helpers
│   └── wallet.ts      # Phantom connect/disconnect, balance fetch
├── proxy-server.js    # gRPC-Web CORS proxy
├── rollup.config.js   # Bundler config (with node-polyfills for @solana/web3.js)
├── tsconfig.json
└── package.json
```

## The Trace Lifecycle

The interesting line is `src/transaction.ts`:

```typescript
const trace = miradorClient.trace({ name: 'solana_transfer' });

trace
  .addAttribute('wallet.pubkey', walletPubkey)
  .addAttribute('chain', 'solana')
  .addAttribute('cluster', 'devnet')
  .addAttribute('transfer.recipient', recipient)
  .addAttribute('transfer.amount_sol', amount.toString())
  .addTags(['solana', 'devnet', 'transfer']);

trace.addEvent('awaiting_signature');
const { signature } = await provider.signAndSendTransaction(tx);

// ⬇️ This is the line this whole demo exists for.
trace.web3.solana.addTxHint(signature, `Phantom transfer · ${amount} SOL`);

trace.addEvent('transaction_submitted', { signature });
await solanaConnection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
trace.addEvent('transaction_confirmed');
await trace.close('Transfer confirmed');
```

Compared to the EVM demo at `examples/default/`, the only conceptual difference is `web3.solana.addTxHint(signature)` vs `web3.evm.addTxHint(txHash, chain)` — Solana doesn't take a chain argument.

## Why devnet?

Devnet keeps the demo free, fast, and safe — failed transactions cost no real SOL, and the faucet refills your wallet on demand. To point the demo at mainnet, edit [`src/config.ts`](src/config.ts) and change `SOLANA_RPC_URL` + `SOLANA_EXPLORER_CLUSTER`.

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| "Phantom wallet not detected" | Install the [Phantom extension](https://phantom.com/) and refresh |
| "Proxy server not running" | Run `npm run dev` (combined) or `npm run proxy` in a second terminal |
| "Insufficient lamports for transaction" | Top up at [faucet.solana.com](https://faucet.solana.com/) |
| Build errors after pulling | Re-run `cd ../.. && npm install && npm run build` to rebuild the parent SDK |

## Learn More

- [Mirador Web SDK README](../../README.md)
- [Solana transactions docs](https://mirador-docs.example/concepts/solana-transactions) (Mintlify)
- [Default EVM demo](../default/)
