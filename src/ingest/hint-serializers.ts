/**
 * Hint serializer registry for web SDK (protobuf.js class-based API).
 * Maps hint type strings to functions that serialize hint data into FlushTraceData.
 */
import {
  FlushTraceData,
  TxHashHint as TxHashHintProto,
  SafeMsgHint as SafeMsgHintProto,
  SafeTxHint as SafeTxHintProto,
  RelayHint as RelayHintProto,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { HintType } from '@miradorlabs/plugins';
import type { HintDataMap } from '@miradorlabs/plugins';
import { Chain as ProtoChain } from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
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
    const hintMsg = new TxHashHintProto();
    hintMsg.setTxHash(hint.txHash);
    hintMsg.setChain(resolveProtoChain(hint.chain));
    hintMsg.setChainId(hint.chain);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setTxHashHints(hintMsg);
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

  [HintType.RELAY_QUOTE]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.RELAY_QUOTE];
    const hintMsg = new RelayHintProto();
    hintMsg.setRequestId(hint.requestId);
    hintMsg.setDetails(encodeRelayQuoteDetails(hint));
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    const plugin = new FlushTraceData.Plugin();
    plugin.setRelayHints(hintMsg);
    traceData.addPlugins(plugin);
  },
};

/**
 * Encode a RelayQuoteHintData snapshot into the snake_case JSON payload the
 * relayhint backend processor expects in `RelayHint.details`. Only fields
 * with values are emitted, but `origin_chain_id` and `dest_chain_id` are
 * always included (the processor rejects payloads without them). Keys
 * mirror `recoveryQuoteDetails` in mirador-platform.
 */
function encodeRelayQuoteDetails(
  hint: HintDataMap[typeof HintType.RELAY_QUOTE],
): string {
  const payload: Record<string, string | number> = {
    origin_chain_id: Number(hint.originChainId),
    dest_chain_id: Number(hint.destChainId),
  };
  if (hint.orderId) payload.order_id = hint.orderId;
  if (hint.onChainId) payload.on_chain_id = hint.onChainId;
  if (hint.originChainName) payload.origin_chain_name = hint.originChainName;
  if (hint.destChainName) payload.dest_chain_name = hint.destChainName;
  if (hint.originCurrency) payload.origin_currency = hint.originCurrency;
  if (hint.destCurrency) payload.dest_currency = hint.destCurrency;
  if (hint.depositor) payload.depositor = hint.depositor;
  if (hint.recipient) payload.recipient = hint.recipient;
  if (hint.solverAddress) payload.solver_address = hint.solverAddress;
  if (hint.depositoryAddress) payload.depository_address = hint.depositoryAddress;
  if (hint.originAmount) payload.origin_amount = hint.originAmount;
  if (hint.destExpectedAmount) payload.dest_expected_amount = hint.destExpectedAmount;
  if (hint.destMinimumAmount) payload.dest_minimum_amount = hint.destMinimumAmount;
  return JSON.stringify(payload);
}
