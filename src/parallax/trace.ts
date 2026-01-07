/**
 * ParallaxTrace builder class for constructing traces with method chaining
 */
import {
  CreateTraceRequest,
  CreateTraceResponse,
  Event,
  TxHashHint as TxHashHintProto,
  Chain,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import type { TraceEvent, TxHashHint, ChainName } from './types';
import { getClientMetadata } from './metadata';

/**
 * Maps chain names to proto Chain enum values
 */
const CHAIN_MAP: Record<ChainName, Chain> = {
  ethereum: Chain.CHAIN_ETHEREUM,
  polygon: Chain.CHAIN_POLYGON,
  arbitrum: Chain.CHAIN_ARBITRUM,
  base: Chain.CHAIN_BASE,
  optimism: Chain.CHAIN_OPTIMISM,
  bsc: Chain.CHAIN_BSC,
};

/**
 * Interface for the client that ParallaxTrace uses to submit traces
 */
export interface TraceSubmitter {
  createTrace(params: CreateTraceRequest): Promise<CreateTraceResponse>;
}

/**
 * Builder class for constructing traces with method chaining
 * Automatically handles web-specific features like client metadata
 */
export class ParallaxTrace {
  private name: string;
  private attributes: { [key: string]: string } = {};
  private tags: string[] = [];
  private events: TraceEvent[] = [];
  private txHashHint?: TxHashHint;
  private client: TraceSubmitter;
  private includeClientMeta: boolean;

  constructor(client: TraceSubmitter, name: string = '', includeClientMeta: boolean = true) {
    this.client = client;
    this.name = name;
    this.includeClientMeta = includeClientMeta;
  }

  /**
   * Add an attribute to the trace
   * @param key Attribute key
   * @param value Attribute value (objects are stringified, primitives converted to string)
   * @returns This trace builder for chaining
   */
  addAttribute(key: string, value: string | number | boolean | object): this {
    this.attributes[key] =
      typeof value === 'object' && value !== null
        ? JSON.stringify(value)
        : String(value);
    return this;
  }

  /**
   * Add multiple attributes to the trace
   * @param attributes Object containing key-value pairs (objects are stringified)
   * @returns This trace builder for chaining
   */
  addAttributes(attributes: { [key: string]: string | number | boolean | object }): this {
    for (const [key, value] of Object.entries(attributes)) {
      this.attributes[key] =
        typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value);
    }
    return this;
  }

  /**
   * Add a tag to the trace
   * @param tag Tag to add
   * @returns This trace builder for chaining
   */
  addTag(tag: string): this {
    this.tags.push(tag);
    return this;
  }

  /**
   * Add multiple tags to the trace
   * @param tags Array of tags to add
   * @returns This trace builder for chaining
   */
  addTags(tags: string[]): this {
    this.tags.push(...tags);
    return this;
  }

  /**
   * Add an event to the trace
   * @param eventName Name of the event
   * @param details Optional details (can be a JSON string or object that will be stringified)
   * @param timestamp Optional timestamp (defaults to current time)
   * @returns This trace builder for chaining
   */
  addEvent(eventName: string, details?: string | object, timestamp?: Date): this {
    const detailsString = typeof details === 'object' && details !== null
      ? JSON.stringify(details)
      : details;

    this.events.push({
      eventName,
      details: detailsString,
      timestamp: timestamp || new Date(),
    });
    return this;
  }

  /**
   * Set the transaction hash hint for blockchain correlation
   * @param txHash Transaction hash
   * @param chain Chain name (e.g., "ethereum", "polygon", "base")
   * @param details Optional details about the transaction
   * @returns This trace builder for chaining
   */
  setTxHint(txHash: string, chain: ChainName, details?: string): this {
    this.txHashHint = {
      txHash,
      chain,
      details,
      timestamp: new Date(),
    };
    return this;
  }

  /**
   * Create and submit the trace to the gateway
   * @returns Response from the create trace operation
   */
  async create(): Promise<CreateTraceResponse> {
    // Build the CreateTraceRequest
    const request = new CreateTraceRequest();
    request.setName(this.name);
    request.setTagsList(this.tags);

    // Add attributes
    const attrsMap = request.getAttributesMap();
    for (const [key, value] of Object.entries(this.attributes)) {
      attrsMap.set(key, value);
    }

    // Add client metadata if requested
    if (this.includeClientMeta) {
      const clientMetadata = getClientMetadata();
      for (const [key, value] of Object.entries(clientMetadata)) {
        attrsMap.set(`client.${key}`, value);
      }
    }

    // Add events
    const eventsList: Event[] = [];
    for (const event of this.events) {
      const eventMsg = new Event();
      eventMsg.setName(event.eventName);
      if (event.details) {
        eventMsg.setDetails(event.details);
      }
      const timestamp = new Timestamp();
      timestamp.fromDate(event.timestamp);
      eventMsg.setTimestamp(timestamp);
      eventsList.push(eventMsg);
    }
    request.setEventsList(eventsList);

    // Add transaction hash hint if present
    if (this.txHashHint) {
      const txHint = new TxHashHintProto();
      txHint.setTxHash(this.txHashHint.txHash);
      txHint.setChain(CHAIN_MAP[this.txHashHint.chain]);
      if (this.txHashHint.details) {
        txHint.setDetails(this.txHashHint.details);
      }
      const timestamp = new Timestamp();
      timestamp.fromDate(this.txHashHint.timestamp);
      txHint.setTimestamp(timestamp);
      request.setTxHashHint(txHint);
    }

    return this.client.createTrace(request);
  }
}
