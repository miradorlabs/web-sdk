// ============================================================================
// Utility Functions
// ============================================================================

import { NETWORKS, type NetworkConfig } from './config.js';
import { elements } from './state.js';

export type LogType = 'info' | 'success' | 'error' | 'warn';
export type StatusType = 'info' | 'success' | 'error' | 'pending';

/**
 * Log a message to the activity log
 */
export function log(message: string, type: LogType = 'info'): void {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${message}</span>`;
  if (elements.log) {
    elements.log.appendChild(entry);
    elements.log.scrollTop = elements.log.scrollHeight;
  }
}

/**
 * Show a status message in the status bar
 */
export function showStatus(message: string, type: StatusType = 'info', duration = 4000): void {
  if (!elements.statusBar) return;
  elements.statusBar.textContent = message;
  elements.statusBar.className = `status-bar ${type} show`;
  if (duration > 0) {
    setTimeout(() => {
      elements.statusBar?.classList.remove('show');
    }, duration);
  }
}

/**
 * Format an Ethereum address for display
 */
export function formatAddress(address: string | null): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a balance in wei to ETH
 */
export function formatBalance(balanceWei: bigint | null): string {
  if (balanceWei === null) return '0.0000';
  const balanceEth = Number(balanceWei) / 1e18;
  return balanceEth.toFixed(4);
}

/**
 * Get network info by chain ID
 */
export function getNetworkInfo(chainId: number | null): NetworkConfig {
  if (chainId === null) {
    return {
      name: 'Unknown',
      symbol: 'ETH',
      explorer: '',
      chain: 'ethereum',
      decimals: 18,
      rpcUrl: '',
      isTestnet: false,
    };
  }
  return NETWORKS[chainId] || {
    name: `Chain ${chainId}`,
    symbol: 'ETH',
    explorer: '',
    chain: 'ethereum',
    decimals: 18,
    rpcUrl: '',
    isTestnet: false,
  };
}

/**
 * Get a simple icon for a chain
 */
export function getNetworkIcon(chain: string): string {
  const icons: Record<string, string> = {
    ethereum: '&#9830;',  // Diamond
    polygon: '&#9646;',   // Square
    arbitrum: '&#9651;',  // Triangle
    optimism: '&#9711;',  // Circle
    base: '&#9632;',      // Filled square
    bsc: '&#9733;',       // Star
  };
  return icons[chain] || '&#9679;';
}
