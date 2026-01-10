# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Browser SDK for the Parallax tracing platform using gRPC-Web to communicate with the Parallax Gateway API. Published as `@miradorlabs/parallax-web`.

## Commands

```bash
npm run build          # Build ESM, UMD, and type definitions via Rollup
npm test               # Run Jest tests
npm run test:watch     # Run tests in watch mode
npm run lint           # Lint src/ and tests/
npm run lint:fix       # Lint and auto-fix
```

## Architecture

```
src/
├── index.ts              # Re-exports from parallax/
└── parallax/
    ├── index.ts          # Public exports
    ├── client.ts         # ParallaxClient - main entry point, holds gRPC client
    ├── trace.ts          # ParallaxTrace - fluent builder with flush logic
    ├── types.ts          # TypeScript interfaces (TraceOptions, ChainName, etc.)
    └── metadata.ts       # Browser metadata detection utilities
```

### Key Classes

**ParallaxClient** (`client.ts`)
- Creates gRPC-Web client for Parallax Gateway
- `trace(options?)` returns a `ParallaxTrace` builder
- `_sendTrace()` / `_updateTrace()` are internal methods called by trace

**ParallaxTrace** (`trace.ts`)
- Fluent builder: `addAttribute()`, `addEvent()`, `addTags()`, `addTxHint()`
- Manages pending state and flush queue for strict ordering
- `flush()` sends `CreateTrace` (first call) or `UpdateTrace` (subsequent)
- Auto-flush mode: debounced timer resets on each SDK call
- `flushPeriod: 0` means immediate flush on every call

### Proto Dependency

The gRPC types come from `mirador-gateway-parallax-web` (private package). Key imports:
- `CreateTraceRequest`, `UpdateTraceRequest`, `TraceData`
- `Attributes`, `Tags`, `Event`, `TxHashHint`, `Chain`

## Build Output

- `dist/index.esm.js` - ES modules
- `dist/index.umd.js` - UMD for browsers
- `dist/index.d.ts` - TypeScript declarations
