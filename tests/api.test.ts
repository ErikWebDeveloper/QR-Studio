import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../apps/api/src/app.js';
import { loadConfig } from '../apps/api/src/config.js';
import { decodePNG, unzip } from './helpers.js';

interface TestContext {
  app: FastifyInstance;
  dispose: () => Promise<void>;
}

async function createApp(overrides: Record<string, string> = {}): Promise<TestContext> {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'qr-studio-api-'));
  const config = loadConfig({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    RATE_LIMIT_ENABLED: 'false',
    TEMP_PATH: temp,
    ...overrides,
  });
  const { app, jobs } = await buildApp(config);
  await app.ready();
  return {
    app,
    dispose: async () => {
      jobs.stop();
      await app.close();
      await rm(temp, { recursive: true, force: true });
    },
  };
}

describe('REST API', () => {
  let context: TestContext;
  const contexts: TestContext[] = [];

  const setup = async (overrides?: Record<string, string>) => {
    context = await createApp(overrides);
    contexts.push(context);
    return context.app;
  };

  afterEach(async () => {
    for (const item of contexts.splice(0)) {
      await item.dispose();
    }
  });

  it('exposes health, formats, styles and OpenAPI docs', async () => {
    const app = await setup();
    const health = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe('ok');

    const formats = await app.inject({ method: 'GET', url: '/api/v1/qr/formats' });
    expect(formats.json().formats.map((item: { id: string }) => item.id)).toEqual([
      'png',
      'svg',
    ]);

    const styles = await app.inject({ method: 'GET', url: '/api/v1/qr/styles' });
    expect(styles.json().dots.length).toBeGreaterThan(3);

    const docs = await app.inject({ method: 'GET', url: '/api/v1/docs/json' });
    expect(docs.statusCode).toBe(200);
    expect(docs.json().openapi).toBe('3.0.3');
  });

  it('generates a PNG with a safe filename and correct MIME type', async () => {
    const app = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/generate',
      payload: {
        data: 'https://example.com/api',
        filename: '../evil name',
        format: 'png',
        size: 512,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="evil name.png"',
    );
    await expect(decodePNG(response.rawPayload)).resolves.toBe(
      'https://example.com/api',
    );
  });

  it('generates transparent SVG and reports readability warnings', async () => {
    const app = await setup();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/generate',
      payload: {
        data: 'svg-api',
        format: 'svg',
        size: 512,
        design: { background: { transparent: true }, margin: 0 },
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(response.body).toContain('<svg');
    expect(response.headers['x-qr-warnings']).toBeDefined();
  });

  it('rejects invalid requests with structured errors', async () => {
    const app = await setup();
    const missing = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/generate',
      payload: { format: 'png' },
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json().error).toBe('ValidationError');
    expect(missing.json().issues.length).toBeGreaterThan(0);

    const unsupported = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/generate',
      payload: { data: 'x', format: 'pdf' },
    });
    expect(unsupported.statusCode).toBe(400);

    const unknownRoute = await app.inject({ method: 'GET', url: '/nope' });
    expect(unknownRoute.statusCode).toBe(404);
  });

  it('generates a ZIP batch of 50 QR codes with unique filenames', async () => {
    const app = await setup();
    const items = Array.from({ length: 50 }, (_, index) => ({
      data: `https://example.com/batch-${index + 1}`,
      filename: `qr-batch-${index + 1}`,
    }));
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/batch',
      payload: {
        format: 'png',
        size: 256,
        design: { background: { transparent: true }, dots: { type: 'rounded' } },
        items,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/zip');
    const files = unzip(response.rawPayload);
    expect(Object.keys(files)).toHaveLength(50);
    expect(files['qr-batch-1.png']).toBeDefined();
    await expect(decodePNG(files['qr-batch-50.png']!)).resolves.toBe(
      'https://example.com/batch-50',
    );
  });

  it('rejects oversized batches', async () => {
    const app = await setup({ MAX_BATCH_SIZE: '3' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/batch',
      payload: {
        items: [{ data: 'a' }, { data: 'b' }, { data: 'c' }, { data: 'd' }],
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it('enforces API key authentication when configured', async () => {
    const app = await setup({ API_KEY: 'super-secret' });
    const payload = { data: 'protected' };
    const denied = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/generate',
      payload,
    });
    expect(denied.statusCode).toBe(401);

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/generate',
      headers: { 'x-api-key': 'super-secret' },
      payload,
    });
    expect(allowed.statusCode).toBe(200);

    const health = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(health.statusCode).toBe(200);
  });

  it('applies rate limiting when enabled', async () => {
    const app = await setup({
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX: '2',
    });
    expect((await app.inject({ method: 'GET', url: '/api/v1/health' })).statusCode).toBe(
      200,
    );
    expect((await app.inject({ method: 'GET', url: '/api/v1/health' })).statusCode).toBe(
      200,
    );
    const limited = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().error).toBe('TooManyRequests');
  });

  it('runs asynchronous batch jobs and serves the archive', async () => {
    const app = await setup();
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/qr/batch/jobs',
      payload: {
        format: 'svg',
        size: 256,
        items: [
          { data: 'job-1', filename: 'job-one' },
          { data: 'job-2', filename: 'job-two' },
        ],
      },
    });
    expect(created.statusCode).toBe(202);
    const job = created.json() as { id: string; status: string };
    expect(job.status).toBe('pending');

    let status: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const poll = await app.inject({
        method: 'GET',
        url: `/api/v1/qr/batch/jobs/${job.id}`,
      });
      status = poll.json() as Record<string, unknown>;
      if (status.status === 'completed') break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(status.status).toBe('completed');
    expect(status.completed).toBe(2);

    const download = await app.inject({
      method: 'GET',
      url: `/api/v1/qr/batch/jobs/${job.id}/download`,
    });
    expect(download.statusCode).toBe(200);
    const files = unzip(download.rawPayload);
    expect(Object.keys(files).sort()).toEqual(['job-one.svg', 'job-two.svg']);

    const invalidId = await app.inject({
      method: 'GET',
      url: '/api/v1/qr/batch/jobs/not-a-uuid',
    });
    expect(invalidId.statusCode).toBe(400);
  });
});
