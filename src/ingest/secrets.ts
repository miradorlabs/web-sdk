/**
 * Secret detection and obfuscation utilities
 */

// Keys that likely contain secrets (case-insensitive)
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /apikey/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /session/i,
  /cookie/i,
  /bearer/i,
  /jwt/i,
  /oauth/i,
  /refresh/i,
];

// Value patterns that look like secrets
const SENSITIVE_VALUE_PATTERNS = [
  // JWT tokens (header.payload.signature)
  /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  // AWS access keys
  /^AKIA[0-9A-Z]{16}$/,
  // AWS secret keys (40 char base64-ish)
  /^[A-Za-z0-9/+=]{40}$/,
  // Generic API keys (long alphanumeric, 32+ chars)
  /^[A-Za-z0-9_-]{32,}$/,
  // Hex strings that look like secrets (64 chars = 256 bit)
  /^[a-fA-F0-9]{64}$/,
  // Bearer token format
  /^Bearer\s+.+$/i,
  // Private keys
  /^-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
];

const REDACTED = '[REDACTED]';

/**
 * Check if a key name suggests it contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Check if a value looks like a secret
 */
function isSensitiveValue(value: string): boolean {
  if (typeof value !== 'string') return false;
  return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively obfuscate secrets in an object
 * @param obj The object to scan
 * @param depth Current recursion depth (to prevent infinite loops)
 * @returns A new object with secrets redacted
 */
export function obfuscateSecrets(obj: unknown, depth: number = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return isSensitiveValue(obj) ? REDACTED : obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => obfuscateSecrets(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        // Always recurse into nested objects to find secrets within
        result[key] = obfuscateSecrets(value, depth + 1);
      } else if (isSensitiveKey(key)) {
        // Redact any primitive value with a sensitive key
        result[key] = REDACTED;
      } else if (typeof value === 'string') {
        result[key] = isSensitiveValue(value) ? REDACTED : value;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // Functions, symbols, etc. - just return type name
  return `[${typeof obj}]`;
}
