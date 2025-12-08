import { type FastifyInstance } from 'fastify';
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

export async function plugin(app: FastifyInstance): Promise<void> {
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
}

export default plugin;
