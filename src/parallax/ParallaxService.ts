/**
 * Parallax Service - Transaction Tracing for Web Applications
 * Creates individual traces for each transaction and tracks them through their lifecycle
 *
 * This service provides a simplified interface for tracking transactions with automatic
 * client metadata collection and lifecycle management.
 */

import { ParallaxClient } from './index';
import type {
  CreateTraceResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';

interface TransactionInfo {
  traceId: string;
  timestamp: string;
  txHash: string | null;
  from?: string;
  to?: string;
  network?: string;
}

interface TransactionData {
  from: string;
  to: string;
  value: string;
  network?: string;
  walletAddress?: string;
  additionalData?: Record<string, any>;
}

interface FinishOptions {
  success: boolean;
  error?: string;
}

export class ParallaxService {
  private client: ParallaxClient | null = null;
  private activeTransactions: Map<string, TransactionInfo> = new Map();

  constructor() {
    // Client will be initialized lazily
  }

  /**
   * Initialize the Parallax client (lazy initialization)
   * @param apiKey - Optional API key for authentication
   * @param gatewayUrl - Optional custom gateway URL
   */
  private _ensureClient(apiKey?: string, gatewayUrl?: string): void {
    if (this.client) return;

    // Determine gateway URL based on environment if not provided
    let url = gatewayUrl;
    if (!url && typeof window !== 'undefined') {
      const isDevelopment =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

      url = isDevelopment
        ? `${window.location.protocol}//${window.location.host}/parallax-gateway`
        : 'https://gateway-parallax-dev.mirador.org';
    }

    this.client = new ParallaxClient(apiKey || '', url);
    console.log('[ParallaxService] Client initialized with URL:', url);
  }

  /**
   * Start a new transaction trace
   * Called when user initiates a transaction
   *
   * Uses the builder pattern to create a trace with events
   *
   * @param txData - Transaction data
   * @param name - Name for the trace (e.g., 'SendingTrace', 'SwappingTrace')
   * @param options - Optional configuration (apiKey, gatewayUrl, includeClientMeta)
   * @returns Promise with traceId, rootSpanId, and txId
   */
  async startTransactionTrace(
    txData: TransactionData,
    name: string = 'WalletTransaction',
    options?: { apiKey?: string; gatewayUrl?: string; includeClientMeta?: boolean }
  ): Promise<{ traceId: string; rootSpanId: string; txId: string }> {
    this._ensureClient(options?.apiKey, options?.gatewayUrl);

    if (!this.client) {
      throw new Error('Failed to initialize Parallax client');
    }

    try {
      const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date();

      // Build the trace using the builder pattern
      const builder = this.client
        .trace(name, options?.includeClientMeta ?? true)
        .addAttribute('transactionId', txId)
        .addAttribute('walletAddress', txData.walletAddress || txData.from)
        .addAttribute('network', txData.network || 'Unknown')
        .addAttribute('transactionStart', timestamp.toISOString())
        .addAttribute('from', txData.from)
        .addAttribute('to', txData.to)
        .addAttribute('value', txData.value)
        .addTags(['transaction', 'wallet', txData.network || 'unknown'])
        .addEvent('transaction_initiated', {
          from: txData.from,
          to: txData.to,
          value: txData.value,
          timestamp: timestamp.toISOString(),
        });

      // Add any additional transaction data as attributes
      if (txData.additionalData) {
        Object.entries(txData.additionalData).forEach(([key, value]) => {
          builder.addAttribute(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        });
      }

      // Submit the trace
      const traceResponse: CreateTraceResponse = await builder.submit();
      const traceId = traceResponse.getTraceId();

      // Store transaction info
      this.activeTransactions.set(txId, {
        traceId,
        timestamp: timestamp.toISOString(),
        txHash: null,
        from: txData.from,
        to: txData.to,
        network: txData.network,
      });

      console.log('[ParallaxService] Transaction trace started:', {
        txId,
        traceId,
        from: txData.from,
        to: txData.to,
      });

      return { traceId, rootSpanId: traceId, txId };
    } catch (error) {
      console.error('[ParallaxService] Failed to start transaction trace:', error);
      throw error;
    }
  }

  /**
   * Associate a transaction hash with an existing trace
   * Called when the transaction hash is available after signing/sending
   *
   * NOTE: This method is deprecated as the new API does not support adding hints to existing traces.
   * Transaction hashes should be provided at trace creation time via the builder's submit(txHash, chainId) method.
   *
   * @param txId - Transaction identifier returned from startTransactionTrace
   * @param txHash - Blockchain transaction hash
   * @param chainId - Chain ID
   * @deprecated Use submit(txHash, chainId) when creating the trace instead
   */
  async associateTransactionHash(txId: string, txHash: string, chainId: number): Promise<void> {
    const txInfo = this.activeTransactions.get(txId);
    if (!txInfo) {
      console.warn(`[ParallaxService] Transaction ${txId} not found in active transactions`);
      return;
    }

    // Update stored tx info
    txInfo.txHash = txHash;
    this.activeTransactions.set(txId, txInfo);

    console.warn('[ParallaxService] associateTransactionHash is deprecated. The new API does not support adding transaction hashes after trace creation. Please provide the txHash when creating the trace using submit(txHash, chainId).');
    console.log('[ParallaxService] Transaction hash updated in local cache:', {
      txId,
      txHash,
      traceId: txInfo.traceId,
    });
  }

  /**
   * Add an event to a transaction trace
   *
   * NOTE: This method is deprecated as the new API does not support adding events to existing traces.
   * Events should be added to the trace builder before calling submit().
   *
   * @param txId - Transaction identifier
   * @param eventName - Event name
   * @param attributes - Event attributes
   * @deprecated Use the trace builder's addEvent() method before calling submit() instead
   */
  async addTransactionEvent(
    txId: string,
    eventName: string,
    attributes: Record<string, any> = {}
  ): Promise<void> {
    const txInfo = this.activeTransactions.get(txId);
    if (!txInfo) {
      console.warn(`[ParallaxService] Transaction ${txId} not found. Cannot add event '${eventName}'`);
      return;
    }

    console.warn('[ParallaxService] addTransactionEvent is deprecated. The new API does not support adding events after trace creation. Events should be added using the builder pattern before calling submit().');
  }

  /**
   * Add an error to a transaction trace
   *
   * NOTE: This method is deprecated as the new API does not support adding errors to existing traces.
   * Errors should be added as events to the trace builder before calling submit().
   *
   * @param txId - Transaction identifier
   * @param error - Error object or message
   * @param errorType - Type/category of error (e.g., 'TransactionError', 'NetworkError', 'UserRejection')
   * @deprecated Use the trace builder's addEvent() method to add error events before calling submit() instead
   */
  async addTransactionError(
    txId: string,
    error: Error | string,
    errorType: string = 'TransactionError'
  ): Promise<void> {
    const txInfo = this.activeTransactions.get(txId);
    if (!txInfo) {
      console.warn(`[ParallaxService] Transaction ${txId} not found. Cannot add error.`);
      return;
    }

    console.warn('[ParallaxService] addTransactionError is deprecated. The new API does not support adding errors after trace creation. Add error events using the builder pattern before calling submit().');
  }

  /**
   * Finish a transaction trace
   *
   * NOTE: This method is deprecated as the new API does not support span lifecycle management.
   * Traces are completed when submit() is called on the builder.
   *
   * @param txId - Transaction identifier
   * @param options - Finish options (success, error message)
   * @deprecated Traces are automatically completed when submit() is called
   */
  async finishTransactionTrace(txId: string, options: FinishOptions = { success: true }): Promise<void> {
    const txInfo = this.activeTransactions.get(txId);
    if (!txInfo) {
      console.warn(`[ParallaxService] Transaction ${txId} not found. Cannot finish.`);
      return;
    }

    console.warn('[ParallaxService] finishTransactionTrace is deprecated. The new API does not support span lifecycle. Traces are completed when submit() is called.');

    console.log('[ParallaxService] Transaction trace marked as finished (local only):', {
      txId,
      traceId: txInfo.traceId,
      success: options.success,
      txHash: txInfo.txHash,
    });

    // Remove from active transactions
    this.activeTransactions.delete(txId);
  }

  /**
   * Get info about an active transaction
   *
   * @param txId - Transaction identifier
   * @returns Transaction info or null if not found
   */
  getTransactionInfo(txId: string): TransactionInfo | null {
    return this.activeTransactions.get(txId) || null;
  }

  /**
   * Get all active transactions
   *
   * @returns Array of active transaction info
   */
  getAllActiveTransactions(): Array<TransactionInfo & { txId: string }> {
    return Array.from(this.activeTransactions.entries()).map(([txId, info]) => ({
      txId,
      ...info,
    }));
  }

  /**
   * Get the ParallaxClient instance for advanced usage
   * @param apiKey - Optional API key
   * @param gatewayUrl - Optional gateway URL
   */
  getClient(apiKey?: string, gatewayUrl?: string): ParallaxClient {
    this._ensureClient(apiKey, gatewayUrl);
    if (!this.client) {
      throw new Error('Failed to initialize Parallax client');
    }
    return this.client;
  }
}

// Export singleton instance
export const parallaxService = new ParallaxService();
