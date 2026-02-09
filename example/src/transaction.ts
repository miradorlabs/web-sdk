// ============================================================================
// Transaction Functions
// ============================================================================
import { ChainName } from '@miradorlabs/web-sdk'
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

// Transaction receipt type
interface TransactionReceipt {
  status: string;
  blockNumber: string;
  transactionHash: string;
}

// ============================================================================
// Send Transaction
// ============================================================================

export async function sendTransaction(): Promise<void> {
  if (!elements.recipientAddress || !elements.sendAmount || !elements.traceName) return;

  const recipient = elements.recipientAddress.value.trim();
  const amount = elements.sendAmount.value.trim();
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

  const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

  if (walletState.balance && amountWei > walletState.balance) {
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
      .addAttribute('transaction.type', 'transfer')
      .addAttribute('transaction.to', recipient)
      .addAttribute('transaction.value', amount)
      .addAttribute('transaction.valueWei', amountWei.toString());

    // Add custom attributes
    for (const [key, value] of Object.entries(traceState.attributes)) {
      trace.addAttribute(key, value);
    }

    // Add tags
    trace.addTags(['web3', 'transfer', networkInfo.name.toLowerCase().replace(/\s+/g, '-')]);
    trace.addTags(traceState.tags);

    // Add event: transaction initiated
    trace.addEvent('transaction_initiated', {
      from: walletState.address || '',
      to: recipient,
      value: amount,
    });

    traceState.currentTrace = trace;
    log('Trace created, sending transaction...', 'info');

    // Send the transaction
    showStatus('Please confirm the transaction in your wallet...', 'pending', 0);

    const txHash = await walletState.provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: walletState.address,
        to: recipient,
        value: '0x' + amountWei.toString(16),
      }],
    }) as string;

    log(`Transaction sent: ${txHash}`, 'success');
    showStatus('Transaction sent! Waiting for confirmation...', 'pending', 0);

    // Add event: transaction sent
    trace.addEvent('transaction_sent', { txHash });

    // Show trace info
    elements.traceInfo?.classList.remove('hidden');
    if (elements.txHash) {
      elements.txHash.textContent = txHash;
    }
    if (elements.traceStatus) {
      elements.traceStatus.innerHTML = '<span class="spinner"></span> Pending';
    }

    // Add transaction hash hint for blockchain correlation
    const chainName: ChainName = networkInfo.chain || 'ethereum';
    trace.addTxHint(txHash, chainName, 'ETH Transfer');

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
    waitForConfirmation(txHash, traceId || undefined);

  } catch (error) {
    const err = error as ProviderRpcError;
    if (err.code === 4001) {
      log('Transaction rejected by user', 'warn');
      showStatus('Transaction cancelled', 'info');

      if (traceState.currentTrace) {
        traceState.currentTrace.addEvent('transaction_rejected', { reason: 'User rejected' });
        await traceState.currentTrace.close('Transaction rejected by user');
        traceState.currentTrace = null;
      }
    } else {
      log(`Transaction failed: ${err.message}`, 'error');
      showStatus(`Transaction failed: ${err.message}`, 'error');

      if (traceState.currentTrace) {
        traceState.currentTrace.addEvent('transaction_error', { error: err.message });
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

async function waitForConfirmation(txHash: string, _traceId?: string): Promise<void> {
  const maxAttempts = 60;
  let attempts = 0;

  const checkReceipt = async (): Promise<void> => {
    if (!walletState.provider) return;

    try {
      const receipt = await walletState.provider.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }) as TransactionReceipt | null;

      if (receipt) {
        const success = receipt.status === '0x1';
        const blockNumber = parseInt(receipt.blockNumber, 16);

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
          traceState.currentTrace.addEvent('transaction_confirmed', {
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
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkReceipt, 2000);
      } else {
        log('Transaction confirmation timeout', 'warn');
        if (elements.traceStatus) {
          elements.traceStatus.innerHTML = '? Unknown';
        }
        if (elements.sendTxBtn) {
          elements.sendTxBtn.disabled = false;
          elements.sendTxBtn.innerHTML = '<span>&#9889;</span> Send Transaction';
        }

        // Close trace on timeout
        if (traceState.currentTrace) {
          traceState.currentTrace.addEvent('confirmation_timeout', { txHash, attempts: maxAttempts });
          await traceState.currentTrace.close('Confirmation timeout');
          traceState.currentTrace = null;
        }
      }
    } catch (error) {
      const err = error as Error;
      log(`Error checking receipt: ${err.message}`, 'error');
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkReceipt, 2000);
      }
    }
  };

  setTimeout(checkReceipt, 2000);
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
