# Gateway Feature Flags Configuration Examples

## Unit Tests (No Infrastructure)

```json
{
  "config": {
    "features": {
      "auth": false,
      "cache": false,
      "telemetry": true,
      "rateLimit": false
    }
  }
}
```

## Development (Keycloak + Redis local)

```bash
# Environment variables
export GATEWAY_FEATURE_AUTH=true
export GATEWAY_FEATURE_CACHE=true
export GATEWAY_FEATURE_TELEMETRY=true
export GATEWAY_FEATURE_RATE_LIMIT=false

export KEYCLOAK_URL=http://localhost:8090
export KEYCLOAK_REALM=healthcare-domain
export KEYCLOAK_CLIENT_ID=gateway-client
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

## Production (All Features Enabled)

```bash
# Environment variables
export GATEWAY_FEATURE_AUTH=true
export GATEWAY_FEATURE_CACHE=true
export GATEWAY_FEATURE_TELEMETRY=true
export GATEWAY_FEATURE_RATE_LIMIT=true

export KEYCLOAK_URL=https://keycloak.example.com
export KEYCLOAK_REALM=production-realm
export KEYCLOAK_CLIENT_ID=gateway-prod
export KEYCLOAK_CLIENT_SECRET=<from-vault>
export JWT_PUBLIC_KEY=<from-vault>
export REDIS_HOST=redis-cluster.internal
export REDIS_PORT=6379
```

## Usage in Code

```typescript
import Fastify from 'fastify';
import plugin from './gateway/src/index.js';

const app = Fastify();

// Option 1: Load from env vars (production)
await app.register(plugin);

// Option 2: Explicit config (tests)
await app.register(plugin, {
  config: {
    features: {
      auth: false,
      cache: false,
      telemetry: true,
      rateLimit: false,
    },
  },
});

await app.listen({ port: 3000 });
```

## Architecture Benefits

1. **YAGNI**: Only features we use (auth, cache, telemetry, rateLimit)
2. **Testable**: Unit tests run without infrastructure
3. **Flexible**: Different configs for test/staging/prod
4. **Clear**: No magic env vars like `SKIP_AUTH_PLUGIN`
5. **Type-safe**: TypeScript interfaces for config validation
