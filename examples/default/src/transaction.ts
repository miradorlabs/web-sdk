// ============================================================================
// Transaction Functions
// ============================================================================
import { MiradorProvider } from '@miradorlabs/web-sdk'
import { BrowserProvider, Interface, parseEther, parseUnits } from 'ethers';
import { elements, walletState, traceState, miradorClient } from './state.js';
import { log, showStatus, formatAddress, getNetworkInfo } from './utils.js';
import { updateBalance } from './wallet.js';

// Extend window for onclick handlers
declare global {
  interface Window {
    removeAttribute: (key: string) => void;
    removeTag: (index: number) => void;
  }
}

// Provider error type
interface ProviderRpcError extends Error {
  code: number;
  data?: unknown;
}

// ============================================================================
// Send Transaction
// ============================================================================

export async function sendTransaction(): Promise<void> {
  if (!elements.recipientAddress || !elements.sendAmount || !elements.traceName) return;

  const recipient = elements.recipientAddress.value.trim();
  const amount = elements.sendAmount.value.trim();
  const tokenAddress = elements.tokenAddress?.value.trim() || '';
  const traceName = elements.traceName.value.trim() || 'web3_transfer';

  // Validation
  if (!recipient) {
    showStatus('Please enter a recipient address', 'error');
    return;
  }

  if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
    showStatus('Invalid recipient address', 'error');
    return;
  }

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    showStatus('Please enter a valid amount', 'error');
    return;
  }

  if (tokenAddress && !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    showStatus('Invalid token contract address', 'error');
    return;
  }

  const isTokenTransfer = !!tokenAddress;
  const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

  if (!isTokenTransfer && walletState.balance && amountWei > walletState.balance) {
    showStatus('Insufficient balance', 'error');
    return;
  }

  if (!miradorClient || !walletState.provider) {
    showStatus('Please connect your wallet first', 'error');
    return;
  }

  try {
    if (elements.sendTxBtn) {
      elements.sendTxBtn.disabled = true;
      elements.sendTxBtn.innerHTML = '<span class="spinner"></span> Sending...';
    }

    // Create Mirador trace
    log(`Creating Mirador trace: "${traceName}"`, 'info');
    const trace = miradorClient.trace({ name: traceName });

    // Add wallet and transaction attributes
    const networkInfo = getNetworkInfo(walletState.chainId);
    trace
      .addAttribute('wallet.address', walletState.address || '')
      .addAttribute('wallet.type', 'injected')
      .addAttribute('network.name', networkInfo.name)
      .addAttribute('network.chainId', (walletState.chainId || 0).toString())
      .addAttribute('transaction.type', isTokenTransfer ? 'erc20_transfer' : 'native_transfer')
      .addAttribute('transaction.to', recipient)
      .addAttribute('transaction.value', amount)
      .addAttribute('transaction.valueWei', amountWei.toString());

    if (isTokenTransfer) {
      trace.addAttribute('transaction.tokenContract', tokenAddress);
    }

    // Add custom attributes
    for (const [key, value] of Object.entries(traceState.attributes)) {
      trace.addAttribute(key, value);
    }

    // Add tags
    trace.addTags(['web3', 'transfer', networkInfo.name.toLowerCase().replace(/\s+/g, '-')]);
    trace.addTags(traceState.tags);

    // Add event: transaction initiated
    trace.info('transaction_initiated', {
      from: walletState.address || '',
      to: recipient,
      value: amount,
    });

    traceState.currentTrace = trace;
    log('Trace created, sending transaction...', 'info');

    // Send the transaction using ethers.js
    showStatus('Please confirm the transaction in your wallet...', 'pending', 0);

    // Wrap the wallet provider so MiradorProvider can intercept eth_sendTransaction
    // and auto-attach tx hints, input data, and detected wallet metadata
    // (wallet.installed + wallet.active.*) to the bound trace.
    const wrapped = new MiradorProvider(walletState.provider, miradorClient, { trace });
    const ethersProvider = new BrowserProvider(wrapped);
    const signer = await ethersProvider.getSigner();

    let tx;
    if (isTokenTransfer) {
      // ERC-20 transfer: encode transfer(address,uint256) calldata
      const erc20 = new Interface(['function transfer(address to, uint256 amount)']);
      const data = erc20.encodeFunctionData('transfer', [recipient, parseUnits(amount, 18)]);
      log(`Encoded ERC-20 transfer calldata: ${data.slice(0, 20)}...`, 'info');

      tx = await signer.sendTransaction({
        to: tokenAddress,  // send to the token contract
        data,              // encoded transfer(recipient, amount)
        value: 0n,         // no ETH value for token transfers
      });
    } else {
      // Native ETH transfer
      tx = await signer.sendTransaction({
        to: recipient,
        value: parseEther(amount),
      });
    }

    const txHash = tx.hash;
    log(`Transaction submitted: ${tx.data}`, 'info');
    log(`Transaction sent: ${txHash}`, 'success');
    if (tx.data && tx.data !== '0x') {
      log(`Tx input data: ${tx.data}`, 'info');
    }
    showStatus('Transaction sent! Waiting for confirmation...', 'pending', 0);

    // Add event: transaction sent
    trace.info('transaction_sent', { txHash });

    // Show trace info
    elements.traceInfo?.classList.remove('hidden');
    if (elements.txHash) {
      elements.txHash.textContent = txHash;
    }
    if (elements.traceStatus) {
      elements.traceStatus.innerHTML = '<span class="spinner"></span> Pending';
    }

    // tx hint, input data, and wallet metadata are auto-attached by MiradorProvider above.

    // Optional: Add a Safe message hint if this is a Safe multisig operation.
    // Uncomment the line below and provide the Safe message hash to track
    // multisig confirmations for this transaction.
    // trace.web3.safe.addMsgHint('<safe-message-hash>', chainName, 'Multisig approval');

    // Flush and wait for trace ID
    trace.flush();

    // Poll for trace ID (available after flush completes)
    let traceId = trace.getTraceId();
    let attempts = 0;
    while (!traceId && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      traceId = trace.getTraceId();
      attempts++;
    }

    if (traceId && elements.traceId) {
      elements.traceId.textContent = traceId;
      log(`Mirador trace created: ${traceId}`, 'success');
    } else if (elements.traceId) {
      elements.traceId.textContent = 'Pending...';
      log('Trace submitted, waiting for ID...', 'info');
    }

    // Wait for transaction confirmation
    waitForConfirmation(tx, traceId || undefined);

  } catch (error) {
    const err = error as ProviderRpcError;
    if (err.code === 4001) {
      log('Transaction rejected by user', 'warn');
      showStatus('Transaction cancelled', 'info');

      if (traceState.currentTrace) {
        traceState.currentTrace.warn('transaction_rejected', { reason: 'User rejected' });
        await traceState.currentTrace.close('Transaction rejected by user');
        traceState.currentTrace = null;
      }
    } else {
      log(`Transaction failed: ${err.message}`, 'error');
      showStatus(`Transaction failed: ${err.message}`, 'error');

      if (traceState.currentTrace) {
        traceState.currentTrace.error('transaction_error', { error: err.message });
        await traceState.currentTrace.close(`Transaction error: ${err.message}`);
        traceState.currentTrace = null;
      }
    }

    if (elements.sendTxBtn) {
      elements.sendTxBtn.disabled = false;
      elements.sendTxBtn.innerHTML = '<span>&#9889;</span> Send Transaction';
    }
  }
}

// ============================================================================
// Wait for Confirmation
// ============================================================================

async function waitForConfirmation(tx: { hash: string; wait: () => Promise<{ status: number | null; blockNumber: number; hash: string } | null> }, _traceId?: string): Promise<void> {
  const txHash = tx.hash;

  try {
    const receipt = await tx.wait();
    const success = receipt !== null && receipt.status === 1;
    const blockNumber = receipt?.blockNumber;

    if (elements.traceStatus) {
      if (success) {
        elements.traceStatus.innerHTML = '&#10003; Confirmed';
        elements.traceStatus.style.background = 'rgba(16, 185, 129, 0.2)';
        log(`Transaction confirmed in block ${blockNumber}`, 'success');
        showStatus('Transaction confirmed!', 'success');
      } else {
        elements.traceStatus.innerHTML = '&#10007; Failed';
        elements.traceStatus.style.background = 'rgba(239, 68, 68, 0.2)';
        elements.traceStatus.style.color = '#f87171';
        log('Transaction failed on-chain', 'error');
        showStatus('Transaction failed', 'error');
      }
    }

    // Close the trace with confirmation details
    if (traceState.currentTrace) {
      const closeReason = success
        ? `Transaction confirmed in block ${blockNumber}`
        : 'Transaction failed on-chain';
      traceState.currentTrace.info('transaction_confirmed', {
        success,
        blockNumber,
        txHash,
      });
      await traceState.currentTrace.close(closeReason);
      log('Trace closed', 'info');
      traceState.currentTrace = null;
    }

    // Reset button
    if (elements.sendTxBtn) {
      elements.sendTxBtn.disabled = false;
      elements.sendTxBtn.innerHTML = '<span>&#9889;</span> Send Transaction';
    }

    // Update balance
    await updateBalance();
  } catch (error) {
    const err = error as Error;
    log(`Transaction confirmation error: ${err.message}`, 'error');

    if (elements.traceStatus) {
      elements.traceStatus.innerHTML = '&#10007; Failed';
      elements.traceStatus.style.background = 'rgba(239, 68, 68, 0.2)';
      elements.traceStatus.style.color = '#f87171';
    }
    showStatus(`Transaction failed: ${err.message}`, 'error');

    if (traceState.currentTrace) {
      traceState.currentTrace.error('confirmation_error', { txHash, error: err.message });
      await traceState.currentTrace.close(`Confirmation error: ${err.message}`);
      traceState.currentTrace = null;
    }

    if (elements.sendTxBtn) {
      elements.sendTxBtn.disabled = false;
      elements.sendTxBtn.innerHTML = '<span>&#9889;</span> Send Transaction';
    }
  }
}

// ============================================================================
// Attributes & Tags
// ============================================================================

export function addAttribute(): void {
  if (!elements.attrKey || !elements.attrValue) return;

  const key = elements.attrKey.value.trim();
  const value = elements.attrValue.value.trim();

  if (!key || !value) {
    showStatus('Please enter both key and value', 'error');
    return;
  }

  traceState.attributes[key] = value;
  updateAttributesDisplay();

  elements.attrKey.value = '';
  elements.attrValue.value = '';

  log(`Added attribute: ${key} = "${value}"`, 'info');
}

export function updateAttributesDisplay(): void {
  const list = elements.attributesList;
  if (!list) return;

  list.innerHTML = '';

  for (const [key, value] of Object.entries(traceState.attributes)) {
    const row = document.createElement('div');
    row.className = 'attribute-row';
    row.innerHTML = `
      <span class="attribute-key">${key}</span>
      <span class="attribute-value">${value}</span>
      <span class="tag-remove" onclick="removeAttribute('${key}')">&times;</span>
    `;
    list.appendChild(row);
  }
}

export function removeAttribute(key: string): void {
  delete traceState.attributes[key];
  updateAttributesDisplay();
  log(`Removed attribute: ${key}`, 'info');
}

export function addTag(): void {
  if (!elements.tagInput) return;

  const tag = elements.tagInput.value.trim();

  if (!tag) {
    showStatus('Please enter a tag', 'error');
    return;
  }

  if (traceState.tags.includes(tag)) {
    showStatus('Tag already exists', 'error');
    return;
  }

  traceState.tags.push(tag);
  updateTagsDisplay();

  elements.tagInput.value = '';
  log(`Added tag: "${tag}"`, 'info');
}

export function updateTagsDisplay(): void {
  const container = elements.tagsContainer;
  if (!container) return;

  container.innerHTML = '';

  traceState.tags.forEach((tag, index) => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `${tag} <span class="tag-remove" onclick="removeTag(${index})">&times;</span>`;
    container.appendChild(tagEl);
  });
}

export function removeTag(index: number): void {
  const tag = traceState.tags[index];
  traceState.tags.splice(index, 1);
  updateTagsDisplay();
  log(`Removed tag: "${tag}"`, 'info');
}

// ============================================================================
// Preview Updates
// ============================================================================

export function updatePreview(): void {
  if (!elements.recipientAddress || !elements.sendAmount) return;

  const recipient = elements.recipientAddress.value.trim();
  const amount = elements.sendAmount.value.trim();

  if (elements.previewTo) {
    elements.previewTo.textContent = recipient ? formatAddress(recipient) : '-';
  }
  if (elements.previewAmount) {
    elements.previewAmount.textContent = amount ? `${amount} ETH` : '-';
  }
}

// Expose to window for onclick handlers
window.removeAttribute = removeAttribute;
window.removeTag = removeTag;
