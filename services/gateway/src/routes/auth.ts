/**
 * Auth Routes for E2E Testing
 * Temporary mock implementation for testing session management
 */
import { type FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

interface SessionRequest {
  refreshToken: string;
}

interface SessionResponse {
  sessionId: string;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/auth/login - Login with username/password
  app.post<{
    Body: LoginRequest;
    Reply: LoginResponse;
  }>('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body;

    // Basic validation
    if (!username || !password) {
      return reply.badRequest('Missing username or password');
    }

    // TODO: Replace with real Keycloak authentication
    // For E2E tests, accept any credentials
    const sessionId = randomUUID();
    const accessToken = `mock-access-token-${sessionId}`;
    const refreshToken = `mock-refresh-token-${sessionId}`;

    return {
      sessionId,
      accessToken,
      refreshToken,
    };
  });

  // POST /api/auth/session - Create session with tokens
  app.post<{
    Body: SessionRequest;
    Reply: SessionResponse;
  }>('/api/auth/session', async (request, reply) => {
    const { refreshToken } = request.body;
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.unauthorized('Missing or invalid authorization header');
    }

    if (!refreshToken) {
      return reply.badRequest('Missing refreshToken');
    }

    const accessToken = authHeader.slice(7); // Remove "Bearer "
    const sessionId = randomUUID();

    // TODO: Store session in Redis using RedisSessionAdapter
    request.log.info(
      { sessionId, accessToken: accessToken.slice(0, 20) },
      'Session created',
    );

    return { sessionId };
  });

  // POST /api/auth/logout - Logout and invalidate session
  app.post('/api/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    const sessionId = request.headers['x-session-id'] as string;

    if (!authHeader || !sessionId) {
      return reply.unauthorized('Missing authorization or session ID');
    }

    // TODO: Delete session from Redis
    request.log.info({ sessionId }, 'Session invalidated');

    return { success: true };
  });

  app.log.info('Auth routes registered for E2E testing');
}
