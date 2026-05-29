// ============================================================================
// Mirador Web3 Demo - Main Entry Point
// ============================================================================

// Import modules
import { elements } from './src/state.js';
import { GATEWAY_URL } from './src/config.js';
import { log } from './src/utils.js';
import { saveApiKey, changeApiKey, toggleApiKeyVisibility, loadSavedApiKey } from './src/api-key.js';
import { connectWallet, disconnectWallet, initWalletDiscovery, copyAddress } from './src/wallet.js';
import { toggleNetworkDropdown, closeNetworkDropdown } from './src/network.js';
import { sendTransaction, addAttribute, addTag, updatePreview } from './src/transaction.js';

// ============================================================================
// Event Listeners
// ============================================================================

// API Key
elements.saveApiKeyBtn?.addEventListener('click', saveApiKey);
elements.changeApiKeyBtn?.addEventListener('click', changeApiKey);
elements.toggleApiKeyBtn?.addEventListener('click', toggleApiKeyVisibility);
elements.apiKeyInput?.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter') saveApiKey();
});

// Wallet
elements.connectWalletBtn?.addEventListener('click', connectWallet);
elements.disconnectWalletBtn?.addEventListener('click', disconnectWallet);
elements.copyAddressBtn?.addEventListener('click', copyAddress);
elements.sendTxBtn?.addEventListener('click', sendTransaction);
elements.addAttributeBtn?.addEventListener('click', addAttribute);
elements.addTagBtn?.addEventListener('click', addTag);

// Network selector
elements.networkSelectorBtn?.addEventListener('click', (e: MouseEvent) => {
  e.stopPropagation();
  toggleNetworkDropdown();
});

// Close network dropdown when clicking outside
document.addEventListener('click', (e: MouseEvent) => {
  if (elements.networkSelector && !elements.networkSelector.contains(e.target as Node)) {
    closeNetworkDropdown();
  }
});

// Preview updates
elements.recipientAddress?.addEventListener('input', updatePreview);
elements.sendAmount?.addEventListener('input', updatePreview);

// Enter key handlers
elements.attrValue?.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter') addAttribute();
});

elements.tagInput?.addEventListener('keypress', (e: KeyboardEvent) => {
  if (e.key === 'Enter') addTag();
});

// ============================================================================
// Initialization
// ============================================================================

log('Mirador Web3 Demo loaded', 'success');
log('Enter your API key to get started', 'info');

// Check gateway proxy status
fetch(`${GATEWAY_URL}/health`)
  .then((res) => res.json())
  .then(() => {
    if (elements.proxyStatus) {
      elements.proxyStatus.textContent = 'Connected';
      elements.proxyStatus.style.color = '#64ffda';
    }
  })
  .catch(() => {
    if (elements.proxyStatus) {
      elements.proxyStatus.textContent = 'Unavailable';
      elements.proxyStatus.style.color = '#ff5555';
    }
  });

// Initialize wallet discovery (EIP-6963)
initWalletDiscovery();

// Try to load saved API key
loadSavedApiKey();
