// ============================================================================
// Phantom wallet integration
// ============================================================================
//
// Phantom (and most modern Solana wallets) injects `window.solana` and also
// supports the Wallet Standard. We use the simple direct path here — it keeps
// the demo minimal and works with the dominant wallet by install count.

import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { elements, solanaConnection, walletState } from './state.js';
import { formatPubkey, log } from './utils.js';

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: unknown) => Promise<{ signature: string }>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
    phantom?: { solana?: PhantomProvider };
  }
}

export function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const provider = window.phantom?.solana ?? window.solana;
  return provider?.isPhantom ? provider : null;
}

export async function connectWallet(): Promise<void> {
  const provider = getPhantomProvider();
  if (!provider) {
    log('Phantom wallet not detected — install at https://phantom.com/', 'error');
    return;
  }

  try {
    const { publicKey } = await provider.connect();
    walletState.pubkey = publicKey.toBase58();
    walletState.connected = true;

    renderWallet();
    log(`Phantom connected: ${formatPubkey(walletState.pubkey)}`, 'success');

    provider.on('disconnect', () => {
      walletState.pubkey = null;
      walletState.balanceSol = null;
      walletState.connected = false;
      renderWallet();
      log('Phantom disconnected.', 'warn');
    });

    await refreshBalance();
  } catch (err) {
    log(`Phantom connect failed: ${(err as Error).message}`, 'error');
  }
}

export async function disconnectWallet(): Promise<void> {
  const provider = getPhantomProvider();
  if (!provider) return;
  try {
    await provider.disconnect();
  } catch {
    /* ignore */
  }
}

export async function refreshBalance(): Promise<void> {
  if (!walletState.pubkey || !solanaConnection) return;
  try {
    const lamports = await solanaConnection.getBalance(new PublicKey(walletState.pubkey));
    walletState.balanceSol = lamports / LAMPORTS_PER_SOL;
    renderWallet();
  } catch (err) {
    log(`Balance fetch failed: ${(err as Error).message}`, 'warn');
  }
}

function renderWallet(): void {
  if (walletState.connected && walletState.pubkey) {
    elements.walletStatus!.innerHTML = `<span class="badge connected">Connected</span>`;
    elements.walletInfo?.classList.remove('hidden');
    elements.walletPubkey!.textContent = formatPubkey(walletState.pubkey, 8, 8);
    elements.walletBalance!.textContent = walletState.balanceSol != null
      ? `${walletState.balanceSol.toFixed(4)} SOL`
      : '— SOL';
    elements.connectWalletBtn?.classList.add('hidden');
    elements.disconnectWalletBtn?.classList.remove('hidden');
    elements.sendTxBtn!.disabled = false;
  } else {
    elements.walletStatus!.innerHTML = `<span class="badge disconnected">Disconnected</span>`;
    elements.walletInfo?.classList.add('hidden');
    elements.connectWalletBtn?.classList.remove('hidden');
    elements.disconnectWalletBtn?.classList.add('hidden');
    elements.sendTxBtn!.disabled = true;
  }
}
