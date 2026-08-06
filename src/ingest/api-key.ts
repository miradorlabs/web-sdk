/**
 * API key validation for the Mirador Ingest Gateway.
 *
 * The gateway checks the key prefix *before* it resolves a tenant, so a malformed
 * key is rejected there with no project attached — it surfaces as an anonymous
 * PermissionDenied that cannot be traced back to the caller. Validating in the SDK
 * turns that into an actionable error at construction time instead.
 */

/** Publishable key, safe to ship in a browser bundle. */
export const WEB_KEY_PREFIX = 'mir_web_';

/** Secret key, server-side only. */
export const SERVER_KEY_PREFIX = 'mir_srv_';

/** Thrown when an API key is present but not usable by this SDK. */
export class MiradorApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MiradorApiKeyError';
    // Required for `instanceof` to work when compiled down to ES5.
    Object.setPrototypeOf(this, MiradorApiKeyError.prototype);
  }
}

/** True when a usable key was supplied. Narrows away undefined/null/blank. */
export function hasApiKey(apiKey?: string | null): apiKey is string {
  return typeof apiKey === 'string' && apiKey.trim() !== '';
}

/** Redacted description of a key — safe to put in an error message. */
function describeKey(apiKey: string): string {
  return `${apiKey.slice(0, 4)}… (${apiKey.length} chars)`;
}

/**
 * Assert that `apiKey` is a web key.
 *
 * Server keys are rejected outright rather than passed through: a `mir_srv_`
 * secret in a browser bundle is readable by every visitor, even though the
 * gateway itself would accept it.
 *
 * @throws {MiradorApiKeyError} if the key is not a `mir_web_` key.
 */
export function assertWebApiKey(apiKey: string): void {
  if (apiKey.startsWith(WEB_KEY_PREFIX)) {
    return;
  }

  // An unset env var stringified into the key — the most common cause by far.
  if (apiKey === 'undefined' || apiKey === 'null') {
    throw new MiradorApiKeyError(
      `Mirador API key is the literal string "${apiKey}", which means an unset environment ` +
        `variable was stringified. Set your web API key (starts with "${WEB_KEY_PREFIX}"), ` +
        `or omit the key entirely to disable tracing.`
    );
  }

  if (apiKey.startsWith(SERVER_KEY_PREFIX)) {
    throw new MiradorApiKeyError(
      `Refusing to use a server API key ("${SERVER_KEY_PREFIX}…") in the browser — it would be ` +
        `exposed to every visitor. Use a web key ("${WEB_KEY_PREFIX}…") with @miradorlabs/web-sdk, ` +
        `and keep server keys in @miradorlabs/nodejs-sdk.`
    );
  }

  throw new MiradorApiKeyError(
    `Invalid Mirador API key: expected it to start with "${WEB_KEY_PREFIX}", got ${describeKey(apiKey)}.`
  );
}
