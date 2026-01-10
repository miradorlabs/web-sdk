// ParallaxClient and ParallaxTrace Unit Tests
import { ParallaxClient, ParallaxTrace } from '../src/parallax';
import { ParallaxGatewayServiceClient } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb';
import {
  CreateTraceRequest,
  UpdateTraceRequest,
  Chain,
} from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';
import { ResponseStatus } from 'mirador-gateway-parallax-web/proto/common/v1/status_pb';

// Mock the gRPC-Web client
jest.mock('mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb');

// Mock console to avoid cluttering test output
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Mock fetch for IP lookup
global.fetch = jest.fn();

// Setup browser mock values using Object.defineProperty on navigator
beforeAll(() => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    configurable: true,
  });
  Object.defineProperty(navigator, 'platform', {
    value: 'MacIntel',
    configurable: true,
  });
  Object.defineProperty(navigator, 'language', {
    value: 'en-US',
    configurable: true,
  });

  // Mock window properties
  Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
  Object.defineProperty(window.screen, 'width', { value: 1920, configurable: true });
  Object.defineProperty(window.screen, 'height', { value: 1080, configurable: true });

  // Mock location - need to delete first in jsdom
  // @ts-expect-error - deleting window.location for test mocking
  delete window.location;
  window.location = { href: 'https://example.com/page' } as unknown as Location;

  // Mock document.referrer - need to use a getter
  Object.defineProperty(document, 'referrer', {
    get: () => 'https://google.com',
    configurable: true,
  });

  });

// Helper to mock Intl.DateTimeFormat (needs to be called after jest.useFakeTimers)
function mockIntlDateTimeFormat() {
  const mockDateTimeFormat = {
    resolvedOptions: () => ({ timeZone: 'America/New_York' }),
  };
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => mockDateTimeFormat as unknown as Intl.DateTimeFormat);
}

afterAll(() => {
  mockConsoleError.mockRestore();
});

describe('ParallaxClient', () => {
  let mockCreateTrace: jest.Mock;
  let mockUpdateTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIntlDateTimeFormat();

    // Setup mock for createTrace
    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-123',
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    // Setup mock for updateTrace
    mockUpdateTrace = jest.fn().mockResolvedValue({
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    (ParallaxGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
      updateTrace: mockUpdateTrace,
    }));

    // Mock successful IP fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ip: '192.168.1.1' }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    mockConsoleError.mockClear();
  });

  describe('constructor', () => {
    it('should create a ParallaxClient instance with API key', () => {
      const client = new ParallaxClient('my-api-key');
      expect(client).toBeInstanceOf(ParallaxClient);
      expect(client.apiKey).toBe('my-api-key');
    });

    it('should use default gateway URL when not provided', () => {
      const client = new ParallaxClient('my-api-key');
      expect(client.apiUrl).toBe('https://parallax-gateway-dev.mirador.org:443');
    });

    it('should use custom gateway URL when provided', () => {
      const customUrl = 'https://custom-gateway.example.com:443';
      const client = new ParallaxClient('my-api-key', { apiUrl: customUrl });
      expect(client.apiUrl).toBe(customUrl);
    });

    it('should initialize gRPC client with credentials', () => {
      const apiKey = 'test-key';
      new ParallaxClient(apiKey);

      expect(ParallaxGatewayServiceClient).toHaveBeenCalledWith(
        'https://parallax-gateway-dev.mirador.org:443',
        { 'x-parallax-api-key': apiKey }
      );
    });
  });

  describe('trace()', () => {
    it('should return a ParallaxTrace instance', () => {
      const client = new ParallaxClient('test-key');
      const trace = client.trace({ name: 'TestTrace' });

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });

    it('should work without options', () => {
      const client = new ParallaxClient('test-key');
      const trace = client.trace();

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });

    it('should accept all trace options', () => {
      const client = new ParallaxClient('test-key');
      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        flushPeriod: 100,
        includeClientMeta: false,
      });

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });
  });
});

describe('ParallaxTrace', () => {
  let client: ParallaxClient;
  let mockCreateTrace: jest.Mock;
  let mockUpdateTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIntlDateTimeFormat();

    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-456',
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    mockUpdateTrace = jest.fn().mockResolvedValue({
      getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
    });

    (ParallaxGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
      updateTrace: mockUpdateTrace,
    }));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ip: '192.168.1.1' }),
    });

    client = new ParallaxClient('test-api-key');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('builder methods', () => {
    it('addAttribute() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addAttribute('key', 'value');

      expect(result).toBe(trace);
    });

    it('addAttributes() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addAttributes({ key1: 'value1', key2: 'value2' });

      expect(result).toBe(trace);
    });

    it('addTag() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addTag('tag1');

      expect(result).toBe(trace);
    });

    it('addTags() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addTags(['tag1', 'tag2']);

      expect(result).toBe(trace);
    });

    it('addEvent() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addEvent('event_name');

      expect(result).toBe(trace);
    });

    it('addEvent() should accept object details', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addEvent('event_name', { key: 'value' });

      expect(result).toBe(trace);
    });

    it('addTxHint() should return this for chaining', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addTxHint('0x123', 'ethereum');

      expect(result).toBe(trace);
    });

    it('addAttribute() should accept and stringify objects', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false });
      const result = trace.addAttribute('data', { nested: 'value', count: 42 });

      expect(result).toBe(trace);
    });

    it('should support fluent API pattern', () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('from', '0xabc')
        .addAttribute('to', '0xdef')
        .addAttributes({ value: '100', gas: '21000' })
        .addTag('transaction')
        .addTags(['ethereum', 'send'])
        .addEvent('started')
        .addEvent('completed', { success: true })
        .addTxHint('0x123', 'ethereum');

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });
  });

  describe('flush() - manual mode', () => {
    it('should call CreateTrace on first flush', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockUpdateTrace).not.toHaveBeenCalled();
    });

    it('should call UpdateTrace on subsequent flushes', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      trace.addEvent('new_event');
      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
    });

    it('should set trace name in CreateTraceRequest', async () => {
      const trace = client.trace({ name: 'MyTraceName', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('MyTraceName');
    });

    it('should include TraceData with attributes', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
        .addAttribute('key1', 'value1')
        .addAttribute('key2', 'value2');

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      expect(data).toBeDefined();

      const attrsList = data!.getAttributesList();
      expect(attrsList.length).toBe(1);

      const attrsMap = attrsList[0].getAttributesMap();
      expect(attrsMap.get('key1')).toBe('value1');
      expect(attrsMap.get('key2')).toBe('value2');
    });

    it('should include tags in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
        .addTags(['tag1', 'tag2', 'tag3']);

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const tagsList = data!.getTagsList();
      expect(tagsList.length).toBe(1);
      expect(tagsList[0].getTagsList()).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should include events in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
        .addEvent('event1', 'details1')
        .addEvent('event2', { key: 'value' });

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const events = data!.getEventsList();
      expect(events.length).toBe(2);
      expect(events[0].getName()).toBe('event1');
      expect(events[1].getName()).toBe('event2');
    });

    it('should include multiple txHashHints in TraceData', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
        .addTxHint('0xabc123', 'ethereum', 'first tx')
        .addTxHint('0xdef456', 'polygon', 'second tx');

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const hints = data!.getTxHashHintsList();
      expect(hints.length).toBe(2);
      expect(hints[0].getTxHash()).toBe('0xabc123');
      expect(hints[0].getChain()).toBe(Chain.CHAIN_ETHEREUM);
      expect(hints[1].getTxHash()).toBe('0xdef456');
      expect(hints[1].getChain()).toBe(Chain.CHAIN_POLYGON);
    });

    it('should include client metadata by default', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('custom', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const attrsList = data!.getAttributesList();
      expect(attrsList.length).toBe(1);

      const attrsMap = attrsList[0].getAttributesMap();
      expect(attrsMap.get('custom')).toBe('value');
      expect(attrsMap.get('client.browser')).toBe('Chrome');
      expect(attrsMap.get('client.os')).toBe('macOS');
    });

    it('should not include client metadata when disabled', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, includeClientMeta: false })
        .addAttribute('custom', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const data = request.getData();
      const attrsList = data!.getAttributesList();
      const attrsMap = attrsList[0].getAttributesMap();

      expect(attrsMap.get('custom')).toBe('value');
      expect(attrsMap.get('client.browser')).toBeUndefined();
    });

    it('should set traceId after successful CreateTrace', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      expect(trace.getTraceId()).toBeNull();

      trace.flush();
      await jest.runAllTimersAsync();

      expect(trace.getTraceId()).toBe('trace-456');
    });

    it('should maintain strict ordering of flushes', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('first', 'value');

      trace.flush();
      trace.addEvent('second');
      trace.flush();
      trace.addEvent('third');
      trace.flush();

      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockUpdateTrace).toHaveBeenCalledTimes(2);
    });
  });

  describe('auto-flush mode', () => {
    it('should auto-flush after flushPeriod of inactivity', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: true, flushPeriod: 50, includeClientMeta: false })
        .addAttribute('key', 'value');

      expect(mockCreateTrace).not.toHaveBeenCalled();

      // Advance time past flushPeriod
      jest.advanceTimersByTime(50);
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on each SDK call', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: true, flushPeriod: 50, includeClientMeta: false });

      trace.addAttribute('key1', 'value1');
      jest.advanceTimersByTime(30);

      trace.addAttribute('key2', 'value2');
      jest.advanceTimersByTime(30);

      // Should not have flushed yet (timer reset)
      expect(mockCreateTrace).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      await jest.runAllTimersAsync();

      // Now should have flushed with both attributes
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
    });

    it('should allow explicit flush() even when autoFlush is true', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: true, flushPeriod: 50, includeClientMeta: false })
        .addAttribute('key', 'value');

      // Explicit flush before timer expires
      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      // Timer should be cancelled, no duplicate flush
      jest.advanceTimersByTime(100);
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
    });

    it('should call UpdateTrace on subsequent auto-flushes', async () => {
      const trace = client.trace({ name: 'TestTrace', autoFlush: true, flushPeriod: 50, includeClientMeta: false })
        .addAttribute('key', 'value');

      jest.advanceTimersByTime(50);
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      trace.addEvent('new_event');
      jest.advanceTimersByTime(50);
      await jest.runAllTimersAsync();

      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('immediate flush mode (flushPeriod: 0)', () => {
    it('should flush immediately on every SDK call', async () => {
      const trace = client.trace({ name: 'TestTrace', flushPeriod: 0, includeClientMeta: false });

      trace.addAttribute('key1', 'value1');
      await jest.runAllTimersAsync();
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      trace.addAttribute('key2', 'value2');
      await jest.runAllTimersAsync();
      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);

      trace.addEvent('event1');
      await jest.runAllTimersAsync();
      expect(mockUpdateTrace).toHaveBeenCalledTimes(2);
    });

    it('should send each SDK call as a separate request', async () => {
      const trace = client.trace({ name: 'TestTrace', flushPeriod: 0, includeClientMeta: false });

      trace.addAttribute('first', 'value');
      await jest.runAllTimersAsync();

      trace.addTxHint('0xabc', 'ethereum');
      await jest.runAllTimersAsync();

      trace.addEvent('done');
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockUpdateTrace).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should log error on CreateTrace failure after retries', async () => {
      mockCreateTrace.mockRejectedValue(new Error('Connection failed'));

      // Disable retries for faster test
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, maxRetries: 0 })
        .addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ParallaxTrace] CreateTrace error after retries:',
        expect.any(Error)
      );
    });

    it('should log error on UpdateTrace failure after retries', async () => {
      mockUpdateTrace.mockRejectedValue(new Error('Connection failed'));

      // Disable retries for faster test
      const trace = client.trace({ name: 'TestTrace', autoFlush: false, maxRetries: 0 })
        .addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      trace.addEvent('event');
      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ParallaxTrace] UpdateTrace error after retries:',
        expect.any(Error)
      );
    });

    it('should log error on status failure', async () => {
      mockCreateTrace.mockResolvedValue({
        getTraceId: () => '',
        getStatus: () => ({
          getCode: () => ResponseStatus.StatusCode.STATUS_CODE_VALIDATION_ERROR,
          getErrorMessage: () => 'Validation error',
        }),
      });

      const trace = client.trace({ name: 'TestTrace', autoFlush: false })
        .addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ParallaxTrace] CreateTrace failed:',
        'Validation error'
      );
    });
  });

  describe('retry behavior', () => {
    let mockConsoleWarn: jest.SpyInstance;

    beforeEach(() => {
      mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      mockConsoleWarn.mockRestore();
    });

    it('should retry on CreateTrace failure with exponential backoff', async () => {
      // Fail twice, then succeed
      mockCreateTrace
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          getTraceId: () => 'trace-retry-success',
          getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
        });

      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
        maxRetries: 3,
        retryBackoff: 100,
      }).addAttribute('key', 'value');

      trace.flush();

      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0);

      // Wait for first retry (100ms)
      await jest.advanceTimersByTimeAsync(100);

      // Wait for second retry (200ms)
      await jest.advanceTimersByTimeAsync(200);

      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(3);
      expect(trace.getTraceId()).toBe('trace-retry-success');
      expect(mockConsoleWarn).toHaveBeenCalledTimes(2);
    });

    it('should retry on UpdateTrace failure', async () => {
      // First CreateTrace succeeds
      mockCreateTrace.mockResolvedValue({
        getTraceId: () => 'trace-456',
        getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
      });

      // UpdateTrace fails once, then succeeds
      mockUpdateTrace
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
        });

      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
        maxRetries: 2,
        retryBackoff: 50,
      }).addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      trace.addEvent('event');
      trace.flush();

      // Wait for retry
      await jest.advanceTimersByTimeAsync(50);
      await jest.runAllTimersAsync();

      expect(mockUpdateTrace).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries option', async () => {
      mockCreateTrace.mockRejectedValue(new Error('Always fails'));

      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
        maxRetries: 2,
        retryBackoff: 10,
      }).addAttribute('key', 'value');

      trace.flush();

      // Allow all retries to complete
      await jest.advanceTimersByTimeAsync(10);  // First retry
      await jest.advanceTimersByTimeAsync(20);  // Second retry
      await jest.runAllTimersAsync();

      // Initial attempt + 2 retries = 3 total calls
      expect(mockCreateTrace).toHaveBeenCalledTimes(3);
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ParallaxTrace] CreateTrace error after retries:',
        expect.any(Error)
      );
    });

    it('should use default retry options', async () => {
      mockCreateTrace
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          getTraceId: () => 'trace-default',
          getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
        });

      // Use default options (maxRetries: 3, retryBackoff: 1000)
      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
      }).addAttribute('key', 'value');

      trace.flush();

      // First attempt fails
      await jest.advanceTimersByTimeAsync(0);

      // Wait for first retry (1000ms default backoff)
      await jest.advanceTimersByTimeAsync(1000);
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(2);
      expect(trace.getTraceId()).toBe('trace-default');
    });

    it('should disable retries when maxRetries is 0', async () => {
      mockCreateTrace.mockRejectedValue(new Error('Network error'));

      const trace = client.trace({
        name: 'TestTrace',
        autoFlush: false,
        includeClientMeta: false,
        maxRetries: 0,
      }).addAttribute('key', 'value');

      trace.flush();
      await jest.runAllTimersAsync();

      // Only 1 attempt, no retries
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });
  });

  describe('integration test', () => {
    it('should work with real usage pattern - manual flush', async () => {
      const trace = client.trace({ name: 'SendTransaction', autoFlush: false })
        .addAttribute('from', '0xabc123')
        .addAttribute('to', '0xdef456')
        .addAttribute('value', '1.5')
        .addTags(['transaction', 'send', 'ethereum'])
        .addEvent('wallet_connected', { wallet: 'MetaMask' })
        .addEvent('transaction_initiated');

      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(trace.getTraceId()).toBe('trace-456');

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('SendTransaction');

      // Add more data and flush again
      trace.addEvent('transaction_sent', { blockNumber: 12345 })
           .addTxHint('0xtxhash123', 'ethereum');

      trace.flush();
      await jest.runAllTimersAsync();

      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);

      const updateRequest = mockUpdateTrace.mock.calls[0][0] as UpdateTraceRequest;
      expect(updateRequest.getTraceId()).toBe('trace-456');
    });

    it('should work with real usage pattern - auto flush', async () => {
      const trace = client.trace({ name: 'SendTransaction', flushPeriod: 50 })
        .addAttribute('from', '0xabc123')
        .addAttribute('to', '0xdef456')
        .addTags(['transaction', 'ethereum'])
        .addEvent('wallet_connected');

      // Let auto-flush trigger
      jest.advanceTimersByTime(50);
      await jest.runAllTimersAsync();

      expect(mockCreateTrace).toHaveBeenCalledTimes(1);
      expect(trace.getTraceId()).toBe('trace-456');

      // Add more data
      trace.addEvent('transaction_sent')
           .addTxHint('0xtxhash', 'ethereum');

      // Let auto-flush trigger again
      jest.advanceTimersByTime(50);
      await jest.runAllTimersAsync();

      expect(mockUpdateTrace).toHaveBeenCalledTimes(1);
    });
  });
});
