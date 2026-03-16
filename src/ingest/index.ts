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
export { Web3Plugin, SafePlugin, chainIdToName, HintType } from '@miradorlabs/plugins';
export type {
  Web3PluginOptions,
  Web3Methods,
  SafeMethods,
  MiradorPlugin,
  TraceContext,
  PluginSetupResult,
  FlushBuilder,
  MergedPluginMethods,
  HintDataMap,
  HintTypeName,
  ChainName,
  TxHashHint,
  SafeMsgHintData,
  SafeTxHintData,
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
