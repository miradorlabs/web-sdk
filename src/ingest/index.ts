/**
 * Mirador Ingest Web Client SDK
 * Browser SDK for the Mirador tracing platform
 */

// Classes
export { Client } from './client';
export { Trace, NoopTrace } from './trace';
export { MiradorProvider } from './provider';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './stacktrace';

// Plugin system + shared types (re-exported from @miradorlabs/plugins)
export { Web3Plugin, toChain, Chain, Severity, HintType } from '@miradorlabs/plugins';
export type {
  Web3PluginOptions,
  Web3Methods,
  EvmMethods,
  SafeNamespaceMethods,
  SolanaNamespaceMethods,
  RelayNamespaceMethods,
  CantonNamespaceMethods,
  MiradorPlugin,
  TraceContext,
  PluginSetupResult,
  FlushBuilder,
  MergedPluginMethods,
  HintDataMap,
  HintTypeName,
  ChainName,
  ChainInput,
  EvmTxHint,
  SolanaTxHint,
  SafeMsgHintData,
  SafeTxHintData,
  RelayQuoteHintData,
  CantonTxHint,
  EIP1193Provider,
  TxHintOptions,
  TransactionLike,
  TransactionRequest,
  AddEventOptions,
  Logger,
} from '@miradorlabs/plugins';

// SDK-specific types
export type {
  ClientOptions,
  TraceOptions,
  ClientMetadata,
  TraceEvent,
  StackFrame,
  StackTrace,
  MiradorProviderOptions,
  TraceCallbacks,
} from './types';

// Metadata utilities (for advanced usage)
export {
  getClientMetadata,
  detectBrowser,
  detectOS,
  detectDeviceType,
} from './metadata';

// Wallet discovery (for advanced usage outside MiradorProvider)
export { discoverInstalledWallets, identifyProvider } from './wallets';
export type { WalletInfo, WalletDiscovery, EIP6963Announcement } from './wallets';
