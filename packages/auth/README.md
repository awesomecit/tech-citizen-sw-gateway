# @tech-citizen/auth

Reusable authentication plugin for Platformatic/Fastify services.

## Features

- 🔐 **JWT Validation**: Verify tokens from Keycloak
- 👤 **User Management**: Create, find, update, delete users in Keycloak
- 🔄 **Session Management**: Refresh token rotation + Redis blacklist
- ✅ **Schema Validation**: TypeBox schemas with auto OpenAPI generation
- 🚀 **Fastify Native**: Built with Fastify plugins (10x faster than Express)

## Installation

```bash
# In mono-repo workspace
npm install

# In external project
npm install @tech-citizen/auth
```

## Usage

### Auth API Mode (with routes)

```typescript
import authPlugin from '@tech-citizen/auth';

await fastify.register(authPlugin, {
  keycloakUrl: 'http://localhost:8080',
  realm: 'techcitizen',
  clientId: 'auth-api',
  clientSecret: 'secret-123',
  redisUrl: 'redis://localhost:6379',
  enableRoutes: true, // Expose /auth/* routes
});

// Routes available:
// POST /auth/register
// POST /auth/login
// POST /auth/logout
// POST /auth/refresh
// GET /auth/me
```

### Gateway Mode (JWT validation only)

```typescript
import authPlugin from '@tech-citizen/auth';

await fastify.register(authPlugin, {
  keycloakUrl: 'http://localhost:8080',
  realm: 'techcitizen',
  clientId: 'gateway',
  enableRoutes: false, // No routes, only decorators
});

// Protected route
fastify.get(
  '/api/profile',
  {
    onRequest: [fastify.authenticate], // Decorator from plugin
  },
  async request => {
    return { user: request.user }; // Populated by JWT
  },
);
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Build
npm run build
```

## Test Coverage

Target: >85% lines, >85% functions, >80% branches

See `jest.config.cjs` for coverage thresholds.

## License

MIT
