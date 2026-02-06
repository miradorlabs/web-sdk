// ============================================================================
// Type Definitions
// ============================================================================

import type { Client, Trace } from '@miradorlabs/web';

// EIP-6963 Provider Info
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

// EIP-1193 Provider interface
export interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

// Discovered wallet from EIP-6963
export interface DiscoveredWallet {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

// EIP-6963 Announce Provider Event
export interface EIP6963AnnounceProviderEvent extends Event {
  detail: {
    info: EIP6963ProviderInfo;
    provider: EIP1193Provider;
  };
}

// Wallet state
export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: bigint | null;
  chainId: number | null;
  provider: EIP1193Provider | null;
  walletInfo: EIP6963ProviderInfo | null;
}

// Trace state
export interface TraceState {
  currentTrace: Trace | null;
  attributes: Record<string, string>;
  tags: string[];
}

// DOM Elements
export interface DOMElements {
  // API Key
  apiKeyCard: HTMLElement | null;
  apiKeyInput: HTMLInputElement | null;
  saveApiKeyBtn: HTMLButtonElement | null;
  toggleApiKeyBtn: HTMLButtonElement | null;
  toggleApiKeyIcon: HTMLElement | null;
  apiKeySuccess: HTMLElement | null;
  changeApiKeyBtn: HTMLButtonElement | null;

  // Wallet
  walletCard: HTMLElement | null;
  connectWalletBtn: HTMLButtonElement | null;
  disconnectWalletBtn: HTMLButtonElement | null;
  walletNotConnected: HTMLElement | null;
  walletConnected: HTMLElement | null;
  walletAddress: HTMLElement | null;
  copyAddressBtn: HTMLButtonElement | null;
  walletBalance: HTMLElement | null;
  networkName: HTMLElement | null;
  networkSelector: HTMLElement | null;
  networkSelectorBtn: HTMLButtonElement | null;
  networkDropdown: HTMLElement | null;

  // Transaction
  transactionCard: HTMLElement | null;
  recipientAddress: HTMLInputElement | null;
  sendAmount: HTMLInputElement | null;
  traceName: HTMLInputElement | null;
  sendTxBtn: HTMLButtonElement | null;

  // Preview
  previewFrom: HTMLElement | null;
  previewTo: HTMLElement | null;
  previewAmount: HTMLElement | null;
  previewNetwork: HTMLElement | null;

  // Trace Info
  traceInfo: HTMLElement | null;
  traceId: HTMLElement | null;
  txHash: HTMLElement | null;
  traceStatus: HTMLElement | null;

  // Attributes & Tags
  attributesCard: HTMLElement | null;
  attrKey: HTMLInputElement | null;
  attrValue: HTMLInputElement | null;
  addAttributeBtn: HTMLButtonElement | null;
  attributesList: HTMLElement | null;
  tagInput: HTMLInputElement | null;
  addTagBtn: HTMLButtonElement | null;
  tagsContainer: HTMLElement | null;

  // Status
  log: HTMLElement | null;
  statusBar: HTMLElement | null;
  proxyStatus: HTMLElement | null;
}

// Re-export Client type
export type { Client, Trace };
