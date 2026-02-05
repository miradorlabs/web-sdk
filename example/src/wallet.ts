// ============================================================================
// Wallet Functions
// ============================================================================

import {
  elements,
  walletState,
  miradorClient,
  discoveredWallets,
  selectedWalletRdns,
  setSelectedWalletRdns,
  addDiscoveredWallet,
  updateWalletState,
  resetWalletState,
  resetTraceState,
} from './state.js';
import { log, showStatus, formatAddress, formatBalance, getNetworkInfo } from './utils.js';
import { populateNetworkDropdown } from './network.js';
import type { DiscoveredWallet, EIP6963AnnounceProviderEvent, EIP1193Provider } from './types.js';

// Extend window for legacy ethereum and selectWallet
declare global {
  interface Window {
    ethereum?: EIP1193Provider;
    selectWallet: (rdns: string) => void;
  }
}

// ============================================================================
// Wallet Connection
// ============================================================================

export async function connectWallet(): Promise<void> {
  if (!miradorClient) {
    showStatus('Please enter your API key first', 'error');
    return;
  }

  const selectedWallet = getSelectedWallet();

  if (!selectedWallet) {
    showStatus('Please select a wallet first', 'error');
    log('No wallet selected. Please choose a wallet from the list.', 'error');
    return;
  }

  try {
    log(`Connecting to ${selectedWallet.info.name}...`, 'info');
    showStatus(`Connecting to ${selectedWallet.info.name}...`, 'pending', 0);

    const accounts = await selectedWallet.provider.request({
      method: 'eth_requestAccounts',
    }) as string[];

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    updateWalletState({
      address: accounts[0],
      provider: selectedWallet.provider,
      walletInfo: selectedWallet.info,
      connected: true,
    });

    const chainId = await selectedWallet.provider.request({ method: 'eth_chainId' }) as string;
    walletState.chainId = parseInt(chainId, 16);

    await updateBalance();
    updateWalletUI();

    log(`Connected to ${selectedWallet.info.name}: ${formatAddress(walletState.address)}`, 'success');
    showStatus('Wallet connected successfully!', 'success');

    setupWalletListeners();
  } catch (error) {
    const err = error as Error;
    log(`Connection failed: ${err.message}`, 'error');
    showStatus(`Failed to connect: ${err.message}`, 'error');
  }
}

export function disconnectWallet(): void {
  resetWalletState();
  resetTraceState();

  elements.walletNotConnected?.classList.remove('hidden');
  elements.walletConnected?.classList.add('hidden');
  elements.transactionCard?.classList.add('hidden');
  elements.attributesCard?.classList.add('hidden');
  elements.traceInfo?.classList.add('hidden');

  log('Wallet disconnected', 'warn');
  showStatus('Wallet disconnected', 'info');
}

// ============================================================================
// Balance
// ============================================================================

export async function updateBalance(): Promise<void> {
  if (!walletState.address || !walletState.provider) return;

  try {
    const balance = await walletState.provider.request({
      method: 'eth_getBalance',
      params: [walletState.address, 'latest'],
    }) as string;
    walletState.balance = BigInt(balance);
    updateBalanceDisplay();
  } catch (error) {
    const err = error as Error;
    log(`Failed to fetch balance: ${err.message}`, 'error');
  }
}

export function updateBalanceDisplay(): void {
  const networkInfo = getNetworkInfo(walletState.chainId);
  if (elements.walletBalance) {
    elements.walletBalance.textContent = `${formatBalance(walletState.balance)} ${networkInfo.symbol}`;
  }
}

// ============================================================================
// UI Updates
// ============================================================================

export function updateWalletUI(): void {
  if (walletState.connected) {
    elements.walletNotConnected?.classList.add('hidden');
    elements.walletConnected?.classList.remove('hidden');
    elements.transactionCard?.classList.remove('hidden');
    elements.attributesCard?.classList.remove('hidden');

    if (elements.walletAddress) {
      elements.walletAddress.textContent = formatAddress(walletState.address);
    }
    const networkInfo = getNetworkInfo(walletState.chainId);
    if (elements.networkName) {
      elements.networkName.textContent = networkInfo.name;
    }
    updateBalanceDisplay();

    populateNetworkDropdown();

    const walletAvatar = document.querySelector('.wallet-avatar');
    if (walletAvatar && walletState.walletInfo) {
      walletAvatar.innerHTML = `<img src="${walletState.walletInfo.icon}" alt="${walletState.walletInfo.name}" style="width: 24px; height: 24px; border-radius: 4px;" onerror="this.parentElement.innerHTML='&#129302;'">`;
    }

    if (elements.previewFrom) {
      elements.previewFrom.textContent = formatAddress(walletState.address);
    }
    if (elements.previewNetwork) {
      elements.previewNetwork.textContent = networkInfo.name;
    }
  } else {
    elements.walletNotConnected?.classList.remove('hidden');
    elements.walletConnected?.classList.add('hidden');
    elements.transactionCard?.classList.add('hidden');
    elements.attributesCard?.classList.add('hidden');

    const walletAvatar = document.querySelector('.wallet-avatar');
    if (walletAvatar) {
      walletAvatar.innerHTML = '&#129302;';
    }
  }
}

// ============================================================================
// Copy Address
// ============================================================================

export async function copyAddress(): Promise<void> {
  if (!walletState.address) return;

  try {
    await navigator.clipboard.writeText(walletState.address);

    // Visual feedback
    const btn = elements.copyAddressBtn;
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = '&#10003;';

      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '&#128203;';
      }, 2000);
    }

    log('Address copied to clipboard', 'success');
  } catch (error) {
    const err = error as Error;
    log(`Failed to copy address: ${err.message}`, 'error');
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

export function setupWalletListeners(): void {
  if (!walletState.provider) return;

  walletState.provider.on('accountsChanged', (accounts: unknown) => {
    const accts = accounts as string[];
    if (accts.length === 0) {
      disconnectWallet();
    } else {
      walletState.address = accts[0];
      updateBalance();
      updateWalletUI();
      log(`Account changed: ${formatAddress(accts[0])}`, 'info');
    }
  });

  walletState.provider.on('chainChanged', (chainId: unknown) => {
    walletState.chainId = parseInt(chainId as string, 16);
    updateBalance();
    updateWalletUI();
    const networkInfo = getNetworkInfo(walletState.chainId);
    log(`Network changed: ${networkInfo.name}`, 'info');
  });
}

// ============================================================================
// EIP-6963 Wallet Discovery
// ============================================================================

export function initWalletDiscovery(): void {
  window.addEventListener('eip6963:announceProvider', ((event: EIP6963AnnounceProviderEvent) => {
    const { info, provider } = event.detail;

    const existingIndex = discoveredWallets.findIndex(w => w.info.rdns === info.rdns);
    if (existingIndex === -1) {
      addDiscoveredWallet({ info, provider });
      log(`Discovered wallet: ${info.name}`, 'info');
      updateWalletSelector();
    }
  }) as EventListener);

  window.dispatchEvent(new Event('eip6963:requestProvider'));

  setTimeout(() => {
    if (discoveredWallets.length === 0 && typeof window.ethereum !== 'undefined') {
      const legacyWallet: DiscoveredWallet = {
        info: {
          uuid: 'legacy-ethereum',
          name: window.ethereum?.isMetaMask ? 'MetaMask (Legacy)' : 'Browser Wallet',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect fill="%23627EEA" width="24" height="24" rx="4"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="12">W</text></svg>',
          rdns: 'legacy.ethereum',
        },
        provider: window.ethereum!,
      };
      addDiscoveredWallet(legacyWallet);
      log('Using legacy window.ethereum provider', 'warn');
      updateWalletSelector();
    } else if (discoveredWallets.length === 0) {
      log('No Web3 wallets detected. Please install a wallet extension.', 'warn');
      updateWalletSelector();
    }
  }, 500);
}

export function updateWalletSelector(): void {
  const container = document.getElementById('walletSelectorContainer');
  if (!container) return;

  if (discoveredWallets.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #8892b0;">
        <p>No wallets detected</p>
        <p style="font-size: 12px; margin-top: 8px;">Install MetaMask, Coinbase Wallet, or another browser wallet</p>
      </div>
    `;
    return;
  }

  container.innerHTML = discoveredWallets.map((wallet) => `
    <div class="wallet-option ${selectedWalletRdns === wallet.info.rdns ? 'selected' : ''}"
         data-rdns="${wallet.info.rdns}"
         onclick="selectWallet('${wallet.info.rdns}')">
      <img src="${wallet.info.icon}" alt="${wallet.info.name}" class="wallet-option-icon" onerror="this.style.display='none'">
      <span class="wallet-option-name">${wallet.info.name}</span>
      ${selectedWalletRdns === wallet.info.rdns ? '<span class="wallet-option-check">&#10003;</span>' : ''}
    </div>
  `).join('');
}

export function selectWallet(rdns: string): void {
  setSelectedWalletRdns(rdns);
  updateWalletSelector();

  const wallet = discoveredWallets.find(w => w.info.rdns === rdns);
  if (wallet) {
    log(`Selected wallet: ${wallet.info.name}`, 'info');
  }
}

export function getSelectedWallet(): DiscoveredWallet | undefined {
  let rdns = selectedWalletRdns;
  if (!rdns && discoveredWallets.length > 0) {
    rdns = discoveredWallets[0].info.rdns;
    setSelectedWalletRdns(rdns);
  }
  return discoveredWallets.find(w => w.info.rdns === rdns);
}

// Expose to window for onclick handlers
window.selectWallet = selectWallet;
