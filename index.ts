// Core SDK exports
export { Client, Trace, NoopTrace, Span, MiradorProvider } from './src/ingest';

// Stack trace utilities
export { captureStackTrace, formatStackTrace, formatStackTraceReadable } from './src/ingest';

// Chain utilities
export { toChain, Chain, Severity } from './src/ingest';

// Plugin system
export { Web3Plugin } from './src/ingest';
export type {
  Web3PluginOptions,
  Web3Methods,
  EvmMethods,
  SafeNamespaceMethods,
  SolanaNamespaceMethods,
  RelayNamespaceMethods,
  CantonNamespaceMethods,
} from './src/ingest';
export { HintType } from './src/ingest';
export type {
  MiradorPlugin,
  TraceContext,
  PluginSetupResult,
  FlushBuilder,
  MergedPluginMethods,
  HintDataMap,
  HintTypeName,
} from './src/ingest';

// Metadata utilities
export { getClientMetadata, detectBrowser, detectOS, detectDeviceType } from './src/ingest';

// Types
export type {
  ClientOptions,
  TraceOptions,
  ClientMetadata,
  TraceEvent,
  EvmTxHint,
  SolanaTxHint,
  SafeMsgHintData,
  SafeTxHintData,
  RelayQuoteHintData,
  CantonTxHint,
  ChainName,
  ChainInput,
  AddEventOptions,
  StackFrame,
  StackTrace,
  EIP1193Provider,
  TxHintOptions,
  TransactionLike,
  TransactionRequest,
  MiradorProviderOptions,
  Logger,
  TraceCallbacks,
  SpanStatus,
  SpanOptions,
  SpanEndOptions,
} from './src/ingest';

