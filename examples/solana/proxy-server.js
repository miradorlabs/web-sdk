/**
 * Simple Express proxy server to handle CORS issues
 * Proxies gRPC-Web requests to the Mirador Gateway
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3003;

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://ingest.mirador.org:443';

// Only the local demo page may call the proxy. Override with a
// comma-separated ALLOWED_ORIGINS if you serve the demo elsewhere.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8001,http://127.0.0.1:8001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-grpc-web', 'x-user-agent', 'x-ingest-api-key'],
  exposedHeaders: ['grpc-status', 'grpc-message'],
}));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    proxy: GATEWAY_URL,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

app.use('/', createProxyMiddleware({
  target: GATEWAY_URL,
  changeOrigin: true,
  secure: !GATEWAY_URL.includes('localhost'),
  ws: false,
  onProxyReq: (proxyReq, req) => {
    console.log(`  → Proxying to: ${GATEWAY_URL}${req.url}`);
    for (const h of ['content-type', 'x-grpc-web', 'x-user-agent']) {
      if (req.headers[h]) proxyReq.setHeader(h, req.headers[h]);
    }
  },
  onProxyRes: (proxyRes) => {
    console.log(`  ← Response: ${proxyRes.statusCode}`);
  },
  onError: (err, _req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  },
}));

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Mirador gRPC-Web Proxy (Solana demo)                     ║
╟────────────────────────────────────────────────────────────╢
║  Proxy:   http://localhost:${PORT}                            ║
║  Gateway: ${GATEWAY_URL}                                       ║
╚════════════════════════════════════════════════════════════╝
  `);
});
