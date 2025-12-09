/**
 * JWT Validation Plugin - US-038
 * Registers @fastify/jwt and authenticate decorator
 */
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthPluginOptions } from '../index.js';

const jwtPlugin: FastifyPluginAsync<AuthPluginOptions> = async (
  fastify,
  opts,
) => {
  // Register @fastify/jwt in verify-only mode
  // When only public key is provided, signing is automatically disabled
  await fastify.register(jwt, {
    secret: {
      public: opts.jwtPublicKey || '',
    },
    verify: {
      algorithms: ['RS256'],
      // Validate issuer matches Keycloak realm URL (allowedIss for fast-jwt compatibility)
      allowedIss: `${opts.keycloakUrl}/realms/${opts.realm}`,
      // Require 'sub' claim (subject/user ID)
      requiredClaims: ['sub'],
    },
  });

  // Add authenticate decorator
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  );
};

export default fp(jwtPlugin, {
  name: '@tech-citizen/auth-jwt',
  fastify: '5.x',
});
