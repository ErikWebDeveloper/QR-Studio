import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config.js';

export async function registerHealthRoutes(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  app.get(
    '/api/v1/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptime: { type: 'number' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
              limits: {
                type: 'object',
                properties: {
                  maxBatchSize: { type: 'number' },
                  batchConcurrency: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      uptime: process.uptime(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      limits: {
        maxBatchSize: config.MAX_BATCH_SIZE,
        batchConcurrency: config.BATCH_CONCURRENCY,
      },
    }),
  );
}
