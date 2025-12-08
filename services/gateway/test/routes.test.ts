import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';
import { plugin } from '../src/index.js';

describe('Gateway Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(plugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      service: 'api-gateway',
      version: '1.0.0',
    });
  });

  it('GET / returns hello message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: 'API Gateway Suite - Hello World',
    });
  });
});
