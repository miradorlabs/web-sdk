# Web Parallax Client Setup Summary

This document summarizes the complete configuration and structure of the web-parallax-client SDK.

## Directory Structure

```
web-parallax-client/
├── dist/                          # Build output (generated)
│   ├── index.esm.js              # ES Module bundle
│   ├── index.esm.js.map          # ESM source map
│   ├── index.umd.js              # UMD bundle (browser global)
│   ├── index.umd.js.map          # UMD source map
│   └── index.d.ts                # TypeScript declarations
├── src/
│   ├── grpc/
│   │   └── index.ts              # GrpcWebRpc adapter (uses Fetch API)
│   ├── parallax/
│   │   └── index.ts              # ParallaxClient main class
│   └── helpers/
│       └── index.ts              # Serialization helpers
├── tests/
│   └── parallax.test.ts          # Jest unit tests
├── index.ts                       # Main entry point
├── package.json                   # NPM package configuration
├── tsconfig.json                  # TypeScript config (dev)
├── tsconfig.build.json            # TypeScript config (build)
├── rollup.config.mjs              # Rollup bundler configuration
├── jest.config.ts                 # Jest test configuration
├── eslint.config.js               # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── .nvmrc                         # Node version (22.13.0)
├── .gitignore                     # Git ignore rules
└── README.md                      # User documentation
```

## Key Configuration Files

### package.json

- **Name**: `@miradorlabs/parallax-web`
- **Main Entry Points**:
  - `main`: `dist/index.umd.js` (UMD for Node.js/CommonJS)
  - `module`: `dist/index.esm.js` (ES Module for bundlers)
  - `browser`: `dist/index.umd.js` (Browser global)
  - `types`: `dist/index.d.ts` (TypeScript definitions)
- **Dependencies**:
  - `google-protobuf`: ^4.0.1
  - `mirador-gateway-parallax-web`: grpc-web package from GCS
  - `rxjs`: ^7.8.2
- **Scripts**:
  - `build`: Build all bundles with Rollup
  - `test`: Run Jest tests
  - `test:watch`: Run Jest in watch mode
  - `test:coverage`: Generate coverage report

### rollup.config.mjs

Generates three outputs:

1. **ESM Bundle** (`dist/index.esm.js`)
   - Format: ES Module
   - For modern bundlers (Webpack, Vite, etc.)

2. **UMD Bundle** (`dist/index.umd.js`)
   - Format: UMD
   - Global name: `ParallaxWeb`
   - For browser `<script>` tags

3. **Type Definitions** (`dist/index.d.ts`)
   - TypeScript declarations

All bundles treat external dependencies as external:
- `google-protobuf`
- `mirador-gateway-parallax-web/*`
- `rxjs/*`

### tsconfig.json

- Target: ES2020
- Module: ESNext (for browser)
- Lib: ES2020, DOM, DOM.Iterable
- Strict mode enabled
- Module resolution: bundler

### jest.config.ts

- Preset: ts-jest
- Test environment: **jsdom** (browser simulation)
- Test match: `**/*.test.ts`
- Coverage from `src/**/*.ts`

## Key Differences from nodejs-parallax-client

| Feature | nodejs-parallax-client | web-parallax-client |
|---------|------------------------|---------------------|
| gRPC Library | `@grpc/grpc-js` | Fetch API (gRPC-Web compatible) |
| Transport | Native gRPC | HTTP/HTTPS with gRPC-Web protocol |
| Environment | Node.js | Browser |
| Module System | CommonJS | ESM + UMD |
| Test Environment | Node | jsdom (browser) |
| Connection | Can use insecure | Always uses HTTPS |
| Default URL | localhost:50053 | https://gateway-parallax-dev... |

## Source Files

### src/grpc/index.ts - GrpcWebRpc

Implements the gRPC-Web RPC adapter using browser Fetch API:

- **Unary requests**: Standard HTTP POST with protobuf binary body
- **Server streaming**: Uses ReadableStream from Response.body
- **Headers**: Includes `Content-Type: application/grpc-web+proto`
- **API Key**: Sent as `x-api-key` header
- **Type casting**: `data.buffer as ArrayBuffer` for Fetch compatibility

### src/parallax/index.ts - ParallaxClient

Main SDK client with methods:
- `createTrace()`: Create a new trace
- `startSpan()`: Start a span within a trace
- `finishSpan()`: Finish a span
- `addSpanAttributes()`: Add attributes to a span
- `addSpanEvent()`: Add an event to a span
- `addSpanError()`: Add an error to a span
- `addSpanHint()`: Add a blockchain transaction hint

### tests/parallax.test.ts

Comprehensive test suite covering:
- Client instantiation
- All SDK methods (success and error cases)
- Integration scenarios
- API key handling
- Mock implementation of GrpcWebRpc

## Build Process

```bash
npm run build
```

1. Clears `dist/` directory
2. Runs Rollup with three configurations in parallel:
   - ESM bundle with source maps
   - UMD bundle with source maps
   - TypeScript declarations

Build warnings about `mirador-gateway-parallax-web` imports are **expected** - these are external dependencies resolved at runtime.

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

Tests use:
- **jsdom**: Simulates browser environment
- **ts-jest**: TypeScript transformation
- **Mocking**: GrpcWebRpc is mocked for unit tests

## Publishing

```bash
npm run release:patch   # Bump patch version (1.0.0 -> 1.0.1)
npm run release:minor   # Bump minor version (1.0.0 -> 1.1.0)
npm run release:major   # Bump major version (1.0.0 -> 2.0.0)
```

Versioning automatically:
1. Updates `package.json` version
2. Creates git tag
3. Pushes with `--follow-tags`

## Browser Compatibility

Requires modern browsers supporting:
- ES2020 features
- Fetch API
- Promises
- ReadableStream
- Uint8Array

For older browsers, polyfills may be needed.

## Usage in Browser

### Via NPM/Bundler (Recommended)

```typescript
import { ParallaxClient } from '@miradorlabs/parallax-web';

const client = new ParallaxClient('your-api-key');
```

### Via UMD Script Tag

```html
<script src="node_modules/@miradorlabs/parallax-web/dist/index.umd.js"></script>
<script>
  const client = new ParallaxWeb.ParallaxClient('your-api-key');
</script>
```

## Next Steps

1. **Install dependencies**: Already done (`npm install`)
2. **Build**: Already done (`npm run build`)
3. **Test**: Run `npm test` to verify all tests pass
4. **Customize**: Update `GRPC_GATEWAY_API_URL` in `src/parallax/index.ts` if needed
5. **Publish**: When ready, use `npm run release:patch` to version and publish

## Notes

- The package uses the grpc-web package from GCS: `mirador-gateway-parallax-grpc-web-1.0.9.tgz`
- Type warnings during build about missing type declarations are expected for external packages
- All gRPC-Web requests use the browser's Fetch API, making this SDK compatible with modern web applications
- The SDK maintains the same API surface as the Node.js client for consistency
