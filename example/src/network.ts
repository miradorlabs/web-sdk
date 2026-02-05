// ============================================================================
// Network Switching
// ============================================================================

import { NETWORKS } from './config.js';
import { elements, walletState } from './state.js';
import { log, showStatus, getNetworkIcon } from './utils.js';

// Extend window for switchNetwork
declare global {
  interface Window {
    switchNetwork: (chainId: number) => Promise<void>;
  }
}

// Provider error type
interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

// ============================================================================
// Dropdown UI
// ============================================================================

export function toggleNetworkDropdown(): void {
  elements.networkSelector?.classList.toggle('open');
}

export function closeNetworkDropdown(): void {
  elements.networkSelector?.classList.remove('open');
}

export function populateNetworkDropdown(): void {
  const dropdown = elements.networkDropdown;
  if (!dropdown) return;

  const mainnets = Object.entries(NETWORKS).filter(([, n]) => !n.isTestnet);
  const testnets = Object.entries(NETWORKS).filter(([, n]) => n.isTestnet);

  let html = '';

  // Mainnets
  html += '<div class="network-dropdown-label">Mainnets</div>';
  mainnets.forEach(([chainId, network]) => {
    const isActive = walletState.chainId === parseInt(chainId);
    html += `
      <div class="network-dropdown-item ${isActive ? 'active' : ''}"
           data-chain-id="${chainId}"
           onclick="switchNetwork(${chainId})">
        <div class="network-icon">${getNetworkIcon(network.chain)}</div>
        <div class="network-info">
          <div class="network-name">${network.name}</div>
          <div class="network-type">${network.symbol}</div>
        </div>
        ${isActive ? '<span class="network-check">&#10003;</span>' : ''}
      </div>
    `;
  });

  // Divider
  html += '<div class="network-dropdown-divider"></div>';

  // Testnets
  html += '<div class="network-dropdown-label">Testnets</div>';
  testnets.forEach(([chainId, network]) => {
    const isActive = walletState.chainId === parseInt(chainId);
    html += `
      <div class="network-dropdown-item ${isActive ? 'active' : ''}"
           data-chain-id="${chainId}"
           onclick="switchNetwork(${chainId})">
        <div class="network-icon">${getNetworkIcon(network.chain)}</div>
        <div class="network-info">
          <div class="network-name">${network.name}</div>
          <div class="network-type">${network.symbol}</div>
        </div>
        ${isActive ? '<span class="network-check">&#10003;</span>' : ''}
      </div>
    `;
  });

  dropdown.innerHTML = html;
}

// ============================================================================
// Network Switching
// ============================================================================

export async function switchNetwork(chainId: number): Promise<void> {
  if (!walletState.provider) {
    showStatus('Please connect a wallet first', 'error');
    return;
  }

  const chainIdHex = '0x' + chainId.toString(16);
  const network = NETWORKS[chainId];

  if (!network) {
    showStatus('Unknown network', 'error');
    return;
  }

  closeNetworkDropdown();

  try {
    log(`Switching to ${network.name}...`, 'info');
    showStatus(`Switching to ${network.name}...`, 'pending', 0);

    await walletState.provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });

    showStatus(`Switched to ${network.name}`, 'success');
  } catch (error) {
    const switchError = error as ProviderRpcError;
    // Error code 4902 means the chain hasn't been added to the wallet
    if (switchError.code === 4902) {
      try {
        log(`Adding ${network.name} to wallet...`, 'info');

        await walletState.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: network.name,
            nativeCurrency: {
              name: network.symbol,
              symbol: network.symbol,
              decimals: network.decimals,
            },
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.explorer],
          }],
        });

        showStatus(`Added and switched to ${network.name}`, 'success');
      } catch (addErr) {
        const addError = addErr as Error;
        log(`Failed to add network: ${addError.message}`, 'error');
        showStatus(`Failed to add network: ${addError.message}`, 'error');
      }
    } else if (switchError.code === 4001) {
      log('Network switch cancelled', 'warn');
      showStatus('Network switch cancelled', 'info');
    } else {
      log(`Failed to switch network: ${switchError.message}`, 'error');
      showStatus(`Failed to switch: ${switchError.message}`, 'error');
    }
  }
}

// Expose to window for onclick handlers
window.switchNetwork = switchNetwork;
