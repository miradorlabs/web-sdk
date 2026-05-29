// ============================================================================
// Build, sign, send a SOL transfer + trace it with web3.solana.addTxHint
// ============================================================================

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import type { Trace, Web3Methods } from '@miradorlabs/web-sdk';
import {
  elements,
  formState,
  miradorClient,
  solanaConnection,
  walletState,
} from './state.js';
import { getPhantomProvider, refreshBalance } from './wallet.js';
import { explorerTxUrl, formatPubkey, log, setTxStatus } from './utils.js';

// Trace returned by client.trace() when Web3Plugin is registered.
// Inference through the bare `Client` type in state.ts loses the plugin
// generic, so we re-attach it locally.
type Web3Trace = Trace & Web3Methods;

export async function sendTransaction(): Promise<void> {
  if (!miradorClient) {
    log('Save an API key first.', 'warn');
    return;
  }
  if (!walletState.connected || !walletState.pubkey) {
    log('Connect Phantom first.', 'warn');
    return;
  }
  if (!solanaConnection) {
    log('No Solana RPC connection.', 'error');
    return;
  }

  const recipient = elements.recipientPubkey?.value.trim();
  const amountStr = elements.sendAmount?.value;
  const traceName = elements.traceName?.value.trim() || 'solana_transfer';

  if (!recipient) {
    log('Enter a recipient public key.', 'warn');
    return;
  }
  const amount = amountStr ? parseFloat(amountStr) : 0;
  if (!Number.isFinite(amount) || amount <= 0) {
    log('Enter a positive SOL amount.', 'warn');
    return;
  }

  let recipientKey: PublicKey;
  try {
    recipientKey = new PublicKey(recipient);
  } catch {
    log(`Invalid recipient public key: ${recipient}`, 'error');
    return;
  }

  // ---- 1. Open a trace and stage attributes/tags --------------------------
  const trace = miradorClient.trace({ name: traceName }) as Web3Trace;
  trace
    .addAttribute('wallet.pubkey', walletState.pubkey)
    .addAttribute('wallet.adapter', 'phantom')
    .addAttribute('chain', 'solana')
    .addAttribute('cluster', 'devnet')
    .addAttribute('transfer.recipient', recipient)
    .addAttribute('transfer.amount_sol', amount.toString())
    .addAttribute('transfer.amount_lamports', Math.round(amount * LAMPORTS_PER_SOL).toString())
    .addTags(['solana', 'devnet', 'transfer']);

  for (const [k, v] of Object.entries(formState.attributes)) {
    trace.addAttribute(k, v);
  }
  if (formState.tags.length > 0) {
    trace.addTags(formState.tags);
  }

  const traceId = trace.getTraceId();
  elements.traceResult?.classList.remove('hidden');
  elements.traceIdLabel!.textContent = traceId;
  elements.signatureLabel!.textContent = '—';
  setTxStatus('Preparing transaction…', 'info');
  log(`Trace opened: ${traceId}`, 'info');

  // ---- 2. Build the unsigned transaction ----------------------------------
  let signature: string | undefined;
  try {
    trace.addEvent('transaction_building');
    const fromKey = new PublicKey(walletState.pubkey);
    const { blockhash, lastValidBlockHeight } = await solanaConnection.getLatestBlockhash();

    const tx = new Transaction({
      feePayer: fromKey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: fromKey,
        toPubkey: recipientKey,
        lamports: Math.round(amount * LAMPORTS_PER_SOL),
      }),
    );

    // ---- 3. Sign + send via Phantom ---------------------------------------
    setTxStatus('Awaiting wallet signature…', 'info');
    trace.addEvent('awaiting_signature');
    const provider = getPhantomProvider();
    if (!provider) throw new Error('Phantom provider disappeared');

    const result = await provider.signAndSendTransaction(tx);
    signature = result.signature;

    // ---- 4. The line this whole demo exists for ---------------------------
    trace.web3.solana.addTxHint(signature, `Phantom transfer · ${amount} SOL → ${formatPubkey(recipient)}`);
    elements.signatureLabel!.innerHTML = `<a href="${explorerTxUrl(signature)}" target="_blank" rel="noopener">${formatPubkey(signature, 12, 12)}</a>`;
    log(`Submitted: ${formatPubkey(signature, 8, 8)} — addTxHint recorded.`, 'success');
    setTxStatus('Submitted · confirming…', 'info');
    trace.addEvent('transaction_submitted', { signature });

    // ---- 5. Wait for confirmation -----------------------------------------
    const confirmation = await solanaConnection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    );

    if (confirmation.value.err) {
      throw new Error(`On-chain error: ${JSON.stringify(confirmation.value.err)}`);
    }

    setTxStatus('Confirmed ✓', 'success');
    trace.addEvent('transaction_confirmed');
    log(`Confirmed on devnet.`, 'success');
    await trace.close('Transfer confirmed');
    await refreshBalance();
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    setTxStatus(`Failed — ${message}`, 'error');
    log(`Transaction failed: ${message}`, 'error');
    trace.error('transaction_failed', { message, signature });
    await trace.close(`Failed: ${message}`);
  }
}
