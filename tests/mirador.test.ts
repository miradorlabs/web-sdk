// Mirador Client and Mirador Trace Unit Tests
import { Client, Trace, captureStackTrace, chainIdToName, MiradorProvider } from '../src/ingest';
import type { StackTrace, EIP1193Provider, TransactionRequest } from '../src/ingest';
import { IngestGatewayServiceClient } from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb';
import { CreateTraceRequest, Chain } from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/ingest_gateway_pb';
import { ResponseStatus } from 'mirador-gateway-ingest-web/proto/gateway/common/v1/status_pb';

// Mock the gRPC-Web client
jest.mock('mirador-gateway-ingest-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb');

// Mock fetch for IP lookup
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ ip: '192.168.1.1' }),
});

// Helper to flush microtasks
const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve as never));

// Helper to flush pending promises (includes microtasks + macrotasks)
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Setup browser mocks
beforeAll(() => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 Chrome/120.0.0.0',
    configurable: true,
  });
  Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
  Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
  Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
  Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });
});

describe('Client', () => {
  let mockCreateTrace: jest.Mock;
  let mockUpdateTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-123',
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    mockUpdateTrace = jest.fn().mockResolvedValue({
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
      updateTrace: mockUpdateTrace,
    }));
  });

  describe('constructor', () => {
    it('should create a Client instance with API key', () => {
      const client = new Client('my-api-key');
      expect(client).toBeInstanceOf(Client);
      expect(client.apiKey).toBe('my-api-key');
    });

    it('should use default gateway URL when not provided', () => {
      const client = new Client('my-api-key');
      expect(client.apiUrl).toBe('https://ingest.mirador.org:443');
    });

    it('should use custom gateway URL when provided', () => {
      const customUrl = 'https://custom-gateway.example.com:443';
      const client = new Client('my-api-key', { apiUrl: customUrl });
      expect(client.apiUrl).toBe(customUrl);
    });

    it('should initialize gRPC client with credentials', () => {
      const apiKey = 'test-key';
      new Client(apiKey);

      expect(IngestGatewayServiceClient).toHaveBeenCalledWith(
        'https://ingest.mirador.org:443',
        { 'x-ingest-api-key': apiKey }
      );
    });
  });

  describe('trace()', () => {
    it('should return a Trace instance', () => {
      const client = new Client('test-key');
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace).toBeInstanceOf(Trace);
    });

    it('should work without options', () => {
      const client = new Client('test-key');
      const trace = client.trace();
      expect(trace).toBeInstanceOf(Trace);
    });
  });
});

describe('Trace', () => {
  let client: Client;
  let mockCreateTrace: jest.Mock;
  let mockUpdateTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-456',
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    mockUpdateTrace = jest.fn().mockResolvedValue({
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
      updateTrace: mockUpdateTrace,
    }));

    client = new Client('test-api-key');
  });

  describe('builder methods (chaining)', () => {
    it('addAttribute() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addAttribute('key', 'value')).toBe(trace);
    });

    it('addAttributes() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addAttributes({ key1: 'value1' })).toBe(trace);
    });

    it('addTag() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addTag('tag1')).toBe(trace);
    });

    it('addTags() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addTags(['tag1', 'tag2'])).toBe(trace);
    });

    it('addEvent() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addEvent('event_name')).toBe(trace);
    });

    it('addTxHint() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addTxHint('0x123', 'ethereum')).toBe(trace);
    });

    it('should support fluent API pattern', () => {
      const trace = client.trace({ name: 'TestTrace' })
        .addAttribute('from', '0xabc')
        .addAttributes({ value: '100' })
        .addTag('transaction')
        .addTags(['ethereum'])
        .addEvent('started')
        .addTxHint('0x123', 'ethereum');

      expect(trace).toBeInstanceOf(Trace);
    });
  });

  describe('flush()', () => {


    it('should set trace name in CreateTraceRequest', async () => {
      const trace = client.trace({ name: 'MyTraceName' })
        .addAttribute('key', 'value');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('MyTraceName');
    });

    it('should include attributes in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addAttribute('key1', 'value1')
        .addAttribute('key2', 'value2');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const attrsList = data!.getAttributesList();
      const attrsMap = attrsList[0].getAttributesMap();
      expect(attrsMap.get('key1')).toBe('value1');
      expect(attrsMap.get('key2')).toBe('value2');
    });

    it('should include tags in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTags(['tag1', 'tag2']);

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const tagsList = data!.getTagsList();
      expect(tagsList[0].getTagsList()).toEqual(['tag1', 'tag2']);
    });

    it('should include events in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addEvent('event1', 'details1')
        .addEvent('event2', { key: 'value' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const events = data!.getEventsList();
      // First event is "trace init", followed by user events
      expect(events.length).toBe(3);
      expect(events[0].getName()).toBe('trace init');
      expect(events[1].getName()).toBe('event1');
      expect(events[2].getName()).toBe('event2');
    });

    it('should include txHashHints in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xabc123', 'ethereum')
        .addTxHint('0xdef456', 'polygon');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const hints = data!.getTxHashHintsList();
      expect(hints.length).toBe(2);
      expect(hints[0].getTxHash()).toBe('0xabc123');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
      expect(hints[1].getTxHash()).toBe('0xdef456');
      expect(hints[1].getChain()).toBe(Chain.CHAIN_POLYGON);
    });

    it('should set traceId after successful CreateTrace', async () => {
      const trace = client.trace({ name: 'TestTrace' })
        .addAttribute('key', 'value');

      expect(trace.getTraceId()).toBeNull();
      trace.flush();
      await flushPromises();
      expect(trace.getTraceId()).toBe('trace-456');
    });
  });

  describe('addTxInputData', () => {
    it('should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addTxInputData('0x1234')).toBe(trace);
    });

    it('should add an event with the correct name and input data', async () => {
      const inputData = '0xa9059cbb0000000000000000000000001234567890abcdef';
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxInputData(inputData);

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      // Events: trace init + tx input data
      expect(events.length).toBe(2);
      expect(events[0].getName()).toBe('trace init');
      expect(events[1].getName()).toBe('Tx input data');
      expect(events[1].getDetails()).toBe(inputData);
    });

    it('should work alongside other builder methods', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addAttribute('wallet', '0xabc')
        .addTxHint('0x123', 'ethereum')
        .addTxInputData('0xa9059cbb00000000')
        .addTag('bridge');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const attrsMap = data!.getAttributesList()[0].getAttributesMap();
      expect(attrsMap.get('wallet')).toBe('0xabc');
      expect(data!.getTxHashHintsList().length).toBe(1);
      expect(data!.getTagsList()[0].getTagsList()).toContain('bridge');

      // Events: trace init + tx input data
      const events = data!.getEventsList();
      const txInputEvent = events.find(e => e.getName() === 'Tx input data');
      expect(txInputEvent).toBeDefined();
      expect(txInputEvent!.getDetails()).toBe('0xa9059cbb00000000');
    });
  });

  describe('stack trace features', () => {
    it('addStackTrace() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addStackTrace('checkpoint')).toBe(trace);
    });

    it('addExistingStackTrace() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      const mockStack: StackTrace = {
        frames: [{ functionName: 'test', fileName: 'test.ts', lineNumber: 1, columnNumber: 1 }],
        raw: 'test stack',
      };
      expect(trace.addExistingStackTrace(mockStack)).toBe(trace);
    });

    it('should add stack trace via addStackTrace method', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addStackTrace('checkpoint', { stage: 'validation' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      // First event is "trace init", second is the user's stack trace event
      expect(events[0].getName()).toBe('trace init');
      expect(events[1].getName()).toBe('checkpoint');

      const details = JSON.parse(events[1].getDetails());
      expect(details.stage).toBe('validation');
      expect(details.stackTrace).toBeDefined();
    });

    it('should add existing stack trace', async () => {
      const capturedStack = captureStackTrace();
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addExistingStackTrace(capturedStack, 'deferred_trace', { reason: 'async' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      // First event is "trace init", second is the user's existing stack trace event
      expect(events[0].getName()).toBe('trace init');
      expect(events[1].getName()).toBe('deferred_trace');

      const details = JSON.parse(events[1].getDetails());
      expect(details.reason).toBe('async');
      expect(details.stackTrace.frames).toEqual(capturedStack.frames);
    });
  });

  describe('error handling', () => {
    it('should handle CreateTrace failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCreateTrace.mockRejectedValue(new Error('Connection failed'));

      const trace = client.trace({ name: 'TestTrace', maxRetries: 0 })
        .addAttribute('key', 'value');

      trace.flush();
      await flushPromises();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('microtask batching (auto-flush)', () => {
    it('should batch synchronous calls into a single flush', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      // Multiple synchronous calls
      trace.addAttribute('a', '1');
      trace.addAttribute('b', '2');
      trace.addAttribute('c', '3');

      // Not yet flushed (still in same microtask)
      expect(mockCreateTrace).not.toHaveBeenCalled();

      // Wait for microtask to execute
      await flushMicrotasks();
      await flushPromises();

      // Should have been batched into a single CreateTrace call
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      // Verify all attributes were included
      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const attrsMap = data!.getAttributesList()[0].getAttributesMap();
      expect(attrsMap.get('a')).toBe('1');
      expect(attrsMap.get('b')).toBe('2');
      expect(attrsMap.get('c')).toBe('3');
    });

    it('should batch chained method calls into a single API request', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      // Chained fluent API calls
      trace
        .addAttribute('wallet', '0xabc')
        .addAttribute('amount', '100')
        .addTag('transfer')
        .addEvent('initiated');

      // Not yet flushed
      expect(mockCreateTrace).not.toHaveBeenCalled();

      await flushMicrotasks();
      await flushPromises();

      // Single batched request
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      // Verify all data was included in the single request
      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const attrsMap = data!.getAttributesList()[0].getAttributesMap();
      expect(attrsMap.get('wallet')).toBe('0xabc');
      expect(attrsMap.get('amount')).toBe('100');
      expect(data!.getTagsList()[0].getTagsList()).toContain('transfer');
      // Events: trace init + initiated
      const eventNames = data!.getEventsList().map(e => e.getName());
      expect(eventNames).toContain('trace init');
      expect(eventNames).toContain('initiated');
    });

    it('should batch different operation types together', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      trace.addAttribute('key', 'value');
      trace.addTag('tag1');
      trace.addEvent('event1');
      trace.addTxHint('0x123', 'ethereum');

      expect(mockCreateTrace).not.toHaveBeenCalled();

      await flushMicrotasks();
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      expect(data!.getAttributesList().length).toBe(1);
      expect(data!.getTagsList().length).toBe(1);
      // Events: 1 for trace init + 1 user event
      expect(data!.getEventsList().length).toBe(2);
      expect(data!.getTxHashHintsList().length).toBe(1);
    });

    it('should flush immediately when flush() is called manually', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      trace.addAttribute('a', '1');
      trace.flush(); // Manual flush

      // Flush is fire-and-forget but queues the request
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple flushes across different microtask cycles', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      // First batch
      trace.addAttribute('a', '1');
      await flushMicrotasks();
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      // Second batch (after trace is created, should use UpdateTrace)
      trace.addAttribute('b', '2');
      await flushMicrotasks();
      await flushPromises();

      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending microtask flush when manual flush is called', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      trace.addAttribute('a', '1');
      // Microtask is now scheduled

      trace.flush(); // Manual flush - should clear the microtask flag
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      // The scheduled microtask should run but find nothing to flush
      await flushMicrotasks();
      await flushPromises();

      // Still only one call
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('addTxHint with TxHintOptions', () => {
    it('should accept string details (backwards compatible)', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xabc', 'ethereum', 'simple string');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getDetails()).toBe('simple string');
    });

    it('should accept TxHintOptions with input', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xabc', 'ethereum', { input: '0xa9059cbb...' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      const inputEvent = events.find(e => e.getName() === 'Tx input data');
      expect(inputEvent).toBeDefined();
      expect(inputEvent!.getDetails()).toBe('0xa9059cbb...');
    });

    it('should accept TxHintOptions with input and details', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xabc', 'ethereum', { input: '0xa9059cbb...', details: 'swap' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      const inputEvent = events.find(e => e.getName() === 'Tx input data');
      expect(inputEvent).toBeDefined();
      expect(inputEvent!.getDetails()).toBe('0xa9059cbb...');
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getDetails()).toBe('swap');
    });
  });

  describe('addSafeMsgHint', () => {
    it('should add a safe message hint with chain and message hash', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addSafeMsgHint('0xmsgHash123', 'ethereum');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getSafeMsgHintsList();
      expect(hints).toHaveLength(1);
      expect(hints[0].getMessageHash()).toBe('0xmsgHash123');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
    });

    it('should add a safe message hint with details', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addSafeMsgHint('0xmsgHash456', 'polygon', 'multisig approval');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getSafeMsgHintsList();
      expect(hints[0].getMessageHash()).toBe('0xmsgHash456');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_POLYGON);
      expect(hints[0].getDetails()).toBe('multisig approval');
    });

    it('should support multiple safe message hints', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addSafeMsgHint('0xmsg1', 'ethereum')
        .addSafeMsgHint('0xmsg2', 'base', 'second hint');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getSafeMsgHintsList();
      expect(hints).toHaveLength(2);
      expect(hints[0].getMessageHash()).toBe('0xmsg1');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
      expect(hints[1].getMessageHash()).toBe('0xmsg2');
      expect(hints[1].getChain()).toBe(Chain.CHAIN_BASE);
      expect(hints[1].getDetails()).toBe('second hint');
    });

    it('should handle different chain names', async () => {
      const chainTests: Array<{ chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism' | 'bsc'; expected: Chain }> = [
        { chain: 'ethereum', expected: Chain.CHAIN_ETHEREUM },
        { chain: 'polygon', expected: Chain.CHAIN_POLYGON },
        { chain: 'arbitrum', expected: Chain.CHAIN_ARBITRUM },
        { chain: 'base', expected: Chain.CHAIN_BASE },
        { chain: 'optimism', expected: Chain.CHAIN_OPTIMISM },
        { chain: 'bsc', expected: Chain.CHAIN_BSC },
      ];

      for (const { chain, expected } of chainTests) {
        mockCreateTrace.mockClear();
        mockCreateTrace.mockResolvedValue({
          getTraceId: () => 'trace-456',
          getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
        });

        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
          .addSafeMsgHint('0xmsg', chain);

        trace.flush();
        await flushPromises();

        const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
        const hints = request.getData()!.getSafeMsgHintsList();
        expect(hints[0].getChain()).toBe(expected);
      }
    });

    it('should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addSafeMsgHint('0xmsg', 'ethereum')).toBe(trace);
    });

    it('should work alongside txHashHints and other builder methods', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addAttribute('safe_address', '0x1234')
        .addTag('multisig')
        .addEvent('proposed', 'token transfer')
        .addTxHint('0xtx123', 'ethereum')
        .addSafeMsgHint('0xmsg123', 'ethereum', 'approval');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getData()!.getTxHashHintsList()).toHaveLength(1);
      const safeMsgHints = request.getData()!.getSafeMsgHintsList();
      expect(safeMsgHints).toHaveLength(1);
      expect(safeMsgHints[0].getMessageHash()).toBe('0xmsg123');
      expect(safeMsgHints[0].getDetails()).toBe('approval');
    });
  });

  describe('addTx', () => {
    it('should extract hash and chain from TransactionLike', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTx({ hash: '0xabc', chainId: 1 });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getTxHash()).toBe('0xabc');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
    });

    it('should extract input data from tx.data (ethers v5 style)', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTx({ hash: '0xabc', chainId: 1, data: '0xa9059cbb...' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      const inputEvent = events.find(e => e.getName() === 'Tx input data');
      expect(inputEvent).toBeDefined();
      expect(inputEvent!.getDetails()).toBe('0xa9059cbb...');
    });

    it('should extract input data from tx.input (ethers v6 / viem style)', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTx({ hash: '0xabc', chainId: 137, input: '0xdeadbeef' });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getChain()).toBe(Chain.CHAIN_POLYGON);
      const events = request.getData()!.getEventsList();
      const inputEvent = events.find(e => e.getName() === 'Tx input data');
      expect(inputEvent).toBeDefined();
      expect(inputEvent!.getDetails()).toBe('0xdeadbeef');
    });

    it('should accept explicit chain parameter over chainId', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTx({ hash: '0xabc', chainId: 1 }, 'polygon');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getChain()).toBe(Chain.CHAIN_POLYGON);
    });

    it('should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.addTx({ hash: '0xabc', chainId: 1 })).toBe(trace);
    });
  });

  describe('setProvider and sendTransaction', () => {
    let mockProvider: EIP1193Provider;

    beforeEach(() => {
      mockProvider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0x1';
          if (args.method === 'eth_sendTransaction') return '0xtxhash123';
          return null;
        }),
      };
    });

    it('setProvider should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.setProvider(mockProvider)).toBe(trace);
    });

    it('setProvider should cache chain ID from provider', async () => {
      const trace = client.trace({ name: 'TestTrace' });
      trace.setProvider(mockProvider);
      await flushPromises();
      expect(trace.getProviderChain()).toBe('ethereum');
    });

    it('sendTransaction should send tx and capture events', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(mockProvider);
      await flushPromises(); // wait for chain ID resolution

      const txRequest: TransactionRequest = {
        from: '0xsender',
        to: '0xreceiver',
        data: '0xa9059cbb0000',
        value: '0x0',
        chainId: 1,
      };

      const txHash = await trace.sendTransaction(txRequest);
      expect(txHash).toBe('0xtxhash123');

      expect(mockProvider.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'eth_sendTransaction' })
      );
    });

    it('sendTransaction should throw if no provider', async () => {
      const trace = client.trace({ name: 'TestTrace' });
      await expect(
        trace.sendTransaction({ from: '0x1' })
      ).rejects.toThrow('[MiradorTrace] No provider configured');
    });

    it('sendTransaction should capture error events on failure', async () => {
      const errorProvider: EIP1193Provider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0x1';
          if (args.method === 'eth_sendTransaction') throw new Error('User rejected');
          return null;
        }),
      };

      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(errorProvider);
      await flushPromises();

      await expect(
        trace.sendTransaction({ from: '0x1', chainId: 1 })
      ).rejects.toThrow('User rejected');
    });

    it('sendTransaction should accept provider as parameter', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });

      const txHash = await trace.sendTransaction(
        { from: '0xsender', chainId: 1 },
        mockProvider
      );
      expect(txHash).toBe('0xtxhash123');
    });
  });

  describe('resolveChain', () => {
    it('should prefer explicit chain parameter', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.resolveChain('polygon', 1)).toBe('polygon');
    });

    it('should fall back to chainId', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(trace.resolveChain(undefined, 137)).toBe('polygon');
    });

    it('should fall back to provider chain', async () => {
      const mockProvider: EIP1193Provider = {
        request: jest.fn().mockResolvedValue('0x1'),
      };
      const trace = client.trace({ name: 'TestTrace' });
      trace.setProvider(mockProvider);
      await flushPromises();
      expect(trace.resolveChain()).toBe('ethereum');
    });

    it('should throw if chain cannot be determined', () => {
      const trace = client.trace({ name: 'TestTrace' });
      expect(() => trace.resolveChain()).toThrow('[MiradorTrace] Cannot determine chain');
    });
  });

  describe('backwards compatibility', () => {
    it('Client constructor without provider works with just key', () => {
      const c = new Client('key');
      expect(c).toBeInstanceOf(Client);
      expect(c.apiKey).toBe('key');
    });

    it('Client constructor without provider works with apiUrl option', () => {
      const c = new Client('key', { apiUrl: 'https://custom.example.com' });
      expect(c).toBeInstanceOf(Client);
      expect(c.apiUrl).toBe('https://custom.example.com');
    });

    it('trace() without options returns Trace instance', () => {
      const trace = client.trace();
      expect(trace).toBeInstanceOf(Trace);
    });

    it('trace() with only legacy options works', () => {
      const trace = client.trace({
        name: 'x',
        includeUserMeta: false,
        maxRetries: 2,
        retryBackoff: 500,
        autoClose: false,
      });
      expect(trace).toBeInstanceOf(Trace);
    });

    it('addTxHint with no options produces correct proto', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xhash', 'ethereum');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints.length).toBe(1);
      expect(hints[0].getTxHash()).toBe('0xhash');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
      expect(hints[0].getDetails()).toBeFalsy();
    });

    it('addTxHint with string details produces raw string details', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xhash', 'ethereum', 'swap tx');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getDetails()).toBe('swap tx');
    });

    it('addTxHint with undefined options produces no details', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxHint('0xhash', 'base', undefined);

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const hints = request.getData()!.getTxHashHintsList();
      expect(hints[0].getTxHash()).toBe('0xhash');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_BASE);
      expect(hints[0].getDetails()).toBeFalsy();
    });

    it('addTxInputData still works', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addTxInputData('0xabcd');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      expect(events.length).toBe(2);
      expect(events[0].getName()).toBe('trace init');
      expect(events[1].getName()).toBe('Tx input data');
      expect(events[1].getDetails()).toBe('0xabcd');
    });

    it('full legacy workflow sends all data in CreateTraceRequest', async () => {
      const trace = client.trace({ name: 'swap', includeUserMeta: false })
        .addAttribute('user', '0x1')
        .addTag('dex')
        .addEvent('started', 'details')
        .addTxHint('0xhash', 'ethereum', 'swap tx')
        .addTxInputData('0xdata');

      trace.flush();
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('swap');

      const data = request.getData()!;

      // Attributes
      const attrsMap = data.getAttributesList()[0].getAttributesMap();
      expect(attrsMap.get('user')).toBe('0x1');

      // Tags
      expect(data.getTagsList()[0].getTagsList()).toContain('dex');

      // Events: trace init, started, Tx input data
      const events = data.getEventsList();
      expect(events.length).toBe(3);
      expect(events[0].getName()).toBe('trace init');
      expect(events[1].getName()).toBe('started');
      expect(events[1].getDetails()).toBe('details');
      expect(events[2].getName()).toBe('Tx input data');
      expect(events[2].getDetails()).toBe('0xdata');

      // Tx hints with raw string details
      const hints = data.getTxHashHintsList();
      expect(hints.length).toBe(1);
      expect(hints[0].getTxHash()).toBe('0xhash');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
      expect(hints[0].getDetails()).toBe('swap tx');
    });

    it('legacy chaining with update calls UpdateTrace for new data', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addAttribute('a', '1');

      trace.flush();
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(trace.getTraceId()).toBe('trace-456');

      // Add more data after creation
      trace.addAttribute('b', '2').addEvent('phase2');
      trace.flush();
      await flushPromises();

      expect(mockUpdateTrace).toHaveBeenCalled();
      // Find the update call that contains our data (manual flush may cancel microtask, or both may fire)
      const updateCalls = mockUpdateTrace.mock.calls;
      const allUpdateEvents = updateCalls.flatMap((call: unknown[]) => {
        const req = call[0] as { getData: () => { getEventsList: () => Array<{ getName: () => string }> } | null };
        return req.getData()?.getEventsList() ?? [];
      });
      const allUpdateAttrs = updateCalls.flatMap((call: unknown[]) => {
        const req = call[0] as { getData: () => { getAttributesList: () => Array<{ getAttributesMap: () => Map<string, string> }> } | null };
        return req.getData()?.getAttributesList() ?? [];
      });
      const eventNames = allUpdateEvents.map((e: { getName: () => string }) => e.getName());
      expect(eventNames).toContain('phase2');
      const hasAttrB = allUpdateAttrs.some((a: { getAttributesMap: () => Map<string, string> }) => a.getAttributesMap().get('b') === '2');
      expect(hasAttrB).toBe(true);
    });

    it('closed trace ignores new method calls', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
        .addAttribute('a', '1');

      trace.flush();
      await flushPromises();

      await trace.close('done');

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // These should be ignored without throwing
      trace.addAttribute('b', '2');
      trace.addTag('ignored');
      trace.addEvent('ignored');
      trace.addTxHint('0x', 'ethereum');
      trace.flush();

      // setProvider should still work (it doesn't check closed)
      // sendTransaction should still throw about provider, not about closed
      expect(trace.isClosed()).toBe(true);

      warnSpy.mockRestore();
    });
  });

  describe('cross-SDK trace ID sharing', () => {
    // Re-create mock with keepAlive/closeTrace so resumed-trace keep-alive and close tests work
    beforeEach(() => {
      (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
        createTrace: mockCreateTrace,
        updateTrace: mockUpdateTrace,
        keepAlive: jest.fn().mockResolvedValue({ getAccepted: () => true }),
        closeTrace: jest.fn().mockResolvedValue({ getAccepted: () => true }),
      }));
      client = new Client('test-api-key');
    });

    // Use fake timers to prevent keep-alive intervals from causing test timeouts
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    describe('setTraceId()', () => {
      it('should return this for chaining', () => {
        const trace = client.trace({ name: 'TestTrace' });
        expect(trace.setTraceId('external-trace-123')).toBe(trace);
      });

      it('should set the trace ID', () => {
        const trace = client.trace({ name: 'TestTrace' });
        trace.setTraceId('external-trace-123');
        expect(trace.getTraceId()).toBe('external-trace-123');
      });

      it('should cause first flush to send UpdateTrace instead of CreateTrace', async () => {
        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
        trace.setTraceId('external-trace-123');

        trace.addAttribute('key', 'value');
        trace.flush();
        await jest.advanceTimersByTimeAsync(0);

        expect(mockCreateTrace).not.toHaveBeenCalled();
        expect(mockUpdateTrace).toHaveBeenCalledTimes(1);

        const request = mockUpdateTrace.mock.calls[0][0];
        expect(request.getTraceId()).toBe('external-trace-123');
      });

      it('should be ignored when trace is closed', async () => {
        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
          .addAttribute('key', 'value');

        trace.flush();
        await jest.advanceTimersByTimeAsync(0);

        await trace.close('done');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        trace.setTraceId('should-be-ignored');
        expect(warnSpy).toHaveBeenCalledWith('[MiradorTrace] Trace is closed, ignoring setTraceId');
        // Trace ID should remain as set by CreateTrace, not the new value
        expect(trace.getTraceId()).toBe('trace-456');
        warnSpy.mockRestore();
      });

      it('should be ignored when trace ID is already set via CreateTrace', async () => {
        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
          .addAttribute('key', 'value');

        trace.flush();
        await jest.advanceTimersByTimeAsync(0);

        expect(trace.getTraceId()).toBe('trace-456');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        trace.setTraceId('should-be-ignored');
        expect(warnSpy).toHaveBeenCalledWith('[MiradorTrace] Trace ID is already set, ignoring setTraceId');
        expect(trace.getTraceId()).toBe('trace-456');
        warnSpy.mockRestore();
      });

      it('should be ignored when trace ID is already set via setTraceId', () => {
        const trace = client.trace({ name: 'TestTrace' });
        trace.setTraceId('first-id');

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        trace.setTraceId('second-id');
        expect(warnSpy).toHaveBeenCalledWith('[MiradorTrace] Trace ID is already set, ignoring setTraceId');
        expect(trace.getTraceId()).toBe('first-id');
        warnSpy.mockRestore();
      });

      it('should include pending data in the UpdateTrace request', async () => {
        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
        trace.setTraceId('external-trace-123');

        trace
          .addAttribute('wallet', '0xabc')
          .addTag('resumed')
          .addEvent('backend_handoff')
          .addTxHint('0x123', 'ethereum');

        trace.flush();
        await jest.advanceTimersByTimeAsync(0);

        expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
        const request = mockUpdateTrace.mock.calls[0][0];
        const data = request.getData();

        const attrsMap = data.getAttributesList()[0].getAttributesMap();
        expect(attrsMap.get('wallet')).toBe('0xabc');
        expect(data.getTagsList()[0].getTagsList()).toContain('resumed');

        const eventNames = data.getEventsList().map((e: { getName: () => string }) => e.getName());
        expect(eventNames).toContain('trace init');
        expect(eventNames).toContain('backend_handoff');

        expect(data.getTxHashHintsList()[0].getTxHash()).toBe('0x123');
      });

      it('should start keep-alive after first successful UpdateTrace', async () => {
        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
        trace.setTraceId('external-trace-123');

        trace.addAttribute('key', 'value');
        trace.flush();

        // Advance past the flush (0ms) then past the keep-alive interval (15s)
        await jest.advanceTimersByTimeAsync(15000);

        // The keep-alive mock should have been called
        const results = (IngestGatewayServiceClient as jest.Mock).mock.results;
        const mockInstance = results[results.length - 1].value;
        expect(mockInstance.keepAlive).toHaveBeenCalled();
      });
    });

    describe('traceId option in client.trace()', () => {
      it('should pre-set the trace ID', () => {
        const trace = client.trace({ name: 'TestTrace', traceId: 'option-trace-id' });
        expect(trace.getTraceId()).toBe('option-trace-id');
      });

      it('should cause first flush to send UpdateTrace', async () => {
        const trace = client.trace({ name: 'TestTrace', traceId: 'option-trace-id', includeUserMeta: false })
          .addAttribute('key', 'value');

        trace.flush();
        await jest.advanceTimersByTimeAsync(0);

        expect(mockCreateTrace).not.toHaveBeenCalled();
        expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
      });

      it('should prevent setTraceId from overriding', () => {
        const trace = client.trace({ name: 'TestTrace', traceId: 'option-trace-id' });

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        trace.setTraceId('override-attempt');
        expect(trace.getTraceId()).toBe('option-trace-id');
        warnSpy.mockRestore();
      });

      it('should work without traceId option (normal CreateTrace flow)', async () => {
        const trace = client.trace({ name: 'TestTrace', includeUserMeta: false })
          .addAttribute('key', 'value');

        expect(trace.getTraceId()).toBeNull();
        trace.flush();
        await jest.advanceTimersByTimeAsync(0);

        expect(mockCreateTrace).toHaveBeenCalledTimes(1);
        expect(mockUpdateTrace).not.toHaveBeenCalled();
        expect(trace.getTraceId()).toBe('trace-456');
      });
    });
  });

  describe('provider configuration', () => {
    let ethProvider: EIP1193Provider;
    let polygonProvider: EIP1193Provider;

    beforeEach(() => {
      ethProvider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0x1';
          if (args.method === 'eth_sendTransaction') return '0xtxhash_eth';
          return null;
        }),
      };

      polygonProvider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0x89';
          if (args.method === 'eth_sendTransaction') return '0xtxhash_poly';
          return null;
        }),
      };
    });

    it('provider from ClientOptions flows to trace', async () => {
      const clientWithProvider = new Client('test-key', { provider: ethProvider });
      const trace = clientWithProvider.trace({ name: 'TestTrace', includeUserMeta: false });
      await flushPromises();
      expect(trace.getProviderChain()).toBe('ethereum');
    });

    it('provider from TraceOptions overrides ClientOptions', async () => {
      const clientWithProvider = new Client('test-key', { provider: ethProvider });
      const trace = clientWithProvider.trace({ name: 'TestTrace', includeUserMeta: false, provider: polygonProvider });
      await flushPromises();
      expect(trace.getProviderChain()).toBe('polygon');
    });

    it('setProvider overrides TraceOptions provider', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false, provider: polygonProvider });
      await flushPromises();
      expect(trace.getProviderChain()).toBe('polygon');

      trace.setProvider(ethProvider);
      await flushPromises();
      expect(trace.getProviderChain()).toBe('ethereum');
    });

    it('setProvider with failing eth_chainId leaves providerChain null', async () => {
      const failingProvider: EIP1193Provider = {
        request: jest.fn().mockRejectedValue(new Error('RPC error')),
      };

      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(failingProvider);
      await flushPromises();

      expect(trace.getProviderChain()).toBeNull();
    });

    it('setProvider with unknown chain ID leaves providerChain null', async () => {
      const unknownChainProvider: EIP1193Provider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0xffffff';
          return null;
        }),
      };

      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(unknownChainProvider);
      await flushPromises();

      expect(trace.getProviderChain()).toBeNull();
    });

    it('sendTransaction serializes bigint values correctly', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(ethProvider);
      await flushPromises();

      await trace.sendTransaction({
        from: '0xsender',
        to: '0xreceiver',
        value: BigInt('1000000000000000000'),
        gas: BigInt(21000),
        maxFeePerGas: BigInt(20000000000),
        chainId: 1,
      });

      const sendCall = (ethProvider.request as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { method: string }).method === 'eth_sendTransaction'
      );
      expect(sendCall).toBeDefined();
      const params = sendCall[0].params[0];
      expect(params.value).toBe('0x' + BigInt('1000000000000000000').toString(16));
      expect(params.gas).toBe('0x' + BigInt(21000).toString(16));
      expect(params.maxFeePerGas).toBe('0x' + BigInt(20000000000).toString(16));
    });

    it('sendTransaction captures tx:send event', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(ethProvider);
      await flushPromises();

      await trace.sendTransaction({
        from: '0xsender',
        to: '0xreceiver',
        data: '0xa9059cbb0000000000',
        value: '0x0',
        chainId: 1,
      });

      trace.flush();
      await flushPromises();

      // First flush is CreateTrace (auto-flush from setProvider chain resolution may have triggered)
      // Find the request that has our events
      const allCalls = [...mockCreateTrace.mock.calls, ...mockUpdateTrace.mock.calls];
      const allEvents = allCalls.flatMap((call) => {
        const req = call[0];
        return req.getData()?.getEventsList() ?? [];
      });

      const txSendEvent = allEvents.find((e: { getName: () => string }) => e.getName() === 'tx:send');
      expect(txSendEvent).toBeDefined();
      const details = JSON.parse(txSendEvent!.getDetails());
      expect(details.to).toBe('0xreceiver');
      expect(details.value).toBe('0x0');
      expect(details.data).toBe('0xa9059cbb...');
    });

    it('sendTransaction captures tx:sent event with hash', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(ethProvider);
      await flushPromises();

      const txHash = await trace.sendTransaction({
        from: '0xsender',
        to: '0xreceiver',
        chainId: 1,
      });

      expect(txHash).toBe('0xtxhash_eth');

      trace.flush();
      await flushPromises();

      const allCalls = [...mockCreateTrace.mock.calls, ...mockUpdateTrace.mock.calls];
      const allEvents = allCalls.flatMap((call) => {
        const req = call[0];
        return req.getData()?.getEventsList() ?? [];
      });

      const txSentEvent = allEvents.find((e: { getName: () => string }) => e.getName() === 'tx:sent');
      expect(txSentEvent).toBeDefined();
      const details = JSON.parse(txSentEvent!.getDetails());
      expect(details.txHash).toBe('0xtxhash_eth');
    });

    it('sendTransaction captures tx:error with code and data', async () => {
      const errorObj = new Error('user rejected') as Error & { code: number; data: string };
      errorObj.code = 4001;
      errorObj.data = '0xrevertdata';

      const errorProvider: EIP1193Provider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0x1';
          if (args.method === 'eth_sendTransaction') throw errorObj;
          return null;
        }),
      };

      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(errorProvider);
      await flushPromises();

      await expect(
        trace.sendTransaction({ from: '0xsender', chainId: 1 })
      ).rejects.toThrow('user rejected');

      trace.flush();
      await flushPromises();

      const allCalls = [...mockCreateTrace.mock.calls, ...mockUpdateTrace.mock.calls];
      const allEvents = allCalls.flatMap((call) => {
        const req = call[0];
        return req.getData()?.getEventsList() ?? [];
      });

      const txErrorEvent = allEvents.find((e: { getName: () => string }) => e.getName() === 'tx:error');
      expect(txErrorEvent).toBeDefined();
      const details = JSON.parse(txErrorEvent!.getDetails());
      expect(details.message).toBe('user rejected');
      expect(details.code).toBe(4001);
      expect(details.data).toBe('0xrevertdata');
    });

    it('sendTransaction preserves original error object', async () => {
      const originalError = new Error('original error');
      const errorProvider: EIP1193Provider = {
        request: jest.fn().mockImplementation(async (args) => {
          if (args.method === 'eth_chainId') return '0x1';
          if (args.method === 'eth_sendTransaction') throw originalError;
          return null;
        }),
      };

      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(errorProvider);
      await flushPromises();

      try {
        await trace.sendTransaction({ from: '0xsender', chainId: 1 });
        fail('should have thrown');
      } catch (err) {
        expect(err).toBe(originalError);
      }
    });

    it('multiple sendTransaction calls on same trace produce all events', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(ethProvider);
      await flushPromises();

      await trace.sendTransaction({ from: '0xsender', to: '0xreceiverA', chainId: 1 });
      await trace.sendTransaction({ from: '0xsender', to: '0xreceiverB', chainId: 1 });

      trace.flush();
      await flushPromises();

      const allCalls = [...mockCreateTrace.mock.calls, ...mockUpdateTrace.mock.calls];
      const allEvents = allCalls.flatMap((call) => {
        const req = call[0];
        return req.getData()?.getEventsList() ?? [];
      });

      const txSendEvents = allEvents.filter((e: { getName: () => string }) => e.getName() === 'tx:send');
      const txSentEvents = allEvents.filter((e: { getName: () => string }) => e.getName() === 'tx:sent');
      expect(txSendEvents.length).toBe(2);
      expect(txSentEvents.length).toBe(2);
    });

    it('sendTransaction with data longer than 10 chars truncates in tx:send event', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(ethProvider);
      await flushPromises();

      await trace.sendTransaction({
        from: '0xsender',
        to: '0xreceiver',
        data: '0xa9059cbb000000000000000000000000abcdef',
        chainId: 1,
      });

      trace.flush();
      await flushPromises();

      const allCalls = [...mockCreateTrace.mock.calls, ...mockUpdateTrace.mock.calls];
      const allEvents = allCalls.flatMap((call) => {
        const req = call[0];
        return req.getData()?.getEventsList() ?? [];
      });

      const txSendEvent = allEvents.find((e: { getName: () => string }) => e.getName() === 'tx:send');
      expect(txSendEvent).toBeDefined();
      const details = JSON.parse(txSendEvent!.getDetails());
      expect(details.data).toBe('0xa9059cbb...');
      expect(details.data.length).toBeLessThan('0xa9059cbb000000000000000000000000abcdef'.length);
    });

    it('sendTransaction with no data field has undefined data in tx:send event', async () => {
      const trace = client.trace({ name: 'TestTrace', includeUserMeta: false });
      trace.setProvider(ethProvider);
      await flushPromises();

      await trace.sendTransaction({
        from: '0xsender',
        to: '0xreceiver',
        chainId: 1,
      });

      trace.flush();
      await flushPromises();

      const allCalls = [...mockCreateTrace.mock.calls, ...mockUpdateTrace.mock.calls];
      const allEvents = allCalls.flatMap((call) => {
        const req = call[0];
        return req.getData()?.getEventsList() ?? [];
      });

      const txSendEvent = allEvents.find((e: { getName: () => string }) => e.getName() === 'tx:send');
      expect(txSendEvent).toBeDefined();
      const details = JSON.parse(txSendEvent!.getDetails());
      expect(details.data).toBeUndefined();
    });
  });
});

describe('chainIdToName', () => {
  it('should map known chain IDs', () => {
    expect(chainIdToName(1)).toBe('ethereum');
    expect(chainIdToName(137)).toBe('polygon');
    expect(chainIdToName(42161)).toBe('arbitrum');
    expect(chainIdToName(8453)).toBe('base');
    expect(chainIdToName(10)).toBe('optimism');
    expect(chainIdToName(56)).toBe('bsc');
  });

  it('should return undefined for unknown chain IDs', () => {
    expect(chainIdToName(999999)).toBeUndefined();
  });

  it('should handle bigint input', () => {
    expect(chainIdToName(BigInt(1))).toBe('ethereum');
  });

  it('should handle string input', () => {
    expect(chainIdToName('137')).toBe('polygon');
  });

  it('should handle hex string input', () => {
    expect(chainIdToName('0x1')).toBe('ethereum');
  });
});

describe('MiradorProvider', () => {
  let mockClient: Client;
  let mockCreateTrace: jest.Mock;
  let mockUpdateTrace: jest.Mock;
  let mockUnderlying: EIP1193Provider;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-provider-123',
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    mockUpdateTrace = jest.fn().mockResolvedValue({
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
      updateTrace: mockUpdateTrace,
    }));

    mockClient = new Client('test-api-key');

    mockUnderlying = {
      request: jest.fn().mockImplementation(async (args) => {
        if (args.method === 'eth_chainId') return '0x1';
        if (args.method === 'eth_sendTransaction') return '0xtxhash456';
        if (args.method === 'eth_sendRawTransaction') return '0xtxhash456';
        if (args.method === 'eth_blockNumber') return '0x100';
        return null;
      }),
    };
  });

  it('should pass through non-tx methods', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const result = await provider.request({ method: 'eth_blockNumber' });
    expect(result).toBe('0x100');
    expect(mockUnderlying.request).toHaveBeenCalledWith({ method: 'eth_blockNumber' });
  });

  it('should intercept eth_sendTransaction', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const result = await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', to: '0xreceiver', data: '0xdeadbeef', chainId: '0x1' }],
    });
    expect(result).toBe('0xtxhash456');
    expect(mockUnderlying.request).toHaveBeenCalledWith({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', to: '0xreceiver', data: '0xdeadbeef', chainId: '0x1' }],
    });
  });

  it('should intercept eth_sendRawTransaction', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const result = await provider.request({
      method: 'eth_sendRawTransaction',
      params: ['0xrawdata'],
    });
    expect(result).toBe('0xtxhash456');
  });

  it('should re-throw errors from underlying provider', async () => {
    const errorUnderlying: EIP1193Provider = {
      request: jest.fn().mockImplementation(async (args) => {
        if (args.method === 'eth_chainId') return '0x1';
        if (args.method === 'eth_sendTransaction') throw new Error('Tx reverted');
        return null;
      }),
    };

    const provider = new MiradorProvider(errorUnderlying, mockClient);
    await expect(
      provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: '0xsender', chainId: '0x1' }],
      })
    ).rejects.toThrow('Tx reverted');
  });

  it('should use bound trace when provided', async () => {
    const boundTrace = mockClient.trace({ name: 'BoundTrace' });
    const provider = new MiradorProvider(mockUnderlying, mockClient, { trace: boundTrace });

    await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', chainId: '0x1' }],
    });

    // The bound trace should be used (not a new one created)
    // We just verify it doesn't throw
  });

  it('should NOT intercept eth_call', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const result = await provider.request({
      method: 'eth_call',
      params: [{ to: '0xcontract', data: '0xabcd' }, 'latest'],
    });
    expect(result).toBeNull();
    expect(mockUnderlying.request).toHaveBeenCalledWith({
      method: 'eth_call',
      params: [{ to: '0xcontract', data: '0xabcd' }, 'latest'],
    });
  });

  it('should NOT intercept eth_getBalance', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const result = await provider.request({
      method: 'eth_getBalance',
      params: ['0xaddress', 'latest'],
    });
    expect(result).toBeNull();
    expect(mockUnderlying.request).toHaveBeenCalledWith({
      method: 'eth_getBalance',
      params: ['0xaddress', 'latest'],
    });
  });

  it('should NOT intercept eth_estimateGas', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const result = await provider.request({
      method: 'eth_estimateGas',
      params: [{ to: '0xcontract', data: '0xabcd' }],
    });
    expect(result).toBeNull();
    expect(mockUnderlying.request).toHaveBeenCalledWith({
      method: 'eth_estimateGas',
      params: [{ to: '0xcontract', data: '0xabcd' }],
    });
  });

  it('bound trace is reused across multiple sends', async () => {
    const boundTrace = mockClient.trace({ name: 'BoundTrace', includeUserMeta: false });
    const addEventSpy = jest.spyOn(boundTrace, 'addEvent');
    const provider = new MiradorProvider(mockUnderlying, mockClient, { trace: boundTrace });

    await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', chainId: '0x1' }],
    });

    await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', chainId: '0x1' }],
    });

    // addEvent should have been called for both tx:sent events on the same trace
    const txSentCalls = addEventSpy.mock.calls.filter(
      (call) => call[0] === 'tx:sent'
    );
    expect(txSentCalls.length).toBe(2);
    addEventSpy.mockRestore();
  });

  it('without bound trace creates new trace per tx', async () => {
    const traceSpy = jest.spyOn(mockClient, 'trace');
    const provider = new MiradorProvider(mockUnderlying, mockClient);

    await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', chainId: '0x1' }],
    });

    await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', chainId: '0x1' }],
    });

    expect(traceSpy).toHaveBeenCalledTimes(2);
    traceSpy.mockRestore();
  });

  it('traceOptions are passed through when creating new traces', async () => {
    const traceSpy = jest.spyOn(mockClient, 'trace');
    const provider = new MiradorProvider(mockUnderlying, mockClient, {
      traceOptions: { name: 'auto-tx' },
    });

    await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', chainId: '0x1' }],
    });

    expect(traceSpy).toHaveBeenCalledWith({ name: 'auto-tx' });
    traceSpy.mockRestore();
  });

  it('error from underlying for eth_sendRawTransaction is captured and re-thrown', async () => {
    const errorUnderlying: EIP1193Provider = {
      request: jest.fn().mockImplementation(async (args) => {
        if (args.method === 'eth_chainId') return '0x1';
        if (args.method === 'eth_sendRawTransaction') throw new Error('raw tx failed');
        return null;
      }),
    };

    const provider = new MiradorProvider(errorUnderlying, mockClient);
    await expect(
      provider.request({
        method: 'eth_sendRawTransaction',
        params: ['0xrawdata'],
      })
    ).rejects.toThrow('raw tx failed');
  });

  it('params undefined is handled gracefully', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    // eth_sendTransaction with no params - txParams will be undefined
    const result = await provider.request({
      method: 'eth_sendTransaction',
    });
    // Should not crash; underlying still gets called
    expect(result).toBe('0xtxhash456');
  });

  it('underlying request receives unmodified args', async () => {
    const provider = new MiradorProvider(mockUnderlying, mockClient);
    const args = {
      method: 'eth_sendTransaction',
      params: [{ from: '0xsender', to: '0xreceiver', data: '0xdeadbeef', chainId: '0x1' }],
    };
    const argsCopy = JSON.parse(JSON.stringify(args));

    await provider.request(args);

    // Verify the underlying received the exact same args object (not a copy)
    expect(mockUnderlying.request).toHaveBeenCalledWith(args);
    // Verify args were not mutated
    expect(args).toEqual(argsCopy);
  });
});

describe('Resilience', () => {
  let mockCreateTrace: jest.Mock;
  let mockUpdateTrace: jest.Mock;
  let mockKeepAlive: jest.Mock;
  let mockCloseTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-res-123',
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    mockUpdateTrace = jest.fn().mockResolvedValue({
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    mockKeepAlive = jest.fn().mockResolvedValue({ getAccepted: () => true });
    mockCloseTrace = jest.fn().mockResolvedValue({ getAccepted: () => true });

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
      updateTrace: mockUpdateTrace,
      keepAlive: mockKeepAlive,
      closeTrace: mockCloseTrace,
    }));
  });

  // Helper: advance fake timers and drain promise queue
  async function advanceAndFlush(ms: number): Promise<void> {
    jest.advanceTimersByTime(ms);
    // Drain the promise microtask queue multiple times to handle chained promises
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  }

  describe('per-call timeouts', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    it('should timeout a hanging gRPC call', async () => {
      const onError = jest.fn();
      mockCreateTrace.mockReturnValue(new Promise(() => {}));

      const client = new Client('test-key', { callTimeoutMs: 100, onError });
      const trace = client.trace({ name: 'HangTest', includeUserMeta: false, maxRetries: 0 });
      trace.flush();

      // Advance past the timeout and drain promises
      await advanceAndFlush(200);
      await advanceAndFlush(200);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'CreateTrace',
          final: true,
          error: expect.objectContaining({ message: expect.stringContaining('Timeout') }),
        })
      );
    });
  });

  describe('keepAlive resilience', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    it('should skip keepAlive tick if previous is still in-flight', async () => {
      const client = new Client('test-key', { keepAliveIntervalMs: 100 });
      const trace = client.trace({ name: 'InFlight', includeUserMeta: false });
      trace.flush();

      // Let createTrace resolve so keepAlive timer starts
      await advanceAndFlush(10);

      // Make keepAlive hang
      let resolveKeepAlive!: (v: unknown) => void;
      mockKeepAlive.mockReturnValueOnce(new Promise((res) => { resolveKeepAlive = res; }));

      // First tick fires keepAlive (hangs)
      await advanceAndFlush(100);

      // Second tick fires but should skip because first is in-flight
      await advanceAndFlush(100);

      // Only one call should have been made
      expect(mockKeepAlive).toHaveBeenCalledTimes(1);

      // Resolve the hanging keepAlive
      resolveKeepAlive({ getAccepted: () => true });
      await advanceAndFlush(0);
    });

    it('should stop keepAlive after 3 consecutive failures', async () => {
      const onError = jest.fn();
      const client = new Client('test-key', { keepAliveIntervalMs: 100, callTimeoutMs: 5000, onError });
      const trace = client.trace({ name: 'FailStop', includeUserMeta: false });
      trace.flush();

      // Let createTrace resolve
      await advanceAndFlush(10);

      // Make keepAlive fail immediately
      mockKeepAlive.mockRejectedValue(new Error('network error'));

      // Tick 1, 2, 3 — each fails
      for (let i = 0; i < 3; i++) {
        await advanceAndFlush(100);
      }

      // After 3 failures, the final call should be reported with final: true
      const finalCall = onError.mock.calls.find(
        (c: unknown[]) => (c[0] as { operation: string; final: boolean }).operation === 'KeepAlive' && (c[0] as { final: boolean }).final === true
      );
      expect(finalCall).toBeDefined();

      // 4th tick should not fire (timer stopped)
      mockKeepAlive.mockClear();
      await advanceAndFlush(100);
      expect(mockKeepAlive).not.toHaveBeenCalled();
    });
  });

  describe('close() timeout', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    it('should not hang indefinitely if closeTrace hangs', async () => {
      const client = new Client('test-key');
      const trace = client.trace({ name: 'CloseHang', includeUserMeta: false });
      trace.flush();

      // Let createTrace resolve
      await advanceAndFlush(10);

      // Make closeTrace hang
      mockCloseTrace.mockReturnValue(new Promise(() => {}));

      const closePromise = trace.close('test');

      // Advance past the 3s close timeout (flush queue + close timeout)
      await advanceAndFlush(3500);
      await advanceAndFlush(3500);

      // close() should resolve (not hang)
      await closePromise;
      expect(trace.isClosed()).toBe(true);
    });
  });

  describe('retry budget', () => {
    it('should stop retrying when budget is exhausted', async () => {
      const onError = jest.fn();
      // Fail immediately (no hanging, no timeout needed)
      mockCreateTrace.mockRejectedValue(new Error('fail'));

      const client = new Client('test-key', { callTimeoutMs: 5000, onError });
      const trace = client.trace({
        name: 'BudgetTest',
        includeUserMeta: false,
        maxRetries: 10,
        retryBudgetMs: 600,
        retryBackoff: 200,
      });
      trace.flush();

      // Let all retries run with real timers
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Budget of 600ms with 200ms backoff (200, 400, ...): should only get ~2 retries before budget exhausted
      // So total calls should be first attempt + ~2 retries = ~3, but definitely < 11
      expect(mockCreateTrace.mock.calls.length).toBeLessThan(6);
      expect(mockCreateTrace.mock.calls.length).toBeGreaterThanOrEqual(2);
    }, 10000);
  });

  describe('flush queue depth limit', () => {
    it('should drop flushes when queue is full', async () => {
      const onError = jest.fn();
      // Make createTrace hang so queue fills up
      mockCreateTrace.mockReturnValue(new Promise(() => {}));

      const client = new Client('test-key', { onError });
      const trace = client.trace({ name: 'QueueDepth', includeUserMeta: false });

      // First flush enters the queue (createTrace)
      trace.flush();
      await flushMicrotasks();

      // Add 9 more (total 10 = at cap)
      for (let i = 0; i < 9; i++) {
        trace.addAttribute('key', `value-${i}`);
        trace.flush();
      }

      // 11th flush should be dropped
      trace.addAttribute('key', 'overflow');
      trace.flush();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: expect.stringContaining('queue depth limit') }),
        })
      );
    });
  });

  describe('onError callback', () => {
    it('should call onError instead of console.error on CreateTrace failure', async () => {
      const onError = jest.fn();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCreateTrace.mockRejectedValue(new Error('gRPC down'));

      const client = new Client('test-key', { callTimeoutMs: 5000, onError });
      const trace = client.trace({ name: 'ErrorCb', includeUserMeta: false, maxRetries: 0 });
      trace.flush();

      await flushPromises();

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'CreateTrace',
          final: true,
          traceName: 'ErrorCb',
        })
      );
      // Should NOT have fallen through to console.error for final error
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should fall back to console.error if onError is not set', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCreateTrace.mockRejectedValue(new Error('gRPC down'));

      const client = new Client('test-key', { callTimeoutMs: 5000 });
      const trace = client.trace({ name: 'NoCallback', includeUserMeta: false, maxRetries: 0 });
      trace.flush();

      await flushPromises();

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should not throw if onError throws', async () => {
      const onError = jest.fn().mockImplementation(() => { throw new Error('callback error'); });
      mockCreateTrace.mockRejectedValue(new Error('gRPC down'));

      const client = new Client('test-key', { callTimeoutMs: 5000, onError });
      const trace = client.trace({ name: 'ThrowCb', includeUserMeta: false, maxRetries: 0 });
      trace.flush();

      // Should not throw
      await flushPromises();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('max trace lifetime', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

    it('should auto-close trace after maxTraceLifetimeMs', async () => {
      const client = new Client('test-key', { keepAliveIntervalMs: 1000 });
      const trace = client.trace({
        name: 'LifetimeTest',
        includeUserMeta: false,
        maxTraceLifetimeMs: 5000,
      });
      trace.flush();

      // Let createTrace resolve
      await advanceAndFlush(10);

      expect(trace.isClosed()).toBe(false);

      // Advance past the lifetime — keepAlive fires at 1s intervals, checks lifetime
      await advanceAndFlush(6000);

      expect(trace.isClosed()).toBe(true);
    });
  });
});
