import archiver from 'archiver';
import type { FastifyInstance } from 'fastify';
import { generateQRCodeBatch } from '@qr-studio/qr-engine';
import { generateQRCodePNG, generateQRCodeSVG } from '@qr-studio/qr-engine';
import { validateQRCodeOptions } from '@qr-studio/qr-engine/validation';
import {
  createBatchRequestSchema,
  generateRequestSchema,
  sanitizeFilename,
  STYLE_CATALOG,
} from '@qr-studio/shared';
import type { AppConfig } from '../config.js';
import { requestBodySchema } from '../schemas/jsonSchema.js';

const generateBodySchema = requestBodySchema(generateRequestSchema);
const batchBodySchema = requestBodySchema(createBatchRequestSchema(500));

export async function registerQRRoutes(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  app.get(
    '/api/v1/qr/formats',
    {
      schema: {
        tags: ['QR'],
        summary: 'List supported output formats',
      },
    },
    async () => ({
      formats: [
        {
          id: 'png',
          mimeType: 'image/png',
          transparent: true,
          description: 'Raster image with real alpha transparency',
        },
        {
          id: 'svg',
          mimeType: 'image/svg+xml',
          transparent: true,
          description: 'Scalable vector output',
        },
      ],
    }),
  );

  app.get(
    '/api/v1/qr/styles',
    {
      schema: {
        tags: ['QR'],
        summary: 'List supported customization styles',
      },
    },
    async () => ({
      ...STYLE_CATALOG,
      colors: ['HEX', 'RGB', 'RGBA', 'HSL', 'CSS color names', 'linear gradient', 'radial gradient'],
      features: [
        'transparent background',
        'logo embedding',
        'custom quiet zone',
        'per-item design overrides',
      ],
    }),
  );

  app.post(
    '/api/v1/qr/generate',
    {
      schema: {
        tags: ['QR'],
        summary: 'Generate a single QR code',
        description:
          'Returns the QR code as PNG or SVG with the requested filename.',
        body: generateBodySchema,
      },
    },
    async (request, reply) => {
      const input = generateRequestSchema.parse(request.body);
      const readability = validateQRCodeOptions(input.data, input.design);
      if (readability.warnings.length > 0) {
        reply.header('x-qr-warnings', JSON.stringify(readability.warnings));
      }

      const filename = sanitizeFilename(input.filename, 'qr-code', input.format);
      reply.header('cache-control', 'no-store');
      reply.header(
        'content-disposition',
        `attachment; filename="${filename}"`,
      );

      if (input.format === 'svg') {
        const { svg } = generateQRCodeSVG(input.data, input.design, input.size);
        return reply.type('image/svg+xml').send(svg);
      }

      const png = await generateQRCodePNG(input.data, input.design, input.size);
      return reply.type('image/png').send(png);
    },
  );

  app.post(
    '/api/v1/qr/batch',
    {
      schema: {
        tags: ['QR'],
        summary: 'Generate a batch of QR codes as a ZIP archive',
        description:
          'Generates up to the configured maximum number of QR codes and streams a ZIP archive with one file per item.',
        body: batchBodySchema,
      },
    },
    async (request, reply) => {
      const batch = createBatchRequestSchema(config.MAX_BATCH_SIZE).parse(
        request.body,
      );
      const archiveName = sanitizeFilename(
        batch.archiveName,
        'qr-studio-batch',
        'zip',
      );
      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', (error) => app.log.error(error, 'Batch archive error'));

      let failed = 0;
      for await (const entry of generateQRCodeBatch(batch, {
        concurrency: config.BATCH_CONCURRENCY,
      })) {
        if (entry.content !== undefined) {
          archive.append(entry.content, { name: entry.filename });
        } else {
          failed += 1;
          app.log.warn({ index: entry.index, error: entry.error }, 'QR generation failed');
        }
      }

      reply.header('cache-control', 'no-store');
      reply.header('content-disposition', `attachment; filename="${archiveName}"`);
      reply.header('x-batch-total', String(batch.items.length));
      reply.header('x-batch-failed', String(failed));
      void archive.finalize();
      return reply.type('application/zip').send(archive);
    },
  );
}
