/**
 * US-038 Scenario 1: Valid JWT token authentication
 * BDD: e2e/features/auth-jwt-validation.feature
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { createSigner } from 'fast-jwt';
import authPlugin from '../../src/index';

describe('US-038 Scenario 1: Valid JWT token authentication', () => {
  let fastify: FastifyInstance;

  // RSA256 key pair for testing (generated with openssl genrsa 2048)
  const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2EeFNPI2md4Pm
VIL3Tyqu1D4PKcRAmF/Rd0sHIRIKugmqefJhR3VebFgTUcIM/Zvt832O4GAly/b2
a+ioX3376Iv9ONhvF9SFipRh+TX3TV+/KdL83Ll4sBjofbzdvltLNxq/PCREZ9bp
NTRzhZWTGhtiAc0sff/STZjpzUdQ28cJ+r/jnEK4nZhC8op/cCu7Mj+BM+MOcko/
oLppDuV9cL0a70vYfhlAGp8DrmDpvB441ZTDL/exrijbuomGS5Iy5wIOj7/auHxX
Xmshx34s4fgZ/lvp04+TAh3G/jRaDTSTDDAid9h4G9SF1N4ukt5/mXzFKaVDvIrg
gkIDY4sVAgMBAAECggEAB27986UWBHarOjd3nGjNTZOJUB2sr1V5TghQliMtxSXY
2K6/bGTaQCdsxicnpNei6ulu1itHiauE8wUvW9aAQo15T7anMYv3x5cDnWdrImR0
lQ28WUoawXhxH+boU+ZefFjs3ONz+J4DuoRLVq8czwN5HDyGF7uyOvAjnuIceArb
SMfnYMYE3AqopERKfjdid04506g9znB0nQh4/RPaG8iPufa9LwOrWK4bTIaW8Ilq
dsMCC0OJCsbUd0Ig8wvierPzD66ye92Be0x28sa+LJjVenOeMC7Y949zHsY7V0zl
T9+uPdOCbJGinAgy7yM6yn6aSZV6N8u0poLEgGrhOQKBgQD6Ga4n7o6tpQBFR9a7
W8rQ8QL3FX5cbYB/pkr3w6bdvXDUZtIYqtgTyrV+QTsDzvQp/2lk47uAGaiRN8fm
YNRCqIwpJj9wFyUMHwJs0UWHodXZfWaQpRZSh7DidDqEWHWhS8DG88qwxM2L+r3x
7GKutnU2HrTuoyA2z5QofyzBOQKBgQC6XV+kNeHSltqP3FT5NhMry6xXGA85ToUl
/iSzjHl/Ncg5yPNN8V0txpQ5veSSyiRBapPvK9G4W/mDotaoGspUVvX1JIQOLGNO
FUzIEXCsuNOd5xcG9ttoxq3Z1XgqawzWS90ci/VjlbygWyzV4u3Rz/HaSAxN1o3j
AadrUvQEvQKBgQD5TIXkOhCxGIt3g8+RPUOjGMsa3qrxmRmApJOP+9AmskJ5BvEg
M5Rlzicx7fXUqwOJpZY6QiNR4sG7132EsDqFI5trHTwZEIkWVwbEz6neNDyFqlGF
l3nz1FxGrxLxf3fpyygjaTo/ED3P7aZPM5F+lFOsGdnDEon2+N23rGVBSQKBgCPB
kn4REHi1FM4ROgRuiZMXisNTDGi0VfuKHUSNqSntCbN8iKHlszj7JqlFc7tuKTKb
3jI/OAelLeRBs+mg6jzwSlR0YxnNDmiG0ap5HiMlewSKt/JQHpylselfeaS50Ua0
W4IEoFow+nXRyHJpDbP5r69vr1yn06VARfzjd4oJAoGAfOts9HgECD6Gbxq27vwZ
sjInF8DdRO5avpcENJ6VD67z3Fki+Obu4tsq7wyR/CP/SxlgKhBQhgozbvmRGTtS
2rI2YuB4XCB28Fid6NFirjgkal5V7t1bboQNt6CXwSsbxa5coDALEczXbWuXNcBG
OfKxJNGErKJJm9o/W5AVGiE=
-----END PRIVATE KEY-----`;

  const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAthHhTTyNpneD5lSC908q
rtQ+DynEQJhf0XdLByESCroJqnnyYUd1XmxYE1HCDP2b7fN9juBgJcv29mvoqF99
++iL/TjYbxfUhYqUYfk1901fvynS/Ny5eLAY6H283b5bSzcavzwkRGfW6TU0c4WV
kxobYgHNLH3/0k2Y6c1HUNvHCfq/45xCuJ2YQvKKf3AruzI/gTPjDnJKP6C6aQ7l
fXC9Gu9L2H4ZQBqfA65g6bweONWUwy/3sa4o27qJhkuSMucCDo+/2rh8V15rIcd+
LOH4Gf5b6dOPkwIdxv40Wg00kwwwInfYeBvUhdTeLpLef5l8xSmlQ7yK4IJCA2OL
FQIDAQAB
-----END PUBLIC KEY-----`;

  beforeEach(() => {
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  it('Given a valid JWT signed by Keycloak, When I call fastify.authenticate, Then authentication succeeds', async () => {
    // Register auth plugin
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    // Create signer with private key (same lib as @fastify/jwt)
    const signSync = createSigner({ key: PRIVATE_KEY, algorithm: 'RS256' });
    const validToken = signSync({
      sub: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(new Date('2025-12-10T00:00:00Z').getTime() / 1000),
      iss: 'http://localhost:8080/realms/techcitizen',
    });

    // Create test route
    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    // Make authenticated request
    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.user.sub).toBe('user-123');
    expect(body.user.email).toBe('test@example.com');
  });

  it('Given an expired JWT, When I call fastify.authenticate, Then authentication fails with 401', async () => {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    // Create expired token (exp in the past)
    const signSync = createSigner({ key: PRIVATE_KEY, algorithm: 'RS256' });
    const expiredToken = signSync({
      sub: 'user-123',
      exp: Math.floor(new Date('2025-12-08T00:00:00Z').getTime() / 1000), // Past date
      iss: 'http://localhost:8080/realms/techcitizen',
    });

    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('expired');
  });

  it('Given a JWT with tampered signature, When I call fastify.authenticate, Then authentication fails with 401', async () => {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    // Create valid token, then tamper with signature
    const signSync = createSigner({ key: PRIVATE_KEY, algorithm: 'RS256' });
    const validToken = signSync({
      sub: 'user-123',
      exp: Math.floor(new Date('2025-12-10T00:00:00Z').getTime() / 1000),
      iss: 'http://localhost:8080/realms/techcitizen',
    });

    // Tamper with signature (replace entire signature part with invalid data)
    const parts = validToken.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.invalidSignatureData`;

    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${tamperedToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('invalid');
  });

  it('Given Authorization header "Bearer not-a-valid-jwt", When I call fastify.authenticate, Then authentication fails with 401', async () => {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: 'Bearer not-a-valid-jwt',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('malformed');
  });

  it('Given no Authorization header, When I call fastify.authenticate, Then authentication fails with 401', async () => {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      // No authorization header
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('No Authorization was found');
  });

  it('Given a JWT with wrong issuer, When I call fastify.authenticate, Then authentication fails with 401', async () => {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    // Create token with wrong issuer
    const signSync = createSigner({ key: PRIVATE_KEY, algorithm: 'RS256' });
    const wrongIssuerToken = signSync({
      sub: 'user-123',
      exp: Math.floor(new Date('2025-12-10T00:00:00Z').getTime() / 1000),
      iss: 'http://evil.com/realms/fake', // Wrong issuer
    });

    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${wrongIssuerToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('iss claim');
  });

  it('Given a JWT missing the "sub" claim, When I call fastify.authenticate, Then authentication fails with 401', async () => {
    await fastify.register(authPlugin, {
      keycloakUrl: 'http://localhost:8080',
      realm: 'techcitizen',
      clientId: 'test-client',
      jwtPublicKey: PUBLIC_KEY,
    });

    // Create token without 'sub' claim
    const signSync = createSigner({ key: PRIVATE_KEY, algorithm: 'RS256' });
    const missingSubToken = signSync({
      // sub missing!
      exp: Math.floor(new Date('2025-12-10T00:00:00Z').getTime() / 1000),
      iss: 'http://localhost:8080/realms/techcitizen',
    });

    fastify.get(
      '/protected',
      {
        onRequest: [fastify.authenticate],
      },
      async (request: FastifyRequest) => {
        return { user: request.user };
      },
    );

    await fastify.ready();

    const response = await fastify.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        authorization: `Bearer ${missingSubToken}`,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('sub');
  });
});
