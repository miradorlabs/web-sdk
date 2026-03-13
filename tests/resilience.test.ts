// Resilience feature tests for web-sdk
import { Client, Trace, NoopTrace } from '../src/ingest';
import { IngestGatewayServiceClient } from 'mirador-gateway-ingest-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb';
import { ResponseStatus } from 'mirador-gateway-ingest-web/proto/gateway/common/v1/status_pb';

jest.mock('mirador-gateway-ingest-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb');

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ ip: '127.0.0.1' }),
});

beforeAll(() => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 Chrome/120.0.0.0',
    configurable: true,
  });
  Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });
  Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
});

const flushMicrotasks = () => new Promise((resolve) => queueMicrotask(resolve as never));
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

const successResponse = {
  getTraceId: () => 'trace-123',
  getCreated: () => true,
  getStatus: () => ({ getCode: () => ResponseStatus.StatusCode.STATUS_CODE_SUCCESS }),
};

describe('Sampling', () => {
  let mockFlushTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFlushTrace = jest.fn().mockResolvedValue(successResponse);
    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: mockFlushTrace,
    }));
  });

  it('sampleRate 0 should return NoopTrace', () => {
    const client = new Client('key', { sampleRate: 0 });
    const trace = client.trace({ name: 'Test' });
    expect(trace).toBeInstanceOf(NoopTrace);
    expect(trace.getTraceId()).toBe('0'.repeat(32));
  });

  it('sampleRate 1 should return Trace', () => {
    const client = new Client('key', { sampleRate: 1 });
    const trace = client.trace({ name: 'Test' });
    expect(trace).toBeInstanceOf(Trace);
    expect(trace).not.toBeInstanceOf(NoopTrace);
  });

  it('custom sampler returning false should return NoopTrace', () => {
    const client = new Client('key', { sampler: () => false });
    const trace = client.trace({ name: 'Test' });
    expect(trace).toBeInstanceOf(NoopTrace);
  });

  it('custom sampler returning true should return Trace', () => {
    const client = new Client('key', { sampler: () => true });
    const trace = client.trace({ name: 'Test' });
    expect(trace).toBeInstanceOf(Trace);
    expect(trace).not.toBeInstanceOf(NoopTrace);
  });

  it('custom sampler receives trace options', () => {
    const sampler = jest.fn().mockReturnValue(true);
    const client = new Client('key', { sampler });
    client.trace({ name: 'CriticalFlow' });
    expect(sampler).toHaveBeenCalledWith(expect.objectContaining({ name: 'CriticalFlow' }));
  });

  it('sampler takes precedence over sampleRate', () => {
    const client = new Client('key', { sampleRate: 0, sampler: () => true });
    const trace = client.trace({ name: 'Test' });
    expect(trace).toBeInstanceOf(Trace);
    expect(trace).not.toBeInstanceOf(NoopTrace);
  });

  it('invalid sampleRate should throw', () => {
    expect(() => new Client('key', { sampleRate: -0.1 })).toThrow('sampleRate must be between 0 and 1');
    expect(() => new Client('key', { sampleRate: 1.5 })).toThrow('sampleRate must be between 0 and 1');
  });
});

describe('NoopTrace', () => {
  it('all builder methods return this', () => {
    const trace = new NoopTrace();
    expect(trace.addAttribute('k', 'v')).toBe(trace);
    expect(trace.addAttributes({ k: 'v' })).toBe(trace);
    expect(trace.addTag('t')).toBe(trace);
    expect(trace.addTags(['t'])).toBe(trace);
    expect(trace.addEvent('e')).toBe(trace);
    expect(trace.addStackTrace()).toBe(trace);
    expect(trace.addTxHint()).toBe(trace);
    expect(trace.addSafeMsgHint()).toBe(trace);
    expect(trace.addSafeTxHint()).toBe(trace);
    expect(trace.addTxInputData()).toBe(trace);
    expect(trace.addTx()).toBe(trace);
    expect(trace.setProvider()).toBe(trace);
  });

  it('isClosed returns true', () => {
    expect(new NoopTrace().isClosed()).toBe(true);
  });

  it('getTraceId returns sentinel', () => {
    expect(new NoopTrace().getTraceId()).toBe('0'.repeat(32));
  });

  it('close is a no-op', async () => {
    await expect(new NoopTrace().close()).resolves.toBeUndefined();
  });

  it('flush is a no-op', () => {
    new NoopTrace().flush();
  });

  it('sendTransaction returns empty string instead of throwing', async () => {
    const result = await new NoopTrace().sendTransaction();
    expect(result).toBe('');
  });
});

describe('Lifecycle Callbacks', () => {
  let mockFlushTrace: jest.Mock;
  let mockCloseTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFlushTrace = jest.fn().mockResolvedValue(successResponse);
    mockCloseTrace = jest.fn().mockResolvedValue({ getAccepted: () => true });

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: mockFlushTrace,
      closeTrace: mockCloseTrace,
    }));
  });

  it('onCreated is called only on first successful flush', async () => {
    const onCreated = jest.fn();
    const client = new Client('key', { callbacks: { onCreated } });
    const trace = client.trace({ name: 'Test' });

    // First flush — should trigger onCreated
    trace.addEvent('event_1');
    await flushMicrotasks();
    await flushPromises();

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(expect.any(String));

    // Second flush — should NOT trigger onCreated again
    trace.addEvent('event_2');
    trace.flush();
    await flushPromises();

    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('onFlushed is called after successful flush', async () => {
    const onFlushed = jest.fn();
    const client = new Client('key', { callbacks: { onFlushed } });
    const trace = client.trace({ name: 'Test' });

    trace.addEvent('test_event');
    await flushMicrotasks();
    await flushPromises();

    expect(onFlushed).toHaveBeenCalledWith(expect.any(String), expect.any(Number));
  });

  it('onFlushError is called when flush fails after retries', async () => {
    const onFlushError = jest.fn();
    mockFlushTrace.mockRejectedValue(new Error('network error'));

    const client = new Client('key', { callbacks: { onFlushError } });
    const trace = client.trace({ name: 'Test' });
    // Set maxRetries to 0 to avoid retry delays
    (trace as unknown as { maxRetries: number }).maxRetries = 0;

    trace.addEvent('test_event');
    await flushMicrotasks();
    await flushPromises();

    expect(onFlushError).toHaveBeenCalledWith(expect.any(Error), 'FlushTrace');
  });

  it('onClosed is called after close', async () => {
    const onClosed = jest.fn();
    const client = new Client('key', { callbacks: { onClosed } });
    const trace = client.trace({ name: 'Test' });

    // Let initial flush complete
    await flushMicrotasks();
    await flushPromises();

    await trace.close('done');

    expect(onClosed).toHaveBeenCalledWith(expect.any(String), 'done');
  });

  it('onDropped is called when queue is full', () => {
    const onDropped = jest.fn();
    const client = new Client('key', { callbacks: { onDropped } });
    const trace = client.trace({ name: 'Test', maxQueueSize: 5 });

    for (let i = 0; i < 10; i++) {
      trace.addEvent(`event_${i}`);
    }

    expect(onDropped).toHaveBeenCalledWith(1, 'Queue full');
  });

  it('per-trace callbacks override client callbacks', async () => {
    const clientOnFlushed = jest.fn();
    const traceOnFlushed = jest.fn();

    const client = new Client('key', { callbacks: { onFlushed: clientOnFlushed } });
    const trace = client.trace({ name: 'Test', callbacks: { onFlushed: traceOnFlushed } });

    trace.addEvent('test');
    await flushMicrotasks();
    await flushPromises();

    expect(traceOnFlushed).toHaveBeenCalled();
    expect(clientOnFlushed).not.toHaveBeenCalled();
  });
});

describe('Queue Size Limits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: jest.fn().mockResolvedValue(successResponse),
    }));
  });

  it('drops items when queue exceeds maxQueueSize', () => {
    const onDropped = jest.fn();
    const client = new Client('key', { callbacks: { onDropped } });
    const trace = client.trace({ name: 'Test', maxQueueSize: 3 });

    trace.addEvent('e1');
    trace.addEvent('e2');
    trace.addEvent('e3');

    expect(onDropped).toHaveBeenCalledTimes(1);
    expect(onDropped).toHaveBeenCalledWith(1, 'Queue full');
  });
});

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets rateLimitedUntil on RESOURCE_EXHAUSTED (code 8)', async () => {
    const resourceExhausted = Object.assign(new Error('rate limited'), { code: 8 });
    const mockFlushTrace = jest.fn().mockRejectedValue(resourceExhausted);

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: mockFlushTrace,
    }));

    const client = new Client('key');
    const trace = client.trace({ name: 'Test' });
    (trace as unknown as { maxRetries: number }).maxRetries = 0;

    trace.addEvent('test');
    await flushMicrotasks();
    await flushPromises();

    expect((client as unknown as { rateLimitedUntil: number }).rateLimitedUntil).toBeGreaterThan(Date.now() - 1000);
  });
});

describe('Max Trace Lifetime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: jest.fn().mockResolvedValue(successResponse),
      keepAlive: jest.fn().mockResolvedValue({ getAccepted: () => true }),
      closeTrace: jest.fn().mockResolvedValue({ getAccepted: () => true }),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-closes trace after maxTraceLifetimeMs', async () => {
    const client = new Client('key');
    const trace = client.trace({ name: 'Test', maxTraceLifetimeMs: 5000 });

    expect(trace.isClosed()).toBe(false);

    await jest.advanceTimersByTimeAsync(5001);

    expect(trace.isClosed()).toBe(true);
  });

  it('works even when autoKeepAlive is false (resumed trace)', async () => {
    const client = new Client('key');
    const trace = client.trace({
      name: 'Test',
      traceId: 'a'.repeat(32),
      maxTraceLifetimeMs: 3000,
    });

    expect(trace.isClosed()).toBe(false);

    await jest.advanceTimersByTimeAsync(3001);

    expect(trace.isClosed()).toBe(true);
  });

  it('does not fire when maxTraceLifetimeMs is 0 (disabled)', async () => {
    const client = new Client('key');
    const trace = client.trace({ name: 'Test', maxTraceLifetimeMs: 0 });

    await jest.advanceTimersByTimeAsync(60000);

    expect(trace.isClosed()).toBe(false);

    const closePromise = trace.close();
    await jest.advanceTimersByTimeAsync(10000);
    await closePromise;
  });
});

describe('Overflow Batch Splitting', () => {
  let mockFlushTrace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFlushTrace = jest.fn().mockResolvedValue(successResponse);
    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: mockFlushTrace,
    }));
  });

  it('splits large flushes into multiple batches', async () => {
    const client = new Client('key');
    const trace = client.trace({ name: 'Test' });

    for (let i = 0; i < 110; i++) {
      trace.addEvent(`event_${i}`);
    }

    trace.flush();
    await flushPromises();
    await flushMicrotasks();
    await flushPromises();

    expect(mockFlushTrace.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: jest.fn().mockResolvedValue(successResponse),
      closeTrace: jest.fn().mockResolvedValue({ getAccepted: () => true }),
    }));
  });

  it('custom logger receives warning on closed trace', async () => {
    const customLogger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const client = new Client('key', { logger: customLogger });
    const trace = client.trace({ name: 'Test' });

    await flushMicrotasks();
    await flushPromises();

    await trace.close();

    trace.addEvent('should_warn');
    expect(customLogger.warn).toHaveBeenCalledWith(expect.stringContaining('closed'));
  });

  it('default logger is noop (no console output)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const client = new Client('key');
    const trace = client.trace({ name: 'Test' });

    (trace as unknown as { closed: boolean }).closed = true;
    trace.addEvent('ignored');

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

describe('Close drain timeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('logs warning when flush queue drain times out', async () => {
    const customLogger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const mockFlushTrace = jest.fn().mockImplementation(() => new Promise(() => {}));
    (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
      flushTrace: mockFlushTrace,
      closeTrace: jest.fn().mockResolvedValue({ getAccepted: () => true }),
    }));

    const client = new Client('key', { logger: customLogger });
    const trace = client.trace({ name: 'Test' });

    trace.addEvent('test');
    await jest.advanceTimersByTimeAsync(0);

    const closePromise = trace.close('done');

    await jest.advanceTimersByTimeAsync(6000);
    await closePromise;

    expect(customLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Flush queue drain timed out')
    );
  });
});
