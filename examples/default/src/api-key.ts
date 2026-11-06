// ============================================================================
// API Key Functions
// ============================================================================

import { Client, Web3Plugin } from '@miradorlabs/web-sdk';
import { GATEWAY_URL } from './config.js';
import { elements, setMiradorClient, setApiKey } from './state.js';
import { log, showStatus } from './utils.js';
import { disconnectWallet } from './wallet.js';

export function saveApiKey(): void {
  if (!elements.apiKeyInput) return;
  const key = elements.apiKeyInput.value.trim();

  if (!key) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (key.length < 10) {
    showStatus('API key seems too short', 'error');
    return;
  }

  setApiKey(key);
  setMiradorClient(new Client(key, { apiUrl: GATEWAY_URL, plugins: [Web3Plugin()] }));

  // Update UI
  elements.apiKeyInput.disabled = true;
  elements.saveApiKeyBtn?.classList.add('hidden');
  elements.toggleApiKeyBtn?.classList.add('hidden');
  elements.apiKeySuccess?.classList.remove('hidden');
  elements.walletCard?.classList.remove('hidden');

  log(`API key configured (${key.slice(0, 4)}...${key.slice(-4)})`, 'success');
  showStatus('API key saved! Now connect your wallet.', 'success');
}

export function changeApiKey(): void {
  // Reset API key state
  setApiKey(null);
  setMiradorClient(null);

  // Update UI
  if (elements.apiKeyInput) {
    elements.apiKeyInput.disabled = false;
    elements.apiKeyInput.value = '';
    elements.apiKeyInput.type = 'password';
  }
  if (elements.toggleApiKeyIcon) {
    elements.toggleApiKeyIcon.innerHTML = '&#128065;';
  }
  elements.saveApiKeyBtn?.classList.remove('hidden');
  elements.toggleApiKeyBtn?.classList.remove('hidden');
  elements.apiKeySuccess?.classList.add('hidden');
  elements.walletCard?.classList.add('hidden');

  // Disconnect wallet if connected
  disconnectWallet();

  log('API key cleared', 'info');
}

export function toggleApiKeyVisibility(): void {
  if (!elements.apiKeyInput || !elements.toggleApiKeyIcon) return;

  if (elements.apiKeyInput.type === 'password') {
    elements.apiKeyInput.type = 'text';
    elements.toggleApiKeyIcon.innerHTML = '&#128064;';
  } else {
    elements.apiKeyInput.type = 'password';
    elements.toggleApiKeyIcon.innerHTML = '&#128065;';
  }
}

/**
 * Earlier versions of this demo persisted the API key in localStorage in
 * clear text. The key now lives only in memory; remove any leftover copy.
 */
export function clearLegacySavedApiKey(): void {
  try {
    localStorage.removeItem('mirador_api_key');
  } catch {
    // localStorage not available, ignore
  }
}
