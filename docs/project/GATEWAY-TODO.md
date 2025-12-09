# Gateway Enhancement TODO

## Priority 1: Observability (Sprint 3)

### US-043: Prometheus Metrics Endpoint

**Estimate**: 2h  
**Why**: SLA monitoring (P50/P95/P99) richiede metriche

**Tasks**:

- [ ] Install `prom-client@15.x`
- [ ] Create `src/plugins/metrics.ts` con:
  - `http_request_duration_ms` histogram (buckets: 10, 50, 100, 300, 500, 1000, 3000)
  - `http_requests_total` counter (labels: method, route, status)
  - `gateway_info` gauge (version, environment)
- [ ] Register `onRequest` hook per start timer
- [ ] Register `onResponse` hook per record metrics
- [ ] Expose `/metrics` endpoint (no auth)
- [ ] Test: verify Prometheus scrape format

**Acceptance**:

```gherkin
Given gateway is running
When I GET /metrics
Then response is text/plain
And contains metric http_request_duration_ms_bucket
And contains label method="GET"
```

**BDD**: Create `e2e/features/gateway-metrics.feature`

---

### US-044: Structured Logging with Correlation IDs

**Estimate**: 2h  
**Why**: Distributed tracing richiede correlation IDs

**Tasks**:

- [ ] Install `@fastify/request-context@6.x`
- [ ] Create `src/plugins/logging.ts`:
  - Generate `requestId` UUID per request
  - Add `onRequest` hook per inject context
  - Configure pino serializers (req, res, err)
- [ ] Add correlation ID to response headers (`X-Request-ID`)
- [ ] Test: verify logs include requestId

**Acceptance**:

```gherkin
Given gateway receives request
When request has no X-Request-ID header
Then gateway generates UUID
And adds to request context
And includes in all logs
And returns in response header
```

**Log Format** (pino):

```json
{
  "level": 30,
  "time": 1702166400000,
  "requestId": "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
  "method": "GET",
  "url": "/health",
  "statusCode": 200,
  "responseTime": 12,
  "msg": "request completed"
}
```

---

### US-045: Global Error Handler

**Estimate**: 1.5h  
**Why**: Errori devono ritornare formato consistente

**Tasks**:

- [ ] Create `src/plugins/error-handler.ts`:
  - Custom error formatter (JSON API spec)
  - Error serialization (no stack in prod)
  - HTTP status mapping (400, 401, 403, 404, 500)
- [ ] Register `setErrorHandler` hook
- [ ] Add `@fastify/sensible` error creators (notFound, badRequest)
- [ ] Test: verify error response format

**Error Format**:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with ID 123 not found",
    "statusCode": 404,
    "timestamp": "2025-12-09T22:00:00Z",
    "requestId": "uuid",
    "details": []
  }
}
```

**Acceptance**:

```gherkin
Given gateway route throws error
When error is validation failure
Then response status is 400
And body contains error.code "VALIDATION_ERROR"
And body contains error.requestId
And stack trace is not exposed
```

---

## Priority 2: Routing & Security (Sprint 4)

### US-046: HTTP Proxy to Microservices

**Estimate**: 3h  
**Why**: Gateway deve inoltrare richieste a backend services

**Tasks**:

- [ ] Install `@fastify/http-proxy@10.x`
- [ ] Create `src/plugins/proxy.ts`:
  - Proxy `/api/auth/*` → auth-api service
  - Proxy `/api/patients/*` → patient-api (future)
  - Circuit breaker integration (@fastify/circuit-breaker)
  - Retry logic (exponential backoff)
- [ ] Service discovery config (from env vars)
- [ ] Test: mock backend, verify forwarding

**Config** (env vars):

```bash
AUTH_API_URL=http://auth-api:3001
PATIENT_API_URL=http://patient-api:3002
```

**Acceptance**:

```gherkin
Given auth-api is running on port 3001
When I POST /api/auth/login to gateway
Then gateway forwards to http://auth-api:3001/login
And returns auth-api response
And adds X-Gateway-Version header
```

---

### US-047: Rate Limiting

**Estimate**: 2h  
**Why**: Protezione da abuse

**Tasks**:

- [ ] Install `@fastify/rate-limit@10.x`
- [ ] Configure global limits (100 req/min per IP)
- [ ] Configure route-specific limits (/auth/login: 5 req/min)
- [ ] Redis-backed storage (distributed rate limiting)
- [ ] Custom error response (429 Too Many Requests)
- [ ] Test: verify rate limit enforcement

**Acceptance**:

```gherkin
Given rate limit is 5 requests per minute
When client makes 6 requests in 30 seconds
Then first 5 requests return 200
And 6th request returns 429
And response includes Retry-After header
```

---

### US-048: CORS Configuration

**Estimate**: 1h  
**Why**: Frontend apps richiedono CORS

**Tasks**:

- [ ] Install `@fastify/cors@10.x`
- [ ] Configure allowed origins (env-based)
- [ ] Configure methods (GET, POST, PUT, DELETE)
- [ ] Configure headers (Authorization, Content-Type)
- [ ] Enable credentials for cookie-based auth
- [ ] Test: verify CORS headers

**Config**:

```typescript
{
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}
```

---

## Priority 3: Advanced Features (Sprint 5+)

### US-049: OpenAPI Documentation

**Estimate**: 2h  
**Tasks**:

- [ ] Install `@fastify/swagger@9.x` + `@fastify/swagger-ui@5.x`
- [ ] Configure OpenAPI 3.1 spec
- [ ] Auto-generate from route schemas
- [ ] Serve UI at `/documentation`

### US-050: Request Validation

**Estimate**: 2h  
**Tasks**:

- [ ] Use TypeBox for route schemas
- [ ] Validate query params, headers, body
- [ ] Auto-generate OpenAPI from schemas

### US-051: APM Integration (Optional)

**Estimate**: 3h  
**When**: Se Prometheus non basta
**Options**:

- Elastic APM
- New Relic
- Datadog APM

---

## Quick Wins (This Sprint)

### Add to gateway NOW

```typescript
// src/plugins/metrics.ts (30 min)
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics({ prefix: 'gateway_' });

app.get('/metrics', async () => {
  return register.metrics();
});
```

### Add correlation ID (15 min)

```typescript
// src/index.ts
import { randomUUID } from 'crypto';

app.addHook('onRequest', async (request, reply) => {
  const requestId = request.headers['x-request-id'] || randomUUID();
  request.log = request.log.child({ requestId });
  reply.header('X-Request-ID', requestId);
});
```

---

## Test Coverage Target

**Current Gateway**: 0 tests  
**Target Sprint 3**: 80% coverage

**Test Scenarios**:

- [ ] Health check returns 200
- [ ] Metrics endpoint returns prometheus format
- [ ] Correlation ID added to requests
- [ ] Errors return proper format
- [ ] Rate limit enforced
- [ ] Graceful shutdown completes in-flight requests

---

**Total Estimate**: 15.5h (3 sprints)  
**Priority**: US-043 (metrics) → US-044 (logging) → US-045 (errors)
