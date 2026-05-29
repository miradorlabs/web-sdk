// ============================================================================
// Mirador Solana Demo — entry point
// Mirrors the structure of examples/default/app.ts so the parallel is clear.
// ============================================================================

import { elements } from './src/state.js';
import { GATEWAY_URL } from './src/config.js';
import { log } from './src/utils.js';
import { saveApiKey, changeApiKey, toggleApiKeyVisibility, loadSavedApiKey } from './src/api-key.js';
import { connectWallet, disconnectWallet, getPhantomProvider } from './src/wallet.js';
import { sendTransaction } from './src/transaction.js';
import { addAttribute, addTag } from './src/form.js';

// API key
elements.saveApiKeyBtn?.addEventListener('click', saveApiKey);
elements.changeApiKeyBtn?.addEventListener('click', changeApiKey);
elements.toggleApiKeyBtn?.addEventListener('click', toggleApiKeyVisibility);
elements.apiKeyInput?.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter') saveApiKey();
});

// Wallet
elements.connectWalletBtn?.addEventListener('click', connectWallet);
elements.disconnectWalletBtn?.addEventListener('click', disconnectWallet);

// Transaction
elements.sendTxBtn?.addEventListener('click', sendTransaction);
elements.addAttributeBtn?.addEventListener('click', addAttribute);
elements.addTagBtn?.addEventListener('click', addTag);

elements.attrValue?.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter') addAttribute();
});
elements.tagInput?.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter') addTag();
});

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------

log('Mirador Solana demo loaded.', 'success');
log('1) Save your API key  2) Connect Phantom  3) Send a devnet SOL transfer.', 'info');

// Probe the gateway proxy so the user knows whether the proxy is up.
fetch(`${GATEWAY_URL}/health`)
  .then((r) => r.json())
  .then(() => {
    if (elements.proxyStatus) {
      elements.proxyStatus.textContent = 'connected';
      elements.proxyStatus.style.color = '#14F195';
    }
  })
  .catch(() => {
    if (elements.proxyStatus) {
      elements.proxyStatus.textContent = 'unavailable';
      elements.proxyStatus.style.color = '#ff5555';
    }
  });

if (!getPhantomProvider()) {
  log('Phantom extension not detected. Install at https://phantom.com/ to use this demo.', 'warn');
}

loadSavedApiKey();
