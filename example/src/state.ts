// ============================================================================
// State Management
// ============================================================================

import type {
  Client,
  DiscoveredWallet,
  WalletState,
  TraceState,
  DOMElements,
} from './types.js';

// Mirador client (initialized after API key is provided)
export let miradorClient: Client | null = null;
export let apiKey: string | null = null;

export function setMiradorClient(client: Client | null): void {
  miradorClient = client;
}

export function setApiKey(key: string | null): void {
  apiKey = key;
}

// EIP-6963 discovered wallets
export let discoveredWallets: DiscoveredWallet[] = [];
export let selectedWalletRdns: string | null = null;

export function addDiscoveredWallet(wallet: DiscoveredWallet): void {
  discoveredWallets.push(wallet);
}

export function clearDiscoveredWallets(): void {
  discoveredWallets = [];
}

export function setSelectedWalletRdns(rdns: string | null): void {
  selectedWalletRdns = rdns;
}

// Wallet state
export const walletState: WalletState = {
  connected: false,
  address: null,
  balance: null,
  chainId: null,
  provider: null,
  walletInfo: null,
};

export function updateWalletState(updates: Partial<WalletState>): void {
  Object.assign(walletState, updates);
}

export function resetWalletState(): void {
  walletState.connected = false;
  walletState.address = null;
  walletState.balance = null;
  walletState.chainId = null;
  walletState.provider = null;
  walletState.walletInfo = null;
}

// Trace state
export const traceState: TraceState = {
  currentTrace: null,
  attributes: {},
  tags: [],
};

export function updateTraceState(updates: Partial<TraceState>): void {
  Object.assign(traceState, updates);
}

export function resetTraceState(): void {
  traceState.currentTrace = null;
  traceState.attributes = {};
  traceState.tags = [];
}

// ============================================================================
// DOM Elements
// ============================================================================

export const elements: DOMElements = {
  // API Key
  apiKeyCard: document.getElementById('apiKeyCard'),
  apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement | null,
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn') as HTMLButtonElement | null,
  toggleApiKeyBtn: document.getElementById('toggleApiKeyBtn') as HTMLButtonElement | null,
  toggleApiKeyIcon: document.getElementById('toggleApiKeyIcon'),
  apiKeySuccess: document.getElementById('apiKeySuccess'),
  changeApiKeyBtn: document.getElementById('changeApiKeyBtn') as HTMLButtonElement | null,

  // Wallet
  walletCard: document.getElementById('walletCard'),
  connectWalletBtn: document.getElementById('connectWalletBtn') as HTMLButtonElement | null,
  disconnectWalletBtn: document.getElementById('disconnectWalletBtn') as HTMLButtonElement | null,
  walletNotConnected: document.getElementById('walletNotConnected'),
  walletConnected: document.getElementById('walletConnected'),
  walletAddress: document.getElementById('walletAddress'),
  copyAddressBtn: document.getElementById('copyAddressBtn') as HTMLButtonElement | null,
  walletBalance: document.getElementById('walletBalance'),
  networkName: document.getElementById('networkName'),
  networkSelector: document.getElementById('networkSelector'),
  networkSelectorBtn: document.getElementById('networkSelectorBtn') as HTMLButtonElement | null,
  networkDropdown: document.getElementById('networkDropdown'),

  // Transaction
  transactionCard: document.getElementById('transactionCard'),
  recipientAddress: document.getElementById('recipientAddress') as HTMLInputElement | null,
  sendAmount: document.getElementById('sendAmount') as HTMLInputElement | null,
  traceName: document.getElementById('traceName') as HTMLInputElement | null,
  sendTxBtn: document.getElementById('sendTxBtn') as HTMLButtonElement | null,

  // Preview
  previewFrom: document.getElementById('previewFrom'),
  previewTo: document.getElementById('previewTo'),
  previewAmount: document.getElementById('previewAmount'),
  previewNetwork: document.getElementById('previewNetwork'),

  // Trace Info
  traceInfo: document.getElementById('traceInfo'),
  traceId: document.getElementById('traceId'),
  txHash: document.getElementById('txHash'),
  traceStatus: document.getElementById('traceStatus'),

  // Attributes & Tags
  attributesCard: document.getElementById('attributesCard'),
  attrKey: document.getElementById('attrKey') as HTMLInputElement | null,
  attrValue: document.getElementById('attrValue') as HTMLInputElement | null,
  addAttributeBtn: document.getElementById('addAttributeBtn') as HTMLButtonElement | null,
  attributesList: document.getElementById('attributesList'),
  tagInput: document.getElementById('tagInput') as HTMLInputElement | null,
  addTagBtn: document.getElementById('addTagBtn') as HTMLButtonElement | null,
  tagsContainer: document.getElementById('tagsContainer'),

  // Status
  log: document.getElementById('log'),
  statusBar: document.getElementById('statusBar'),
  proxyStatus: document.getElementById('proxyStatus'),
};
