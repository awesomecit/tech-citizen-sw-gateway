import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from 'node:http';
import Fastify, { type FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  service: string;
  version: string;
}

interface HelloResponse {
  message: string;
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  });

  await app.register(sensible);

  app.get<{ Reply: HealthResponse }>('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      version: '1.0.0',
    };
  });

  app.get<{ Reply: HelloResponse }>('/', async () => {
    return { message: 'API Gateway Suite - Hello World' };
  });

  return app;
}

export async function create(): Promise<Server> {
  const app = await buildApp();
  await app.ready();

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    app.server.emit('request', req, res);
  });

  app.server = server;

  return server;
}
