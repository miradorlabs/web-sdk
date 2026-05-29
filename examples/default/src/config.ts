import { ChainName } from '@miradorlabs/web-sdk'
// ============================================================================
// Configuration
// ============================================================================

// Use the local proxy server to avoid CORS issues
// The proxy forwards requests to the actual gateway at https://ingest.mirador.org
// Make sure to run `npm run dev` which starts both the proxy and the http server
export const GATEWAY_URL = 'http://localhost:3002';

// Network configuration type
export interface NetworkConfig {
  name: string;
  symbol: string;
  decimals: number;
  explorer: string;
  chain: ChainName;
  rpcUrl: string;
  isTestnet: boolean;
}

// Network configurations with RPC URLs for adding chains
export const NETWORKS: Record<number, NetworkConfig> = {
  1: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://etherscan.io',
    chain: 'ethereum',
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    isTestnet: false,
  },
  11155111: {
    name: 'Sepolia',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://sepolia.etherscan.io',
    chain: 'ethereum',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    isTestnet: true,
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    explorer: 'https://polygonscan.com',
    chain: 'polygon',
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    isTestnet: false,
  },
  80002: {
    name: 'Polygon Amoy',
    symbol: 'MATIC',
    decimals: 18,
    explorer: 'https://amoy.polygonscan.com',
    chain: 'polygon',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    isTestnet: true,
  },
  42161: {
    name: 'Arbitrum One',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://arbiscan.io',
    chain: 'arbitrum',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    isTestnet: false,
  },
  421614: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://sepolia.arbiscan.io',
    chain: 'arbitrum',
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    isTestnet: true,
  },
  10: {
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://optimistic.etherscan.io',
    chain: 'optimism',
    rpcUrl: 'https://optimism-rpc.publicnode.com',
    isTestnet: false,
  },
  11155420: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://sepolia-optimism.etherscan.io',
    chain: 'optimism',
    rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
    isTestnet: true,
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://basescan.org',
    chain: 'base',
    rpcUrl: 'https://base-rpc.publicnode.com',
    isTestnet: false,
  },
  84532: {
    name: 'Base Sepolia',
    symbol: 'ETH',
    decimals: 18,
    explorer: 'https://sepolia.basescan.org',
    chain: 'base',
    rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
    isTestnet: true,
  },
  56: {
    name: 'BNB Chain',
    symbol: 'BNB',
    decimals: 18,
    explorer: 'https://bscscan.com',
    chain: 'bsc',
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    isTestnet: false,
  },
  97: {
    name: 'BNB Testnet',
    symbol: 'BNB',
    decimals: 18,
    explorer: 'https://testnet.bscscan.com',
    chain: 'bsc',
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    isTestnet: true,
  },
};
