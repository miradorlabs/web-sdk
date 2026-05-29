// ============================================================================
// Solana demo config
// ============================================================================

// The local proxy server forwards gRPC-Web requests to the Mirador gateway.
// Start it via `npm run dev` (or `npm run proxy` in a separate terminal).
export const GATEWAY_URL = 'http://localhost:3003';

// Solana devnet RPC endpoint. Devnet keeps the demo cheap and safe — get
// devnet SOL from https://faucet.solana.com/
export const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
export const SOLANA_EXPLORER_BASE = 'https://explorer.solana.com';
export const SOLANA_EXPLORER_CLUSTER = 'devnet';
