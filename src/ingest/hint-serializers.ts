/**
 * Hint serializer registry for web SDK (protobuf.js class-based API).
 * Maps hint type strings to functions that serialize hint data into TraceData.
 */
import {
  TraceData,
  TxHashHint as TxHashHintProto,
  SafeMsgHint as SafeMsgHintProto,
  SafeTxHint as SafeTxHintProto,
} from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { HintType } from '@miradorlabs/plugins';
import type { HintDataMap } from '@miradorlabs/plugins';
import { CHAIN_MAP } from './chains';

/** A function that serializes hint data into a TraceData proto message */
export type HintSerializer = (traceData: TraceData, data: Record<string, unknown>) => void;

/** Registry of hint serializers, keyed by hint type string */
export const HINT_SERIALIZERS: Record<string, HintSerializer> = {
  [HintType.TX_HASH]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.TX_HASH];
    const hintMsg = new TxHashHintProto();
    hintMsg.setTxHash(hint.txHash);
    hintMsg.setChain(CHAIN_MAP[hint.chain]);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    traceData.addTxHashHints(hintMsg);
  },

  [HintType.SAFE_MSG]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.SAFE_MSG];
    const hintMsg = new SafeMsgHintProto();
    hintMsg.setMessageHash(hint.messageHash);
    hintMsg.setChain(CHAIN_MAP[hint.chain]);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    traceData.addSafeMsgHints(hintMsg);
  },

  [HintType.SAFE_TX]: (traceData, data) => {
    const hint = data as unknown as HintDataMap[typeof HintType.SAFE_TX];
    const hintMsg = new SafeTxHintProto();
    hintMsg.setSafeTxHash(hint.safeTxHash);
    hintMsg.setChain(CHAIN_MAP[hint.chain]);
    if (hint.details) hintMsg.setDetails(hint.details);
    const ts = new Timestamp();
    ts.fromDate(hint.timestamp);
    hintMsg.setTimestamp(ts);
    traceData.addSafeTxHints(hintMsg);
  },
};
