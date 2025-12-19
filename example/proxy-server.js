/**
 * Simple Express proxy server to handle CORS issues
 * Proxies gRPC-Web requests to the Parallax Gateway
 */

import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3001;

// Target Parallax Gateway
const GATEWAY_URL = 'https://parallax-gateway.dev.mirador.org:443';

// Enable CORS for all origins (development only)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-grpc-web', 'x-user-agent', 'x-parallax-api-key'],
  exposedHeaders: ['grpc-status', 'grpc-message'],
  credentials: true
}));

// Health check endpoint (before proxy)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy: GATEWAY_URL,
    timestamp: new Date().toISOString()
  });
});

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// Proxy all other requests to the gateway (gRPC-Web)
app.use('/', createProxyMiddleware({
  target: GATEWAY_URL,
  changeOrigin: true,
  secure: true,
  ws: false,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`  → Proxying to: ${GATEWAY_URL}${req.url}`);

    // Forward gRPC-Web headers
    if (req.headers['content-type']) {
      proxyReq.setHeader('content-type', req.headers['content-type']);
    }
    if (req.headers['x-grpc-web']) {
      proxyReq.setHeader('x-grpc-web', req.headers['x-grpc-web']);
    }
    if (req.headers['x-user-agent']) {
      proxyReq.setHeader('x-user-agent', req.headers['x-user-agent']);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`  ← Response: ${proxyRes.statusCode}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).json({
      error: 'Proxy error',
      message: err.message
    });
  }
}));

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Parallax gRPC-Web Proxy Server                            ║
╟────────────────────────────────────────────────────────────╢
║  Proxy running at: http://localhost:${PORT}                    ║
║  Gateway target:   ${GATEWAY_URL}  ║
╟────────────────────────────────────────────────────────────╢
║  Usage:                                                    ║
║  - All gRPC-Web requests are proxied to the gateway       ║
║  - CORS headers are automatically added                   ║
║  - Health check: http://localhost:${PORT}/health            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
