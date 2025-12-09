import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifyOauth2 from '@fastify/oauth2';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

export interface KeycloakPluginOptions {
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  sessionTTL?: number; // seconds, default 3600
}

interface SessionData {
  userId: string;
  userType: 'system' | 'domain';
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    keycloak: {
      redis: Redis;
      config: KeycloakPluginOptions;
    };
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

// Helper: Setup Redis store for sessions
async function setupRedisStore(
  app: FastifyInstance,
  options: KeycloakPluginOptions,
): Promise<Redis> {
  const { redis: redisConfig, sessionTTL = 3600 } = options;

  const redis = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db || 0,
    lazyConnect: true,
  });

  await redis.connect();

  await app.register(fastifySession, {
    secret:
      process.env.SESSION_SECRET || 'change-me-in-production-min-32-chars',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: sessionTTL * 1000,
    },
    store: {
      set: (sid: string, session: any, cb: (err?: Error) => void) => {
        redis
          .setex(`session:${sid}`, sessionTTL, JSON.stringify(session))
          .then(() => cb())
          .catch(cb);
      },
      get: (sid: string, cb: (err: Error | null, session?: any) => void) => {
        redis
          .get(`session:${sid}`)
          .then(data => cb(null, data ? JSON.parse(data) : null))
          .catch(cb);
      },
      destroy: (sid: string, cb: (err?: Error) => void) => {
        redis
          .del(`session:${sid}`)
          .then(() => cb())
          .catch(cb);
      },
    },
  });

  return redis;
}

// Helper: Setup OAuth2 plugin
async function setupOAuth2(
  app: FastifyInstance,
  options: KeycloakPluginOptions,
): Promise<void> {
  const { keycloakUrl, realm, clientId, clientSecret, callbackUrl } = options;

  await app.register(fastifyOauth2, {
    name: 'keycloakOAuth2',
    scope: ['openid', 'email', 'profile'],
    credentials: {
      client: { id: clientId, secret: clientSecret },
      auth: {
        authorizeHost: keycloakUrl,
        authorizePath: `/realms/${realm}/protocol/openid-connect/auth`,
        tokenHost: keycloakUrl,
        tokenPath: `/realms/${realm}/protocol/openid-connect/token`,
      },
    },
    startRedirectPath: '/auth/login',
    callbackUri: callbackUrl,
    callbackUriParams: { access_type: 'offline' },
    pkce: 'S256',
  });
}

// Helper: Validate CSRF state
async function validateCsrfState(
  app: FastifyInstance,
  state: string,
  reply: FastifyReply,
): Promise<boolean> {
  try {
    const oauth2 = app as any;
    if (oauth2.keycloakOAuth2?.validateState) {
      const isValid = await oauth2.keycloakOAuth2.validateState(state);
      if (!isValid) {
        reply
          .code(403)
          .send({ error: 'Invalid state parameter (CSRF check failed)' });
        return false;
      }
    }
    return true;
  } catch (err) {
    app.log.warn({ err }, 'State validation failed');
    reply
      .code(403)
      .send({ error: 'Invalid state parameter (CSRF check failed)' });
    return false;
  }
}

// Helper: Exchange code for tokens
async function exchangeCodeForTokens(
  app: FastifyInstance,
  request: FastifyRequest,
  sessionTTL: number,
): Promise<SessionData | null> {
  try {
    const token = await (
      app as any
    ).keycloakOAuth2.getAccessTokenUsingAuthorizationCodeFlow(request);
    const userInfo = token.id_token_claims || {};

    return {
      userId: userInfo.sub || randomUUID(),
      userType: 'domain',
      email: userInfo.email || 'unknown@example.com',
      accessToken: token.access_token,
      refreshToken: token.refresh_token || '',
      expiresAt: Date.now() + (token.expires_in || sessionTTL) * 1000,
    };
  } catch (error) {
    app.log.error(
      {
        errorCode: (error as any).code,
        errorMessage: (error as any).message,
        statusCode: (error as any).statusCode,
      },
      'OIDC token exchange failed',
    );
    return null;
  }
}

// Helper: OIDC callback handler
function registerCallbackRoute(app: FastifyInstance, sessionTTL: number): void {
  app.get(
    '/auth/callback',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { code, state } = request.query as {
        code?: string;
        state?: string;
      };

      if (!code)
        return reply.code(400).send({ error: 'Missing authorization code' });
      if (!state)
        return reply.code(400).send({ error: 'Missing state parameter' });

      const isValidState = await validateCsrfState(app, state, reply);
      if (!isValidState) return;

      const sessionData = await exchangeCodeForTokens(app, request, sessionTTL);
      if (!sessionData) {
        return reply.code(401).send({ error: 'Authentication failed' });
      }

      (request.session as any).user = sessionData;
      return reply.redirect('/');
    },
  );
}

// Helper: Register auth routes
function registerRoutes(
  app: FastifyInstance,
  options: KeycloakPluginOptions,
): void {
  const { keycloakUrl, realm, sessionTTL = 3600 } = options;

  registerCallbackRoute(app, sessionTTL);

  app.get(
    '/auth/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await request.session.destroy();
      const logoutUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/logout`;
      const redirectUri = encodeURIComponent(
        process.env.BASE_URL || 'http://localhost:3000',
      );
      return reply.redirect(`${logoutUrl}?redirect_uri=${redirectUri}`);
    },
  );

  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request.session as any).user as SessionData | undefined;
      if (!user)
        return reply.code(401).send({ error: 'Authentication required' });
      if (Date.now() > user.expiresAt) {
        await request.session.destroy();
        return reply.code(401).send({ error: 'Session expired' });
      }
      (request as unknown as { user: SessionData }).user = user;
    },
  );
}

const keycloakPluginImpl: FastifyPluginAsync<KeycloakPluginOptions> = async (
  app: FastifyInstance,
  options: KeycloakPluginOptions,
) => {
  await app.register(fastifyCookie);

  const redis = await setupRedisStore(app, options);
  app.decorate('keycloak', { redis, config: options });

  await setupOAuth2(app, options);
  registerRoutes(app, options);

  app.addHook('onClose', async () => {
    await redis.quit();
  });
};

export const keycloakPlugin = fastifyPlugin(keycloakPluginImpl, {
  name: 'keycloak-oidc',
  fastify: '5.x',
});

export default keycloakPlugin;
