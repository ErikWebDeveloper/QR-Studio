import { createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { createBatchRequestSchema } from '@qr-studio/shared';
import { AppError } from '../errors.js';
import { requestBodySchema } from '../schemas/jsonSchema.js';
import type { AppConfig } from '../config.js';
import {
  JobNotFoundError,
  JobService,
  type Job,
} from '../services/jobService.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const batchBodySchema = requestBodySchema(createBatchRequestSchema(500));

function publicJob(job: Job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
    total: job.total,
    processed: job.processed,
    completed: job.completed,
    failed: job.failed,
    progress: job.total === 0 ? 0 : Math.round((job.processed / job.total) * 100),
    archiveName: job.archiveName,
    downloadUrl:
      job.status === 'completed'
        ? `/api/v1/qr/batch/jobs/${job.id}/download`
        : null,
    error: job.error ?? null,
  };
}

export async function registerJobRoutes(
  app: FastifyInstance,
  config: AppConfig,
  jobs: JobService,
): Promise<void> {
  app.post(
    '/api/v1/qr/batch/jobs',
    {
      schema: {
        tags: ['Batch jobs'],
        summary: 'Queue an asynchronous batch job',
        body: batchBodySchema,
      },
    },
    async (request, reply) => {
      const batch = createBatchRequestSchema(config.MAX_BATCH_SIZE).parse(
        request.body,
      );
      const job = await jobs.create(batch);
      return reply.code(202).send(publicJob(job));
    },
  );

  app.get(
    '/api/v1/qr/batch/jobs/:jobId',
    {
      schema: {
        tags: ['Batch jobs'],
        summary: 'Get the status of a batch job',
        params: {
          type: 'object',
          properties: { jobId: { type: 'string' } },
          required: ['jobId'],
        },
      },
    },
    async (request) => {
      const { jobId } = request.params as { jobId: string };
      if (!UUID_PATTERN.test(jobId)) {
        throw new AppError(400, 'Invalid job id', 'InvalidJobId');
      }
      try {
        return publicJob(jobs.get(jobId));
      } catch (error) {
        if (error instanceof JobNotFoundError) {
          throw new AppError(404, 'Job not found', 'JobNotFound');
        }
        throw error;
      }
    },
  );

  app.get(
    '/api/v1/qr/batch/jobs/:jobId/download',
    {
      schema: {
        tags: ['Batch jobs'],
        summary: 'Download the ZIP archive of a completed job',
        params: {
          type: 'object',
          properties: { jobId: { type: 'string' } },
          required: ['jobId'],
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      if (!UUID_PATTERN.test(jobId)) {
        throw new AppError(400, 'Invalid job id', 'InvalidJobId');
      }
      let job: Job;
      try {
        job = jobs.get(jobId);
      } catch (error) {
        if (error instanceof JobNotFoundError) {
          throw new AppError(404, 'Job not found', 'JobNotFound');
        }
        throw error;
      }
      if (job.status !== 'completed') {
        throw new AppError(409, `Job is ${job.status}`, 'JobNotReady');
      }
      const filePath = await jobs.resolveDownload(job);
      if (!filePath) {
        throw new AppError(410, 'Job archive is no longer available', 'JobExpired');
      }
      reply.header('cache-control', 'no-store');
      reply.header('content-disposition', `attachment; filename="${job.archiveName}"`);
      return reply.type('application/zip').send(createReadStream(filePath));
    },
  );
}
