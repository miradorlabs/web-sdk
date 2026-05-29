// ============================================================================
// Module-level state for the Solana demo
// ============================================================================

import type { Connection } from '@solana/web3.js';
import type { ClientType, DOMElements, TraceFormState, WalletState } from './types.js';

// Mirador client (initialized once the API key is saved).
export let miradorClient: ClientType | null = null;
export function setMiradorClient(c: ClientType | null): void { miradorClient = c; }

export let apiKey: string | null = null;
export function setApiKey(k: string | null): void { apiKey = k; }

// Solana JSON-RPC connection (devnet).
export let solanaConnection: Connection | null = null;
export function setSolanaConnection(c: Connection | null): void { solanaConnection = c; }

// Connected wallet.
export const walletState: WalletState = {
  pubkey: null,
  balanceSol: null,
  connected: false,
};

// Pending attributes/tags the user has staged for the next trace.
export const formState: TraceFormState = {
  attributes: {},
  tags: [],
};

export const elements: DOMElements = {
  apiKeyInput: document.getElementById('apiKeyInput') as HTMLInputElement | null,
  apiKeyForm: document.getElementById('apiKeyForm'),
  apiKeySaved: document.getElementById('apiKeySaved'),
  saveApiKeyBtn: document.getElementById('saveApiKeyBtn') as HTMLButtonElement | null,
  changeApiKeyBtn: document.getElementById('changeApiKeyBtn') as HTMLButtonElement | null,
  toggleApiKeyBtn: document.getElementById('toggleApiKeyBtn') as HTMLButtonElement | null,

  walletStatus: document.getElementById('walletStatus'),
  walletInfo: document.getElementById('walletInfo'),
  walletPubkey: document.getElementById('walletPubkey'),
  walletBalance: document.getElementById('walletBalance'),
  connectWalletBtn: document.getElementById('connectWalletBtn') as HTMLButtonElement | null,
  disconnectWalletBtn: document.getElementById('disconnectWalletBtn') as HTMLButtonElement | null,

  traceName: document.getElementById('traceName') as HTMLInputElement | null,
  recipientPubkey: document.getElementById('recipientPubkey') as HTMLInputElement | null,
  sendAmount: document.getElementById('sendAmount') as HTMLInputElement | null,
  sendTxBtn: document.getElementById('sendTxBtn') as HTMLButtonElement | null,
  attrKey: document.getElementById('attrKey') as HTMLInputElement | null,
  attrValue: document.getElementById('attrValue') as HTMLInputElement | null,
  addAttributeBtn: document.getElementById('addAttributeBtn') as HTMLButtonElement | null,
  attributesList: document.getElementById('attributesList'),
  tagInput: document.getElementById('tagInput') as HTMLInputElement | null,
  addTagBtn: document.getElementById('addTagBtn') as HTMLButtonElement | null,
  tagsList: document.getElementById('tagsList'),

  traceResult: document.getElementById('traceResult'),
  traceIdLabel: document.getElementById('traceIdLabel'),
  signatureLabel: document.getElementById('signatureLabel'),
  txStatusLabel: document.getElementById('txStatusLabel'),

  activityLog: document.getElementById('activityLog'),
  proxyStatus: document.getElementById('proxyStatus'),
};
