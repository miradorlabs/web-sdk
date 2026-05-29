// ============================================================================
// UI helpers
// ============================================================================

import { elements } from './state.js';
import { SOLANA_EXPLORER_BASE, SOLANA_EXPLORER_CLUSTER } from './config.js';

type LogLevel = 'info' | 'success' | 'error' | 'warn';

export function log(message: string, level: LogLevel = 'info'): void {
  const el = elements.activityLog;
  if (!el) return;
  const ts = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.innerHTML = `<span class="ts">[${ts}]</span>${escapeHtml(message)}`;
  el.prepend(entry);
}

export function formatPubkey(pubkey: string, head = 6, tail = 4): string {
  if (pubkey.length <= head + tail) return pubkey;
  return `${pubkey.slice(0, head)}…${pubkey.slice(-tail)}`;
}

export function explorerTxUrl(signature: string): string {
  return `${SOLANA_EXPLORER_BASE}/tx/${signature}?cluster=${SOLANA_EXPLORER_CLUSTER}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function setTxStatus(status: string, level: LogLevel = 'info'): void {
  const el = elements.txStatusLabel;
  if (!el) return;
  el.textContent = status;
  el.style.color = level === 'success' ? '#14F195'
                 : level === 'error'   ? '#ff5555'
                 : level === 'warn'    ? '#ffaa00'
                 : '#8892b0';
}
