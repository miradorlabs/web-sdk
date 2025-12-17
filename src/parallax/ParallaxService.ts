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
  StartSpanResponse,
  FinishSpanResponse,
  AddSpanEventResponse,
  AddSpanErrorResponse,
  AddSpanHintResponse,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';

interface TransactionInfo {
  traceId: string;
  rootSpanId: string;
  spanId: string | null;
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
   * Note: Since createTrace now automatically creates a root span, we don't need
   * to call startSpan separately. The rootSpanId from the response is the parent span.
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
      const timestamp = new Date().toISOString();

      // Create trace attributes
      const traceAttributes: Record<string, string> = {
        transactionId: txId,
        walletAddress: txData.walletAddress || txData.from,
        network: txData.network || 'Unknown',
        transactionStart: timestamp,
        from: txData.from,
        to: txData.to,
        value: txData.value,
      };

      // Add any additional transaction data
      if (txData.additionalData) {
        Object.entries(txData.additionalData).forEach(([key, value]) => {
          traceAttributes[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
        });
      }

      // Create a trace for this transaction
      const createTraceReq = await this.client.createTraceRequest({
        name: name,
        attr: traceAttributes,
        tags: ['transaction', 'wallet', txData.network || 'unknown'],
        includeClientMeta: options?.includeClientMeta ?? true,
      });

      const traceResponse: CreateTraceResponse = await this.client.createTrace(createTraceReq);
      const traceId = traceResponse.getTraceId();
      const rootSpanId = traceResponse.getRootSpanId();

      // Store transaction info
      this.activeTransactions.set(txId, {
        traceId,
        rootSpanId,
        spanId: rootSpanId, // Use rootSpanId as the main span for this transaction
        timestamp,
        txHash: null,
        from: txData.from,
        to: txData.to,
        network: txData.network,
      });

      console.log('[ParallaxService] Transaction trace started:', {
        txId,
        traceId,
        rootSpanId,
        from: txData.from,
        to: txData.to,
      });

      // Add initial event to the root span
      await this.addTransactionEvent(txId, 'transaction_initiated', {
        from: txData.from,
        to: txData.to,
        value: txData.value,
        timestamp,
      });

      return { traceId, rootSpanId, txId };
    } catch (error) {
      console.error('[ParallaxService] Failed to start transaction trace:', error);
      throw error;
    }
  }

  /**
   * Associate a transaction hash with an existing trace
   * Called when the transaction hash is available after signing/sending
   *
   * @param txId - Transaction identifier returned from startTransactionTrace
   * @param txHash - Blockchain transaction hash
   * @param chainId - Chain ID
   */
  async associateTransactionHash(txId: string, txHash: string, chainId: number): Promise<void> {
    const txInfo = this.activeTransactions.get(txId);
    if (!txInfo) {
      console.warn(`[ParallaxService] Transaction ${txId} not found in active transactions`);
      return;
    }

    if (!this.client) {
      console.warn('[ParallaxService] Client not initialized');
      return;
    }

    try {
      // Update stored tx info
      txInfo.txHash = txHash;
      this.activeTransactions.set(txId, txInfo);

      // Add chain hint to correlate with blockchain events
      const hintReq = this.client.createAddSpanHintRequest({
        traceId: txInfo.traceId,
        parentSpanId: txInfo.rootSpanId,
        txHash: txHash,
        chainId: chainId,
      });

      await this.client.addSpanHint(hintReq);

      // Add event for transaction sent
      await this.addTransactionEvent(txId, 'transaction_hash_available', {
        txHash,
        chainId: chainId.toString(),
        timestamp: new Date().toISOString(),
      });

      console.log('[ParallaxService] Transaction hash associated with trace:', {
        txId,
        txHash,
        traceId: txInfo.traceId,
      });
    } catch (error) {
      console.error('[ParallaxService] Failed to associate transaction hash:', error);
    }
  }

  /**
   * Add an event to a transaction trace
   *
   * @param txId - Transaction identifier
   * @param eventName - Event name
   * @param attributes - Event attributes
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

    if (!this.client || !txInfo.spanId) {
      console.warn('[ParallaxService] Client not initialized or span not available');
      return;
    }

    try {
      // Convert attributes to plain object with string values
      const eventAttributes: Record<string, string> = {};
      Object.entries(attributes).forEach(([key, value]) => {
        eventAttributes[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      });

      const request = this.client.createAddSpanEventRequest({
        traceId: txInfo.traceId,
        spanId: txInfo.spanId,
        eventName: eventName,
        attr: eventAttributes,
      });

      await this.client.addSpanEvent(request);
    } catch (error) {
      console.error(`[ParallaxService] Failed to add transaction event '${eventName}':`, error);
    }
  }

  /**
   * Add an error to a transaction trace
   * Creates a proper span error event in Parallax
   *
   * @param txId - Transaction identifier
   * @param error - Error object or message
   * @param errorType - Type/category of error (e.g., 'TransactionError', 'NetworkError', 'UserRejection')
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

    if (!this.client || !txInfo.spanId) {
      console.warn('[ParallaxService] Client not initialized or span not available');
      return;
    }

    try {
      // Extract error message and stack trace
      let errorMessage = '';
      let stackTrace: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        stackTrace = error.stack;
      } else {
        errorMessage = String(error);
      }

      const request = this.client.createAddSpanErrorRequest({
        traceId: txInfo.traceId,
        spanId: txInfo.spanId,
        errorMessage: errorMessage,
        errorType: errorType,
        stackTrace: stackTrace,
      });

      await this.client.addSpanError(request);

      console.log('[ParallaxService] Transaction error added to trace:', {
        txId,
        errorType,
        message: error instanceof Error ? error.message : String(error),
      });
    } catch (err) {
      console.error('[ParallaxService] Failed to add transaction error:', err);
    }
  }

  /**
   * Finish a transaction trace
   * Called when transaction is confirmed or permanently failed
   *
   * @param txId - Transaction identifier
   * @param options - Finish options (success, error message)
   */
  async finishTransactionTrace(txId: string, options: FinishOptions = { success: true }): Promise<void> {
    const txInfo = this.activeTransactions.get(txId);
    if (!txInfo) {
      console.warn(`[ParallaxService] Transaction ${txId} not found. Cannot finish.`);
      return;
    }

    if (!this.client || !txInfo.spanId) {
      console.warn('[ParallaxService] Client not initialized or span not available');
      return;
    }

    try {
      // Add final event
      await this.addTransactionEvent(
        txId,
        options.success ? 'transaction_completed' : 'transaction_failed',
        {
          success: options.success.toString(),
          error: options.error || '',
          duration: (Date.now() - new Date(txInfo.timestamp).getTime()).toString(),
          timestamp: new Date().toISOString(),
        }
      );

      // Finish the span
      const request = this.client.createFinishSpanRequest({
        traceId: txInfo.traceId,
        spanId: txInfo.spanId,
        status: {
          success: options.success,
          errorMessage: options.error || '',
        },
      });

      await this.client.finishSpan(request);

      console.log('[ParallaxService] Transaction trace finished:', {
        txId,
        traceId: txInfo.traceId,
        success: options.success,
        txHash: txInfo.txHash,
      });

      // Remove from active transactions
      this.activeTransactions.delete(txId);
    } catch (error) {
      console.error('[ParallaxService] Failed to finish transaction trace:', error);
    }
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
