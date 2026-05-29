// ============================================================================
// Shared types for the Solana demo
// ============================================================================

import type { Client, Trace } from '@miradorlabs/web-sdk';

export type ClientType = Client;
export type TraceType = Trace;

export interface WalletState {
  pubkey: string | null;
  balanceSol: number | null;
  connected: boolean;
}

export interface TraceFormState {
  attributes: Record<string, string>;
  tags: string[];
}

export interface DOMElements {
  // API key
  apiKeyInput: HTMLInputElement | null;
  apiKeyForm: HTMLElement | null;
  apiKeySaved: HTMLElement | null;
  saveApiKeyBtn: HTMLButtonElement | null;
  changeApiKeyBtn: HTMLButtonElement | null;
  toggleApiKeyBtn: HTMLButtonElement | null;

  // Wallet
  walletStatus: HTMLElement | null;
  walletInfo: HTMLElement | null;
  walletPubkey: HTMLElement | null;
  walletBalance: HTMLElement | null;
  connectWalletBtn: HTMLButtonElement | null;
  disconnectWalletBtn: HTMLButtonElement | null;

  // Transaction
  traceName: HTMLInputElement | null;
  recipientPubkey: HTMLInputElement | null;
  sendAmount: HTMLInputElement | null;
  sendTxBtn: HTMLButtonElement | null;
  attrKey: HTMLInputElement | null;
  attrValue: HTMLInputElement | null;
  addAttributeBtn: HTMLButtonElement | null;
  attributesList: HTMLElement | null;
  tagInput: HTMLInputElement | null;
  addTagBtn: HTMLButtonElement | null;
  tagsList: HTMLElement | null;

  // Trace result
  traceResult: HTMLElement | null;
  traceIdLabel: HTMLElement | null;
  signatureLabel: HTMLElement | null;
  txStatusLabel: HTMLElement | null;

  // Log + footer
  activityLog: HTMLElement | null;
  proxyStatus: HTMLElement | null;
}
