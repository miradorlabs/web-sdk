/**
 * Tests for secret obfuscation utilities
 */
import { obfuscateSecrets } from '../src/ingest/secrets';

describe('Secret Obfuscation', () => {
  describe('sensitive key detection', () => {
    it('should redact values with password keys', () => {
      const obj = { password: 'secret123', username: 'john' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.password).toBe('[REDACTED]');
      expect(result.username).toBe('john');
    });

    it('should redact values with token keys', () => {
      const obj = { authToken: 'abc123', userId: '42' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.authToken).toBe('[REDACTED]');
      expect(result.userId).toBe('42');
    });

    it('should redact values with api_key variations', () => {
      const obj = {
        api_key: 'key1',
        apiKey: 'key2',
        apikey: 'key3',
        'api-key': 'key4',
        name: 'test',
      };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.api_key).toBe('[REDACTED]');
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.apikey).toBe('[REDACTED]');
      expect(result['api-key']).toBe('[REDACTED]');
      expect(result.name).toBe('test');
    });

    it('should redact values with secret keys', () => {
      const obj = { clientSecret: 'shh', publicId: 'pub123' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.clientSecret).toBe('[REDACTED]');
      expect(result.publicId).toBe('pub123');
    });

    it('should redact values with auth keys', () => {
      const obj = { authorization: 'Bearer xyz', data: 'value' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.authorization).toBe('[REDACTED]');
      expect(result.data).toBe('value');
    });

    it('should be case insensitive for key detection', () => {
      const obj = { PASSWORD: 'secret', Token: 'abc', SECRET: 'xyz' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.Token).toBe('[REDACTED]');
      expect(result.SECRET).toBe('[REDACTED]');
    });
  });

  describe('sensitive value detection', () => {
    it('should redact JWT tokens', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const obj = { token: jwt, name: 'test' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.token).toBe('[REDACTED]');
    });

    it('should redact AWS access keys', () => {
      const obj = { key: 'AKIAIOSFODNN7EXAMPLE', name: 'test' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.key).toBe('[REDACTED]');
      expect(result.name).toBe('test');
    });

    it('should redact long alphanumeric strings (32+ chars)', () => {
      const longKey = 'abcdefghijklmnopqrstuvwxyz123456';
      const obj = { data: longKey, shortData: 'abc' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.data).toBe('[REDACTED]');
      expect(result.shortData).toBe('abc');
    });

    it('should redact 64-char hex strings', () => {
      const hexKey = 'a'.repeat(64);
      const obj = { hash: hexKey };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.hash).toBe('[REDACTED]');
    });

    it('should redact Bearer token format', () => {
      const obj = { header: 'Bearer abc123xyz' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.header).toBe('[REDACTED]');
    });

    it('should redact private keys', () => {
      const obj = { key: '-----BEGIN PRIVATE KEY-----\nMIIE...' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.key).toBe('[REDACTED]');
    });
  });

  describe('nested objects', () => {
    it('should recursively obfuscate nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret123',
            apiKey: 'abc123',
          },
        },
      };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      const user = result.user as Record<string, unknown>;
      const credentials = user.credentials as Record<string, unknown>;
      expect(user.name).toBe('John');
      expect(credentials.password).toBe('[REDACTED]');
      expect(credentials.apiKey).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const obj = {
        items: [
          { name: 'item1', secret: 'abc' },
          { name: 'item2', password: 'xyz' },
        ],
      };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      const items = result.items as Array<Record<string, unknown>>;
      expect(items[0].name).toBe('item1');
      expect(items[0].secret).toBe('[REDACTED]');
      expect(items[1].name).toBe('item2');
      expect(items[1].password).toBe('[REDACTED]');
    });

    it('should limit recursion depth', () => {
      let deeply: Record<string, unknown> = { value: 'test' };
      for (let i = 0; i < 15; i++) {
        deeply = { nested: deeply };
      }
      const result = obfuscateSecrets(deeply) as Record<string, unknown>;
      // Should not throw, but deep values may be replaced with max depth marker
      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined', () => {
      expect(obfuscateSecrets(null)).toBeNull();
      expect(obfuscateSecrets(undefined)).toBeUndefined();
    });

    it('should handle primitives', () => {
      expect(obfuscateSecrets(42)).toBe(42);
      expect(obfuscateSecrets(true)).toBe(true);
      expect(obfuscateSecrets('hello')).toBe('hello');
    });

    it('should not redact normal strings', () => {
      const obj = { message: 'Hello world', count: '42' };
      const result = obfuscateSecrets(obj) as Record<string, unknown>;
      expect(result.message).toBe('Hello world');
      expect(result.count).toBe('42');
    });

    it('should handle empty objects and arrays', () => {
      expect(obfuscateSecrets({})).toEqual({});
      expect(obfuscateSecrets([])).toEqual([]);
    });
  });
});
