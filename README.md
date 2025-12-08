# API Gateway Suite

API Gateway centralizzato per suite software healthcare con Platformatic Watt.

## Requisiti

- Node.js >= 22.0.0
- npm >= 10.0.0

## Quick Start

```bash
# 1. Install root dependencies
npm install

# 2. Install gateway dependencies
cd services/gateway && npm install && cd ../..

# 3. Run development server
npm run dev
```

Test:

- http://localhost:3042 → Hello World
- http://localhost:3042/health → Health check

## Struttura

```
api-gateway-suite/
├── watt.json                 # Watt orchestrator config
├── services/
│   └── gateway/              # API Gateway (Fastify + TypeScript)
│       ├── watt.json
│       └── src/index.ts
├── packages/                 # Shared libraries (future)
├── infrastructure/           # Docker/Caddy/Prometheus configs
└── docs/                     # Documentation
```

## Stack

- **Orchestrator**: Platformatic Watt 3.x
- **API Framework**: Fastify 5.x
- **Language**: TypeScript (Node.js 22 type stripping)
