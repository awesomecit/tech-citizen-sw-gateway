/**
 * Type declarations for @tech-citizen/auth
 * Extends Fastify with authentication decorators and JWT support
 */

import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      sub: string;
      email?: string;
      exp?: number;
      iss?: string;
      [key: string]: any;
    };
  }
}
