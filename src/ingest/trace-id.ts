/**
 * Generate a W3C-compatible trace ID (32 lowercase hex chars / 128 bits)
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
