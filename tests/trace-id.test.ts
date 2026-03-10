import { generateTraceId } from '../src/ingest/trace-id';

describe('generateTraceId', () => {
  it('returns a 32-character hex string', () => {
    const id = generateTraceId();
    expect(id).toHaveLength(32);
  });

  it('uses only valid hex characters', () => {
    const id = generateTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateTraceId()));
    expect(ids.size).toBe(100);
  });
});
