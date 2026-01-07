// ParallaxClient and ParallaxTrace Unit Tests
import { ParallaxClient, ParallaxTrace } from '../src/parallax';
import { ParallaxGatewayServiceClient } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb';
import { CreateTraceRequest, CreateTraceResponse, Chain } from 'mirador-gateway-parallax-web/proto/gateway/parallax/v1/parallax_gateway_pb';

// Mock the gRPC-Web client
jest.mock('mirador-gateway-parallax-web/proto/gateway/parallax/v1/Parallax_gatewayServiceClientPb');

// Mock console.error to avoid cluttering test output
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

// Store original values
const originalUserAgent = navigator.userAgent;
const originalFetch = global.fetch;

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
  // @ts-ignore
  delete window.location;
  window.location = { href: 'https://example.com/page' } as Location;

  // Mock document.referrer - need to use a getter
  Object.defineProperty(document, 'referrer', {
    get: () => 'https://google.com',
    configurable: true,
  });

  // Mock Intl.DateTimeFormat
  const mockDateTimeFormat = {
    resolvedOptions: () => ({ timeZone: 'America/New_York' }),
  };
  jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => mockDateTimeFormat as any);
});

describe('ParallaxClient', () => {
  let mockCreateTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock for createTrace
    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-123',
      getStatus: () => ({ getCode: () => 1 }),
    });

    (ParallaxGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
    }));

    // Mock successful IP fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ip: '192.168.1.1' }),
    });
  });

  afterEach(() => {
    mockConsoleError.mockClear();
    mockConsoleDebug.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('constructor', () => {
    it('should create a ParallaxClient instance with API key', () => {
      const client = new ParallaxClient('my-api-key');
      expect(client).toBeInstanceOf(ParallaxClient);
      expect(client.apiKey).toBe('my-api-key');
    });

    it('should use default gateway URL when not provided', () => {
      const client = new ParallaxClient('my-api-key');
      expect(client.apiUrl).toBe('https://parallax-gateway.dev.mirador.org:443');
    });

    it('should use custom gateway URL when provided', () => {
      const customUrl = 'https://custom-gateway.example.com:443';
      const client = new ParallaxClient('my-api-key', customUrl);
      expect(client.apiUrl).toBe(customUrl);
    });

    it('should initialize gRPC client with credentials', () => {
      const apiKey = 'test-key';
      new ParallaxClient(apiKey);

      expect(ParallaxGatewayServiceClient).toHaveBeenCalledWith(
        'https://parallax-gateway.dev.mirador.org:443',
        { 'x-parallax-api-key': apiKey }
      );
    });

    it('should initialize gRPC client with custom URL and credentials', () => {
      const apiKey = 'test-key';
      const customUrl = 'https://custom.example.com:443';
      new ParallaxClient(apiKey, customUrl);

      expect(ParallaxGatewayServiceClient).toHaveBeenCalledWith(
        customUrl,
        { 'x-parallax-api-key': apiKey }
      );
    });
  });

  describe('trace()', () => {
    it('should return a ParallaxTrace instance', () => {
      const client = new ParallaxClient('test-key');
      const trace = client.trace('TestTrace');

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });

    it('should pass name to ParallaxTrace', () => {
      const client = new ParallaxClient('test-key');
      const trace = client.trace('MyTraceName');

      // The name is stored internally, we can verify by submitting
      expect(trace).toBeInstanceOf(ParallaxTrace);
    });

    it('should pass includeClientMeta flag to ParallaxTrace', () => {
      const client = new ParallaxClient('test-key');
      const trace = client.trace('TestTrace', true);

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });
  });

  describe('createTrace()', () => {
    it('should send CreateTraceRequest to gateway', async () => {
      const client = new ParallaxClient('test-key');
      const request = new CreateTraceRequest();
      request.setName('TestTrace');

      await client.createTrace(request);

      expect(mockCreateTrace).toHaveBeenCalledWith(
        request,
        { 'x-parallax-api-key': 'test-key' }
      );
    });

    it('should include API key in metadata', async () => {
      const client = new ParallaxClient('my-secret-key');
      const request = new CreateTraceRequest();
      request.setName('TestTrace');

      await client.createTrace(request);

      expect(mockCreateTrace).toHaveBeenCalledWith(
        request,
        { 'x-parallax-api-key': 'my-secret-key' }
      );
    });

    it('should return response from gateway', async () => {
      const client = new ParallaxClient('test-key');
      const request = new CreateTraceRequest();
      request.setName('TestTrace');

      const response = await client.createTrace(request);

      expect(response.getTraceId()).toBe('trace-123');
    });

    it('should handle errors and log appropriately', async () => {
      mockCreateTrace.mockRejectedValue(new Error('Connection failed'));

      const client = new ParallaxClient('test-key');
      const request = new CreateTraceRequest();
      request.setName('TestTrace');

      await expect(client.createTrace(request)).rejects.toThrow('Connection failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[ParallaxClient][createTrace] Error:',
        expect.any(Error)
      );
    });
  });

  describe('getClientMetadata()', () => {
    it('should return browser metadata', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.userAgent).toContain('Chrome');
      expect(metadata.language).toBe('en-US');
    });

    it('should detect browser type and version', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.browser).toBe('Chrome');
      expect(metadata.browserVersion).toBeDefined();
    });

    it('should detect OS and version', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.os).toBe('macOS');
      expect(metadata.osVersion).toBeDefined();
    });

    it('should detect device type', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.deviceType).toBe('desktop');
    });

    it('should include screen dimensions', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.screenWidth).toBe('1920');
      expect(metadata.screenHeight).toBe('1080');
      expect(metadata.viewportWidth).toBe('1440');
      expect(metadata.viewportHeight).toBe('900');
    });

    it('should include display info', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.colorDepth).toBeDefined();
      expect(metadata.pixelRatio).toBeDefined();
    });

    it('should include hardware capabilities', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.cpuCores).toBeDefined();
      expect(metadata.touchSupport).toBeDefined();
    });

    it('should include browser state', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.cookiesEnabled).toBeDefined();
      expect(metadata.online).toBeDefined();
    });

    it('should include timezone info', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.timezone).toBe('America/New_York');
      expect(metadata.timezoneOffset).toBeDefined();
    });

    it('should include page context', () => {
      const client = new ParallaxClient('test-key');
      const metadata = client.getClientMetadata();

      expect(metadata.url).toBeDefined();
      expect(metadata.origin).toBeDefined();
      expect(metadata.pathname).toBeDefined();
      expect(metadata.referrer).toBeDefined();
    });
  });

});

describe('ParallaxTrace', () => {
  let client: ParallaxClient;
  let mockCreateTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateTrace = jest.fn().mockResolvedValue({
      getTraceId: () => 'trace-456',
      getStatus: () => ({ getCode: () => 1 }),
    });

    (ParallaxGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      createTrace: mockCreateTrace,
    }));

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ip: '192.168.1.1' }),
    });

    client = new ParallaxClient('test-api-key');
  });

  describe('builder methods', () => {
    it('addAttribute() should return this for chaining', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addAttribute('key', 'value');

      expect(result).toBe(trace);
    });

    it('addAttributes() should return this for chaining', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addAttributes({ key1: 'value1', key2: 'value2' });

      expect(result).toBe(trace);
    });

    it('addTag() should return this for chaining', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addTag('tag1');

      expect(result).toBe(trace);
    });

    it('addTags() should return this for chaining', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addTags(['tag1', 'tag2']);

      expect(result).toBe(trace);
    });

    it('addEvent() should return this for chaining', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addEvent('event_name');

      expect(result).toBe(trace);
    });

    it('addEvent() should accept object details', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addEvent('event_name', { key: 'value' });

      expect(result).toBe(trace);
    });

    it('setTxHint() should return this for chaining', () => {
      const trace = client.trace('TestTrace');
      const result = trace.setTxHint('0x123', 'ethereum');

      expect(result).toBe(trace);
    });

    it('addAttribute() should accept and stringify objects', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addAttribute('data', { nested: 'value', count: 42 });

      expect(result).toBe(trace);
    });

    it('addAttributes() should accept and stringify objects', () => {
      const trace = client.trace('TestTrace');
      const result = trace.addAttributes({
        simple: 'string',
        complex: { nested: true },
      });

      expect(result).toBe(trace);
    });
  });

  describe('optional name', () => {
    it('should allow trace without name', async () => {
      await client.trace()
        .addAttribute('key', 'value')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('');
    });

    it('should allow empty string as name', async () => {
      await client.trace('')
        .addAttribute('key', 'value')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('');
    });
  });

  describe('method chaining', () => {
    it('should support fluent API pattern', () => {
      const trace = client.trace('TestTrace')
        .addAttribute('from', '0xabc')
        .addAttribute('to', '0xdef')
        .addAttributes({ value: '100', gas: '21000' })
        .addTag('transaction')
        .addTags(['ethereum', 'send'])
        .addEvent('started')
        .addEvent('completed', { success: true })
        .setTxHint('0x123', 'ethereum');

      expect(trace).toBeInstanceOf(ParallaxTrace);
    });
  });

  describe('create()', () => {
    it('should create CreateTraceRequest with attributes', async () => {
      await client.trace('TestTrace')
        .addAttribute('key1', 'value1')
        .addAttribute('key2', 'value2')
        .create();

      expect(mockCreateTrace).toHaveBeenCalled();
      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('TestTrace');

      const attrsMap = request.getAttributesMap();
      expect(attrsMap.get('key1')).toBe('value1');
      expect(attrsMap.get('key2')).toBe('value2');
    });

    it('should stringify object attributes in request', async () => {
      await client.trace('TestTrace', false)
        .addAttribute('config', { timeout: 5000, retries: 3 })
        .addAttributes({ data: { nested: 'value' }, count: 42 })
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const attrsMap = request.getAttributesMap();

      expect(attrsMap.get('config')).toBe('{"timeout":5000,"retries":3}');
      expect(attrsMap.get('data')).toBe('{"nested":"value"}');
      expect(attrsMap.get('count')).toBe('42');
    });

    it('should include tags in request', async () => {
      await client.trace('TestTrace')
        .addTags(['tag1', 'tag2', 'tag3'])
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getTagsList()).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should include events in request', async () => {
      await client.trace('TestTrace')
        .addEvent('event1', 'details1')
        .addEvent('event2', { key: 'value' })
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const events = request.getEventsList();
      expect(events.length).toBe(2);
      expect(events[0].getName()).toBe('event1');
      expect(events[1].getName()).toBe('event2');
    });

    it('should include txHashHint when set via setTxHint()', async () => {
      await client.trace('TestTrace')
        .setTxHint('0xabc123', 'ethereum', 'transaction details')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const txHint = request.getTxHashHint();
      expect(txHint).toBeDefined();
      expect(txHint?.getTxHash()).toBe('0xabc123');
      expect(txHint?.getChain()).toBe(Chain.CHAIN_ETHEREUM);
    });

    it('should support different chain names', async () => {
      await client.trace('TestTrace')
        .setTxHint('0xabc123', 'polygon')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const txHint = request.getTxHashHint();
      expect(txHint?.getChain()).toBe(Chain.CHAIN_POLYGON);
    });

    it('should include client metadata by default', async () => {
      await client.trace('TestTrace')  // includeClientMeta defaults to true
        .addAttribute('custom', 'value')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const attrsMap = request.getAttributesMap();

      // Custom attribute should be present
      expect(attrsMap.get('custom')).toBe('value');

      // Client metadata should be prefixed with 'client.'
      expect(attrsMap.get('client.browser')).toBe('Chrome');
      expect(attrsMap.get('client.os')).toBe('macOS');
    });

    it('should not include client metadata when explicitly disabled', async () => {
      await client.trace('TestTrace', false)
        .addAttribute('custom', 'value')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      const attrsMap = request.getAttributesMap();

      expect(attrsMap.get('custom')).toBe('value');
      expect(attrsMap.get('client.browser')).toBeUndefined();
    });

    it('should return response from createTrace', async () => {
      const response = await client.trace('TestTrace').create();

      expect(response.getTraceId()).toBe('trace-456');
    });

    it('should work without txHashHint', async () => {
      await client.trace('TestTrace')
        .addAttribute('key', 'value')
        .create();

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getTxHashHint()).toBeUndefined();
    });
  });

  describe('integration test', () => {
    it('should work with real usage pattern', async () => {
      const response = await client.trace('SendTransaction')  // client metadata included by default
        .addAttribute('from', '0xabc123')
        .addAttribute('to', '0xdef456')
        .addAttribute('value', '1.5')
        .addAttribute('network', 'ethereum')
        .addTags(['transaction', 'send', 'ethereum'])
        .addEvent('wallet_connected', { wallet: 'MetaMask' })
        .addEvent('transaction_initiated')
        .addEvent('transaction_sent', { blockNumber: 12345 })
        .setTxHint('0xtxhash123', 'ethereum')
        .create();

      expect(response.getTraceId()).toBe('trace-456');
      expect(mockCreateTrace).toHaveBeenCalledTimes(1);

      const request = mockCreateTrace.mock.calls[0][0] as CreateTraceRequest;
      expect(request.getName()).toBe('SendTransaction');
      expect(request.getTagsList()).toEqual(['transaction', 'send', 'ethereum']);
      expect(request.getEventsList().length).toBe(3);
      expect(request.getTxHashHint()?.getTxHash()).toBe('0xtxhash123');
      expect(request.getTxHashHint()?.getChain()).toBe(Chain.CHAIN_ETHEREUM);

      const attrsMap = request.getAttributesMap();
      expect(attrsMap.get('from')).toBe('0xabc123');
      expect(attrsMap.get('to')).toBe('0xdef456');
      expect(attrsMap.get('client.browser')).toBe('Chrome');
    });
  });
});
