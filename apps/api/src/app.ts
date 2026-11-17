import { timingSafeEqual } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import { AppError, parseByteSize } from './errors.js';
import { JobService } from './services/jobService.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerQRRoutes } from './routes/qr.js';

function safeEqual(a: string, b: string): boolean {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

export async function buildApp(
  config: AppConfig,
): Promise<{ app: FastifyInstance; jobs: JobService }> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: parseByteSize(config.MAX_PAYLOAD),
    trustProxy: true,
  });
  const jobs = new JobService(config);

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: 'ValidationError',
        message: 'The request payload is invalid.',
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }
    const clientError = error as {
      statusCode?: number;
      code?: string;
      message?: string;
      validation?: Array<{ instancePath?: string; message?: string }>;
    };
    if (clientError.code === 'FST_ERR_VALIDATION') {
      return reply.code(400).send({
        error: 'ValidationError',
        message: 'The request payload is invalid.',
        issues: (clientError.validation ?? []).map((issue) => ({
          path: (issue.instancePath ?? '').replace(/^\//, '').replace(/\//g, '.'),
          message: issue.message ?? 'Invalid value',
        })),
      });
    }
    if (clientError.statusCode === 429) {
      return reply.code(429).send({
        error: 'TooManyRequests',
        message: clientError.message ?? 'Rate limit exceeded.',
      });
    }
    const statusCode = clientError.statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({
        error: clientError.code ?? 'ClientError',
        message: clientError.message ?? 'The request could not be processed.',
      });
    }
    request.log.error(error, 'Unhandled API error');
    return reply.code(500).send({
      error: 'InternalServerError',
      message: 'An unexpected error occurred.',
    });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: 'NotFound', message: 'Route not found.' }),
  );

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-api-key', 'authorization'],
  });

  if (config.RATE_LIMIT_ENABLED) {
    await app.register(rateLimit, {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW,
      errorResponseBuilder: (_request, context) => ({
        error: 'TooManyRequests',
        message: `Rate limit exceeded. Try again in ${context.after}.`,
        statusCode: 429,
      }),
    });
  }

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'QR Studio API',
        version: '1.0.0',
        description:
          'Generate customizable QR codes as PNG or SVG, individually or in batches. Send `x-api-key` when the server requires authentication.',
      },
      tags: [
        { name: 'System', description: 'Service health' },
        { name: 'QR', description: 'QR generation and metadata' },
        { name: 'Batch jobs', description: 'Asynchronous batch generation' },
      ],
      components: {
        securitySchemes: {
          ApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/v1/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  app.addHook('onRequest', async (request) => {
    if (request.method === 'OPTIONS' || !config.API_KEY) return;
    const path = request.url.split('?')[0] ?? '';
    if (path.startsWith('/api/v1/docs') || path === '/api/v1/health') return;

    const headerKey = request.headers['x-api-key'];
    const authorization = request.headers.authorization;
    const provided =
      typeof headerKey === 'string'
        ? headerKey
        : authorization?.startsWith('Bearer ')
          ? authorization.slice(7)
          : undefined;

    if (!provided || !safeEqual(provided, config.API_KEY)) {
      throw new AppError(401, 'Valid API key required', 'Unauthorized');
    }
  });

  await app.register(async (instance) => {
    await registerHealthRoutes(instance, config);
    await registerQRRoutes(instance, config);
    await registerJobRoutes(instance, config, jobs);
  });

  return { app, jobs };
}
