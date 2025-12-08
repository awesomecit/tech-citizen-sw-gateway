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

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10 seconds

export async function plugin(app: FastifyInstance): Promise<void> {
  await app.register(sensible);

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    await app.close();

    app.log.info('Graceful shutdown completed');
    process.exit(0);
  };

  // Register signal handlers
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));

  // Cleanup hook - called by Fastify.close()
  app.addHook('onClose', async instance => {
    instance.log.info('Cleaning up resources...');
    // TODO: Close database connections when added
    // TODO: Close Redis connections when added
    // TODO: Close RabbitMQ connections when added
  });

  // Force exit if graceful shutdown takes too long
  const shutdownTimer = setTimeout(() => {
    app.log.error(
      `Graceful shutdown timeout after ${GRACEFUL_SHUTDOWN_TIMEOUT}ms, forcing exit`,
    );
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);
  shutdownTimer.unref(); // Don't keep process alive

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
