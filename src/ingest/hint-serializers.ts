/**
 * Hint serializer registry for web SDK (protobuf.js class-based API).
 * Maps hint type strings to functions that serialize hint data into FlushTraceData.
 */
import {
  FlushTraceData,
  EvmTxHint as EvmTxHintProto,
  SolanaTxHint as SolanaTxHintProto,
  SafeMsgHint as SafeMsgHintProto,
  SafeTxHint as SafeTxHintProto,
  RelayHint as RelayHintProto,
  CantonTxHint as CantonTxHintProto,
} from '@miradorlabs/ingest-grpc-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { HintType } from '@miradorlabs/plugins';
import type { HintDataMap } from '@miradorlabs/plugins';
import { Chain as ProtoChain } from '@miradorlabs/ingest-grpc-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { CHAIN_MAP } from './chains';

/** A function that serializes hint data into a FlushTraceData proto message */
export type HintSerializer = (traceData: FlushTraceData, data: Record<string, unknown>) => void;

/** Resolve chain with bounds check, falling back to CHAIN_UNSPECIFIED */
function resolveProtoChain(chain: number): ProtoChain {
  return CHAIN_MAP[chain as keyof typeof CHAIN_MAP] ?? ProtoChain.CHAIN_UNSPECIFIED;
}

/** Registry of hint serializers, keyed by hint type string */
export const HINT_SERIALIZERS: Record<string, HintSerializer> = {
  [HintType.TX_HASH]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.TX_HASH];
    const hintMsg = new EvmTxHintProto();
    hintMsg.setTxHash(hint.txHash);
    hintMsg.setChain(resolveProtoChain(hint.chain));
    hintMsg.setChainId(hint.chain);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setEvmTxHints(hintMsg);
    traceData.addPlugins(plugin);
  },

  [HintType.SAFE_MSG]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.SAFE_MSG];
    const hintMsg = new SafeMsgHintProto();
    hintMsg.setMessageHash(hint.messageHash);
    hintMsg.setChain(resolveProtoChain(hint.chain));
    hintMsg.setChainId(hint.chain);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setSafeMsgHints(hintMsg);
    traceData.addPlugins(plugin);
  },

  [HintType.SAFE_TX]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.SAFE_TX];
    const hintMsg = new SafeTxHintProto();
    hintMsg.setSafeTxHash(hint.safeTxHash);
    hintMsg.setChain(resolveProtoChain(hint.chain));
    hintMsg.setChainId(hint.chain);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setSafeTxHints(hintMsg);
    traceData.addPlugins(plugin);
  },

  [HintType.SOLANA_TX]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.SOLANA_TX];
    const hintMsg = new SolanaTxHintProto();
    hintMsg.setSignature(hint.signature);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setSolanaTxHints(hintMsg);
    traceData.addPlugins(plugin);
  },

  [HintType.RELAY_QUOTE]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.RELAY_QUOTE];
    const hintMsg = new RelayHintProto();
    hintMsg.setRequestId(hint.requestId);
    if (hint.message) hintMsg.setDetails(hint.message);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setRelayHints(hintMsg);
    traceData.addPlugins(plugin);
  },

  [HintType.CANTON_TX]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.CANTON_TX];
    const hintMsg = new CantonTxHintProto();
    hintMsg.setUpdateId(hint.updateId);
    if (hint.partyId) hintMsg.setPartyId(hint.partyId);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setCantonTxHints(hintMsg);
    traceData.addPlugins(plugin);
  },
};
