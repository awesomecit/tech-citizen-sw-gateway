import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import { GatewayContextEntity } from '../../domain/entities/gateway-context.entity.js';
import type { AuthProviderPort } from '../ports/auth-provider.port.js';
import type { MetricsCollectorPort } from '../ports/metrics-collector.port.js';
// import type { CacheProviderPort } from '../ports/cache-provider.port.js'; // TODO: Epic 5 - Cache Layer
// import type { RateLimiterPort } from '../ports/rate-limiter.port.js';    // TODO: Epic 7 - Rate Limiting

/**
 * ComposeGatewayDependencies
 *
 * Dependency Injection Container per il gateway usando Hexagonal Architecture (Ports & Adapters).
 *
 * WHY Dependency Injection?
 * -------------------------
 * - **Testabilità**: Possiamo iniettare mock adapters nei test senza toccare infrastruttura reale
 * - **Sostituibilità**: Cambiare Keycloak → Auth0 richiede solo nuovo adapter, zero touch al core
 * - **Componibilità**: Feature flags controllano quali adapter vengono iniettati a runtime
 * - **SOLID (D)**: Dipendenza da interfacce (Port), non implementazioni concrete (Adapter)
 *
 * Pattern: Ports & Adapters (Hexagonal Architecture)
 * --------------------------------------------------
 * - **Port** = Interfaccia (es. AuthProviderPort) → Cosa serve al domain
 * - **Adapter** = Implementazione (es. KeycloakAuthAdapter, NoopAuthAdapter) → Come lo otteniamo
 * - **Use Case** (questa classe) = Orchestrazione → Coordina i Port senza sapere quale Adapter c'è dietro
 *
 * Fastify Technical Context
 * -------------------------
 * FastifyInstance è l'oggetto centrale del framework:
 * - **app.register()**: Plugin system (simile a Express middleware ma con encapsulation)
 * - **app.addHook()**: Lifecycle hooks (onRequest, onResponse, onClose, etc.)
 * - **app.decorate()**: Estende app con custom methods (es. app.authenticate)
 * - **app.log**: Pino logger integrato (JSON structured logging)
 *
 * Ogni adapter chiama app.register() per estendere il gateway con la sua funzionalità.
 * Hooks invece intercettano richieste HTTP per iniettare comportamenti trasversali
 * (correlation ID, metrics, logging) senza duplicare codice in ogni route.
 */
export interface ComposeGatewayDependencies {
  /**
   * Auth Provider (IMPLEMENTED - Epic 3)
   *
   * WHY: Autenticazione è requisito per proteggere API healthcare (GDPR, privacy paziente)
   *
   * Adapters disponibili:
   * - KeycloakAuthAdapter: Keycloak OIDC + JWT + Redis session storage
   * - NoopAuthAdapter: Permette tutto, per development/test senza infra
   *
   * Cosa fa quando registrato:
   * - app.decorate('authenticate', handler): Aggiunge metodo app.authenticate
   * - Registra routes: POST /auth/login, POST /auth/logout, GET /auth/session
   * - Crea hook onRequest: Valida JWT token, carica user da Redis
   *
   * Fastify Concepts:
   * - **Decorator**: Metodo custom su app/request/reply (es. app.authenticate, request.user)
   * - **Hook onRequest**: Eseguito prima di ogni route handler, può bloccare richiesta (throw error)
   * - **Plugin encapsulation**: Ogni adapter è Fastify plugin, può avere propri routes/hooks isolati
   */
  authProvider: AuthProviderPort;

  /**
   * Metrics Collector (IMPLEMENTED - Epic 2)
   *
   * WHY: Observability per troubleshooting production (latenza, error rate, traffic patterns)
   *
   * Adapters disponibili:
   * - PrometheusMetricsAdapter: Prometheus client (histogram http_request_duration_ms)
   * - NoopMetricsAdapter: Zero overhead, per development senza Prometheus
   *
   * Cosa fa quando registrato:
   * - Crea metrics Prometheus: Histogram con labels (method, route, status)
   * - Registra route: GET /metrics (espone dati per Prometheus scraper)
   * - recordRequest(): Chiamato in onResponse hook per registrare duration
   *
   * Fastify Concepts:
   * - **Route registration**: app.get('/metrics', handler) crea endpoint HTTP
   * - **Hook onResponse**: Eseguito dopo route handler, ha accesso a reply.statusCode
   * - **Singleton pattern**: Prometheus metrics devono essere unici (no duplicati), inizializzati una volta
   */
  metricsCollector: MetricsCollectorPort;

  /**
   * Cache Provider (PLANNED - Epic 5, NOT IMPLEMENTED)
   *
   * WHY: Ridurre latenza e carico su DB per dati frequently-accessed (lookup tabelle, configurazioni)
   *
   * Adapters previsti:
   * - RedisCache Adapter: Redis con TTL configurabile
   * - InMemoryCache Adapter: LRU cache locale (single-instance, no cluster)
   * - NoopCacheAdapter: Bypass cache, per test deterministici
   *
   * Cosa farà quando implementato:
   * - Wrappa chiamate DB/API con cache layer: cache.get(key) ?? await fetchFromDB()
   * - Invalidazione cache: cache.delete(key) quando dati cambiano
   * - Utilizzato in routes per response caching (es. GET /api/patients/:id)
   *
   * Use Case Example:
   * ```typescript
   * // In route handler
   * const patient = await cacheProvider.get<Patient>(`patient:${id}`);
   * if (patient) return patient; // Cache hit
   *
   * const fetched = await db.patients.findById(id); // Cache miss
   * await cacheProvider.set(`patient:${id}`, fetched, 300); // TTL 5 min
   * return fetched;
   * ```
   *
   * Fastify Concepts:
   * - **Prevalidation hook**: Può controllare cache prima di validazione payload
   * - **Serialization hook**: Può salvare response in cache dopo serializzazione
   * - **Request context**: Cache key spesso include request.user.id per isolation
   */
  // cacheProvider: CacheProviderPort; // TODO: Uncomment when Epic 5 starts

  /**
   * Rate Limiter (PLANNED - Epic 7, NOT IMPLEMENTED)
   *
   * WHY: Proteggere API da abuso (DOS, brute force login, API quota enforcement)
   *
   * Adapters previsti:
   * - RedisRateLimiter: Distributed rate limiting (multi-instance gateway)
   * - InMemoryRateLimiter: Local rate limiting (single-instance, testing)
   * - NoopRateLimiter: Disable limiting per test load/performance
   *
   * Cosa farà quando implementato:
   * - Sliding window counter: max N requests per IP/user in time window
   * - Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
   * - HTTP 429 Too Many Requests: Quando limite superato
   *
   * Algorithms considerati:
   * - Token Bucket: Permette burst, poi throttle (es. 100 req/min con burst 20)
   * - Sliding Window Log: Preciso ma memory-intensive (tiene timestamp ogni request)
   * - Sliding Window Counter: Compromesso (Redis INCR + TTL)
   *
   * Fastify Concepts:
   * - **Prehandler hook**: Eseguito dopo validazione, prima handler (posto ideale per rate limit)
   * - **Reply.code(429)**: Imposta status code senza eseguire handler
   * - **Plugin @fastify/rate-limit**: Potremmo wrappare invece di implementare custom
   */
  // rateLimiter: RateLimiterPort; // TODO: Uncomment when Epic 7 starts
}

/**
 * Compose Gateway Use Case
 *
 * Orchestrates gateway setup: hooks, adapters, routes
 * Depends on ports (interfaces), not concrete implementations (Dependency Inversion Principle)
 *
 * WHY Use Case Pattern?
 * ---------------------
 * - Separa orchestrazione (questo) da business logic (domain services)
 * - Testabile con mock adapters: ComposeGatewayUseCase({ authProvider: mockAuth })
 * - Single Responsibility: questa classe coordina, non implementa
 */
export class ComposeGatewayUseCase {
  constructor(private deps: ComposeGatewayDependencies) {}

  /**
   * Execute Gateway Composition
   *
   * Ordine di esecuzione è critico per Fastify:
   * 1. Base plugins (sensible: error handling utilities)
   * 2. Hooks (onRequest/onResponse: comportamenti trasversali)
   * 3. Adapters (auth, metrics: funzionalità specifiche)
   *
   * WHY questo ordine?
   * ------------------
   * - **Hooks prima**: Devono essere registrati prima di routes (hooks wrappano routes)
   * - **Adapters dopo hooks**: Adapters possono registrare proprie routes che usano hooks
   * - **Sensible primo**: Fornisce utilities (app.httpErrors) usate da altri plugin
   *
   * Fastify Plugin System:
   * ----------------------
   * - app.register() è async: aspetta che plugin completi setup
   * - Ogni plugin crea "scope" isolato (encapsulation)
   * - Plugin children ereditano decorators/hooks dai parent
   * - Order matters: plugins registrati prima sono disponibili ai successivi
   */
  async execute(app: FastifyInstance): Promise<void> {
    // Register base plugins
    // @fastify/sensible: Aggiunge app.httpErrors (throw app.httpErrors.notFound())
    await app.register(sensible);

    // Setup hooks (correlation ID + metrics recording)
    // Hooks devono essere registrati PRIMA di adapters perché wrappano le loro routes
    this.setupHooks(app);

    // Register adapters if enabled (dynamic composition basata su feature flags)
    if (this.deps.authProvider.isEnabled()) {
      app.log.info(
        { provider: this.deps.authProvider.getProviderName() },
        'Registering auth provider',
      );
      await this.deps.authProvider.register(app);
    } else {
      // Auth disabled: register noop decorator
      // Anche se disabilitato, registriamo decorator per evitare errors in routes che chiamano app.authenticate
      await this.deps.authProvider.register(app);
      app.log.info('Auth disabled, using noop authenticate decorator');
    }

    if (this.deps.metricsCollector.isEnabled()) {
      app.log.info(
        { collector: this.deps.metricsCollector.getCollectorName() },
        'Registering metrics collector',
      );
      await this.deps.metricsCollector.register(app);
    } else {
      app.log.info('Metrics disabled, no telemetry collection');
    }
  }

  /**
   * Setup Fastify Lifecycle Hooks
   *
   * WHY Hooks invece di middleware?
   * --------------------------------
   * - **Typed**: TypeScript sa che request ha .log, .headers, etc.
   * - **Async-native**: async/await supportato nativamente
   * - **Encapsulation**: Hooks registrati in plugin sono isolati dal parent scope
   * - **Performance**: Hooks compilati in tree, non chain sequenziale come Express
   *
   * Fastify Lifecycle Order (per ogni request):
   * -------------------------------------------
   * 1. onRequest      → [QUI: Generate correlation ID, attach context]
   * 2. preParsing     → (non usato ora)
   * 3. preValidation  → (non usato ora, future: cache check)
   * 4. preHandler     → (non usato ora, future: rate limiting)
   * 5. handler        → Route handler (GET /api/protected, etc.)
   * 6. preSerialization → (non usato ora)
   * 7. onSend         → (non usato ora)
   * 8. onResponse     → [QUI: Log structured data, record metrics]
   * 9. onTimeout      → (non usato ora)
   * 10. onError       → (non usato ora, future: error tracking)
   * 11. onRequestAbort → (non usato ora)
   *
   * Server Lifecycle (per app):
   * ---------------------------
   * - onReady   → (non usato ora)
   * - onClose   → [QUI: Cleanup resources]
   * - onRoute   → (non usato ora, future: auto-generate OpenAPI)
   * - onRegister → (non usato ora)
   *
   * Hook Performance Notes:
   * -----------------------
   * - Hooks eseguiti in ordine di registrazione
   * - Async hooks aspettano Promise.resolve prima di procedere
   * - Evitare blocking operations (DB query, file I/O) in onRequest/onResponse
   * - Metrics recording è fire-and-forget (Prometheus client è async internamente)
   */
  private setupHooks(app: FastifyInstance): void {
    /**
     * Hook: onRequest
     *
     * Eseguito all'inizio di ogni request, PRIMA di parsing body/query/params
     *
     * WHY qui?
     * --------
     * - Vogliamo correlation ID il prima possibile (trace distribuito cross-services)
     * - Timer startTime deve partire prima di qualsiasi elaborazione
     * - Logger child con requestId deve wrappare tutti i log successivi
     *
     * Fastify Request Object:
     * -----------------------
     * - request.headers: Record<string, string | string[] | undefined>
     * - request.log: Pino logger (Fastify usa Pino di default)
     * - request.method: 'GET' | 'POST' | 'PUT' | 'DELETE' | etc.
     * - request.url: '/api/protected?foo=bar' (include query string)
     * - request.routeOptions: Metadata route (es. config, schema)
     *
     * Fastify Reply Object:
     * ---------------------
     * - reply.header(name, value): Set response header
     * - reply.code(statusCode): Set status code (chainable)
     * - reply.send(payload): Send response (auto-serialize JSON)
     * - reply.statusCode: Readonly dopo send (usato in onResponse)
     *
     * Pattern: Child Logger
     * ---------------------
     * request.log.child({ requestId }) crea nuovo logger che eredita config parent
     * ma aggiunge campo requestId a TUTTI i log successivi del request context.
     * Questo permette di tracciare logs cross-services con stesso UUID.
     */
    app.addHook('onRequest', async (request, reply) => {
      const headers = request.headers as Record<string, string | undefined>;

      // Generate or reuse correlation ID (distributed tracing)
      // Se header X-Request-ID già presente (upstream gateway), riusiamo
      // Altrimenti generiamo nuovo UUID v4
      const context = GatewayContextEntity.fromHeaders(
        headers,
        request.method,
        request.url,
      );

      // Attach context to request object (TypeScript type augmentation)
      // Questo permette ad altri hooks/routes di accedere a context senza ricalcolare
      (
        request as unknown as { gatewayContext: GatewayContextEntity }
      ).gatewayContext = context;

      // Propagate correlation ID to response (client può usarlo per troubleshooting)
      reply.header('X-Request-ID', context.requestId);

      // Create child logger with correlation ID (tutti i log in questo request includeranno requestId)
      request.log = request.log.child({ requestId: context.requestId });
    });

    /**
     * Hook: onResponse
     *
     * Eseguito DOPO che response è stata inviata al client
     *
     * WHY qui?
     * --------
     * - reply.statusCode è disponibile solo dopo handler execution
     * - duration può essere calcolato solo dopo response complete
     * - Non blocchiamo response al client (logging è async fire-and-forget)
     *
     * Performance Consideration:
     * --------------------------
     * onResponse è async ma NON aspetta che Promise risolva prima di chiudere connessione.
     * Fastify invia response al client e POI esegue onResponse in background.
     * Questo è OK per logging/metrics (best-effort) ma NON per business logic critica.
     *
     * Structured Logging Fields:
     * --------------------------
     * Seguiamo standard OpenTelemetry per compatibility con Loki/Grafana:
     * - requestId: UUID v4 (correlation ID per distributed tracing)
     * - method: HTTP verb (filtri Loki: {method="POST"})
     * - url: Request path (filtri Loki: {url=~"/api/.*"})
     * - statusCode: HTTP status (filtri Loki: {statusCode>=500} per errors)
     * - duration: Latency in ms (dashboard P95/P99)
     * - userId: Subject JWT (audit trail, GDPR compliance)
     *
     * Future: Error Tracking
     * ----------------------
     * Quando implementeremo onError hook, cattureremo:
     * - error.message, error.stack
     * - error.statusCode (se Fastify error)
     * - Invio a Sentry/Rollbar per alerting
     */
    app.addHook('onResponse', async (request, reply) => {
      // Retrieve context attached in onRequest
      const context = (
        request as unknown as { gatewayContext: GatewayContextEntity }
      ).gatewayContext;
      if (!context) {
        // Defensive programming: dovrebbe essere sempre presente, ma safety check
        return;
      }

      // Calculate request duration (startTime salvato in context)
      const duration = context.getElapsedTime();

      // Structured logging for future Loki export (JSON format)
      // Pino serializza automaticamente object in JSON
      request.log.info(
        {
          requestId: context.requestId,
          method: context.method,
          url: context.url,
          statusCode: reply.statusCode,
          duration,
          userId: (request as { user?: { sub?: string } }).user?.sub, // user.sub populated by auth adapter
        },
        'HTTP request completed', // Message human-readable (Grafana Explore view)
      );

      // Record Prometheus metrics (solo se feature enabled)
      // Prometheus histogram registra latency con labels (method, route, status)
      // Questo permette query tipo: rate(http_request_duration_ms_count[5m]) by (status)
      if (this.deps.metricsCollector.isEnabled()) {
        this.deps.metricsCollector.recordRequest(
          context,
          reply.statusCode,
          duration,
        );
      }
    });

    /**
     * Hook: onClose
     *
     * Eseguito quando Fastify server sta per shutdown (graceful shutdown)
     *
     * WHY?
     * ----
     * - Chiudere connessioni Redis/DB prima di terminare processo
     * - Flush metrics buffer a Prometheus (push gateway)
     * - Completare requests in-flight prima di SIGTERM
     *
     * Fastify Graceful Shutdown:
     * --------------------------
     * 1. Server smette di accettare nuove connessioni
     * 2. Aspetta che requests in-flight completino (timeout 10s default)
     * 3. Esegue onClose hooks
     * 4. Chiude server HTTP
     * 5. Process exit
     *
     * Docker/Kubernetes Integration:
     * ------------------------------
     * - SIGTERM inviato da Docker/K8s → Fastify intercetta
     * - Fastify esegue graceful shutdown automaticamente
     * - K8s grace period default 30s (configurabile in Pod spec)
     * - Se timeout scade, SIGKILL forza terminazione
     *
     * Future Cleanup:
     * ---------------
     * Quando aggiungeremo Redis/RabbitMQ connessioni, qui faremo:
     * - await redis.quit() // Chiude connessioni pool
     * - await rabbitMQ.close() // Chiude channel AMQP
     * - await db.destroy() // Chiude connessioni DB pool
     */
    app.addHook('onClose', async instance => {
      instance.log.info('Cleaning up gateway resources...'); // instance = FastifyInstance (app)

      // Future: Add cleanup logic here
      // - Close Redis connections
      // - Flush metrics buffer
      // - Close RabbitMQ channels
      // - Close DB connection pools
    });
  }
}
