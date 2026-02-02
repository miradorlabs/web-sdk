// Mirador Client and Mirador Trace Unit Tests
import { Client, Trace, captureStackTrace } from '../src/ingest';
import type { StackTrace } from '../src/ingest';
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

// Helper to flush pending promises
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
      expect(client.apiUrl).toBe('https://ingest-gateway-dev.mirador.org:443');
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
        'https://ingest-gateway-dev.mirador.org:443',
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
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addAttribute('key', 'value')).toBe(trace);
    });

    it('addAttributes() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addAttributes({ key1: 'value1' })).toBe(trace);
    });

    it('addTag() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addTag('tag1')).toBe(trace);
    });

    it('addTags() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addTags(['tag1', 'tag2'])).toBe(trace);
    });

    it('addEvent() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addEvent('event_name')).toBe(trace);
    });

    it('addTxHint() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addTxHint('0x123', 'ethereum')).toBe(trace);
    });

    it('should support fluent API pattern', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
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
    it('should call CreateTrace on first flush', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockUpdateTrace).not.toHaveBeenCalled();
    });

    it('should call UpdateTrace on subsequent flushes', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await flushPromises();
      trace.addEvent('new_event');
      trace.flush();
      await flushPromises();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
    });

    it('should set trace name in CreateTraceRequest', async () => {
      const trace = client.trace({ name: 'MyTraceName', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('MyTraceName');
    });

    it('should include attributes in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
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
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
        .addTags(['tag1', 'tag2']);

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const tagsList = data!.getTagsList();
      expect(tagsList[0].getTagsList()).toEqual(['tag1', 'tag2']);
    });

    it('should include events in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
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
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
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
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      expect(trace.getTraceId()).toBeNull();
      trace.flush();
      await flushPromises();
      expect(trace.getTraceId()).toBe('trace-456');
    });
  });

  describe('stack trace features', () => {
    it('addStackTrace() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      expect(trace.addStackTrace('checkpoint')).toBe(trace);
    });

    it('addExistingStackTrace() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const mockStack: StackTrace = {
        frames: [{ functionName: 'test', fileName: 'test.ts', lineNumber: 1, columnNumber: 1 }],
        raw: 'test stack',
      };
      expect(trace.addExistingStackTrace(mockStack)).toBe(trace);
    });

    it('should add stack trace via addStackTrace method', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
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
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
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

  describe('locals capture', () => {
    it('should include locals in trace init event', async () => {
      const userId = 'user-123';
      const config = { debug: true, timeout: 5000 };

      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
        locals: { userId, config },
      });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      expect(events[0].getName()).toBe('trace init');

      const details = JSON.parse(events[0].getDetails());
      expect(details.locals).toBeDefined();
      expect(details.locals.userId).toBe('user-123');
      expect(details.locals.config.debug).toBe(true);
      expect(details.locals.config.timeout).toBe(5000);
    });

    it('should obfuscate secrets in locals', async () => {
      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
        locals: {
          userId: 'user-123',
          password: 'secret123',
          apiKey: 'my-api-key',
          config: {
            token: 'bearer-token',
            publicId: 'pub-123',
          },
        },
      });

      trace.flush();
      await flushPromises();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getData()!.getEventsList();
      const details = JSON.parse(events[0].getDetails());

      expect(details.locals.userId).toBe('user-123');
      expect(details.locals.password).toBe('[REDACTED]');
      expect(details.locals.apiKey).toBe('[REDACTED]');
      expect(details.locals.config.token).toBe('[REDACTED]');
      expect(details.locals.config.publicId).toBe('pub-123');
    });
  });

  describe('error handling', () => {
    it('should handle CreateTrace failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockCreateTrace.mockRejectedValue(new Error('Connection failed'));

      const trace = client.trace({ name: 'TestTrace', autoFlush: false, maxRetries: 0 })
        .addAttribute('key', 'value');

      trace.flush();
      await flushPromises();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
