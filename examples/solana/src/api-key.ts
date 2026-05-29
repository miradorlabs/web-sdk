// ============================================================================
// API key save/load + Mirador client init
// ============================================================================

import { Client, Web3Plugin } from '@miradorlabs/web-sdk';
import { Connection } from '@solana/web3.js';
import {
  elements,
  setApiKey,
  setMiradorClient,
  setSolanaConnection,
} from './state.js';
import { GATEWAY_URL, SOLANA_RPC_URL } from './config.js';
import { log } from './utils.js';

const STORAGE_KEY = 'mirador.solana-demo.apiKey';

export function saveApiKey(): void {
  const value = elements.apiKeyInput?.value.trim();
  if (!value) {
    log('Enter an API key first.', 'warn');
    return;
  }
  localStorage.setItem(STORAGE_KEY, value);
  initClientWithKey(value);
}

export function loadSavedApiKey(): void {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  if (elements.apiKeyInput) elements.apiKeyInput.value = stored;
  initClientWithKey(stored);
}

export function changeApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
  setApiKey(null);
  setMiradorClient(null);
  if (elements.apiKeyInput) elements.apiKeyInput.value = '';
  elements.apiKeyForm?.classList.remove('hidden');
  elements.apiKeySaved?.classList.add('hidden');
  log('API key cleared.', 'info');
}

export function toggleApiKeyVisibility(): void {
  const input = elements.apiKeyInput;
  const btn = elements.toggleApiKeyBtn;
  if (!input || !btn) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide key';
  } else {
    input.type = 'password';
    btn.textContent = 'Show key';
  }
}

function initClientWithKey(apiKey: string): void {
  setApiKey(apiKey);
  const client = new Client(apiKey, {
    apiUrl: GATEWAY_URL,
    plugins: [Web3Plugin()],
    debug: true,
  });
  setMiradorClient(client);

  // Spin up the Solana devnet connection eagerly so the Send button is ready.
  setSolanaConnection(new Connection(SOLANA_RPC_URL, 'confirmed'));

  elements.apiKeyForm?.classList.add('hidden');
  elements.apiKeySaved?.classList.remove('hidden');
  log('Mirador client initialized + Solana devnet connection ready.', 'success');
}
