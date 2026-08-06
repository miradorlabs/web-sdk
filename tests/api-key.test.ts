// API key prefix validation (web-sdk)
import { Client, NoopTrace, MiradorApiKeyError, WEB_KEY_PREFIX, SERVER_KEY_PREFIX } from '../src/ingest';
import { IngestGatewayServiceClient } from '@miradorlabs/ingest-grpc-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb';

jest.mock('@miradorlabs/ingest-grpc-web/proto/gateway/ingest/v1/Ingest_gatewayServiceClientPb');

const VALID_KEY = `${WEB_KEY_PREFIX}abc123`;

let mockFlushTrace: jest.Mock;
let mockKeepAlive: jest.Mock;
let mockCloseTrace: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockFlushTrace = jest.fn().mockResolvedValue({});
  mockKeepAlive = jest.fn().mockResolvedValue({});
  mockCloseTrace = jest.fn().mockResolvedValue({});
  (IngestGatewayServiceClient as jest.Mock).mockImplementation(() => ({
    flushTrace: mockFlushTrace,
    keepAlive: mockKeepAlive,
    closeTrace: mockCloseTrace,
  }));
});

describe('accepts a valid web key', () => {
  it('constructs without throwing', () => {
    expect(() => new Client(VALID_KEY)).not.toThrow();
    expect(new Client(VALID_KEY).apiKey).toBe(VALID_KEY);
  });
});

describe('rejects a malformed key', () => {
  it.each([
    ['a bare word', 'not-a-key'],
    ['a truncated key', 'mir_'],
    ['a wrong-product key', 'sk_live_abc123'],
    ['whitespace-wrapped junk', '  garbage  '],
  ])('throws MiradorApiKeyError for %s', (_label, key) => {
    expect(() => new Client(key)).toThrow(MiradorApiKeyError);
    expect(() => new Client(key)).toThrow(/expected it to start with "mir_web_"/);
  });

  it('does not leak the full key in the error message', () => {
    const secretish = 'super-secret-value-that-should-not-appear';
    try {
      new Client(secretish);
      throw new Error('expected constructor to throw');
    } catch (err) {
      expect((err as Error).message).not.toContain(secretish);
      expect((err as Error).message).toContain('(41 chars)');
    }
  });
});

describe('rejects a stringified unset env var', () => {
  it.each(['undefined', 'null'])('throws a targeted error for "%s"', (key) => {
    expect(() => new Client(key)).toThrow(MiradorApiKeyError);
    expect(() => new Client(key)).toThrow(/unset environment variable was stringified/);
  });
});

describe('rejects a server key in the browser', () => {
  it('throws with a credential-exposure message', () => {
    const serverKey = `${SERVER_KEY_PREFIX}abc123`;
    expect(() => new Client(serverKey)).toThrow(MiradorApiKeyError);
    expect(() => new Client(serverKey)).toThrow(/exposed to every visitor/);
  });
});

describe('disables tracing when no key is supplied', () => {
  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('does not throw for %s', (_label, key) => {
    expect(() => new Client(key as unknown as string)).not.toThrow();
  });

  it('warns exactly once via the configured logger', () => {
    const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
    new Client(undefined as unknown as string, { logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('tracing is disabled'));
  });

  it('returns a NoopTrace from trace()', () => {
    const client = new Client(undefined as unknown as string);
    expect(client.trace({ name: 'Test' })).toBeInstanceOf(NoopTrace);
  });

  it('never sends an RPC to the gateway', async () => {
    const client = new Client(undefined as unknown as string);
    const trace = client.trace({ name: 'Test' });
    trace.addTag('x');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFlushTrace).not.toHaveBeenCalled();
    expect(mockKeepAlive).not.toHaveBeenCalled();
    expect(mockCloseTrace).not.toHaveBeenCalled();
  });
});
