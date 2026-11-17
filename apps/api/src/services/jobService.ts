import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import archiver from 'archiver';
import { generateQRCodeBatch } from '@qr-studio/qr-engine';
import { sanitizeFilename, type BatchRequest } from '@qr-studio/shared';
import type { AppConfig } from '../config.js';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  total: number;
  processed: number;
  completed: number;
  failed: number;
  archiveName: string;
  filePath?: string;
  error?: string;
}

export class JobNotFoundError extends Error {
  constructor() {
    super('Job not found');
    this.name = 'JobNotFoundError';
  }
}

export class JobService {
  private readonly jobs = new Map<string, Job>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly config: AppConfig) {
    this.cleanupTimer = setInterval(
      () => void this.cleanup(),
      Math.min(config.JOB_TTL_MINUTES * 60_000, 60_000),
    );
    this.cleanupTimer.unref();
  }

  get(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) {
      throw new JobNotFoundError();
    }
    return job;
  }

  async create(batch: BatchRequest): Promise<Job> {
    const id = randomUUID();
    const now = Date.now();
    const job: Job = {
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      total: batch.items.length,
      processed: 0,
      completed: 0,
      failed: 0,
      archiveName: sanitizeFilename(batch.archiveName, 'qr-studio-batch', 'zip'),
    };
    this.jobs.set(id, job);
    setImmediate(() => void this.process(id, batch));
    return { ...job };
  }

  private async process(id: string, batch: BatchRequest): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    job.status = 'processing';
    job.updatedAt = Date.now();
    const directory = path.resolve(this.config.TEMP_PATH, 'jobs');
    const filePath = path.join(directory, `${id}.zip`);
    job.filePath = filePath;

    try {
      await mkdir(directory, { recursive: true });
      const output = createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 6 } });
      const finished = new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', reject);
        archive.on('error', reject);
      });
      archive.pipe(output);

      for await (const entry of generateQRCodeBatch(batch, {
        concurrency: this.config.BATCH_CONCURRENCY,
      })) {
        if (entry.content !== undefined) {
          archive.append(entry.content, { name: entry.filename });
          job.completed += 1;
        } else {
          job.failed += 1;
        }
        job.processed += 1;
        job.updatedAt = Date.now();
      }

      await archive.finalize();
      await finished;
      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Batch job failed';
      await unlink(filePath).catch(() => undefined);
    } finally {
      job.updatedAt = Date.now();
    }
  }

  async resolveDownload(job: Job): Promise<string | null> {
    if (job.status !== 'completed' || !job.filePath) {
      return null;
    }
    try {
      await stat(job.filePath);
      return job.filePath;
    } catch {
      return null;
    }
  }

  private async cleanup(): Promise<void> {
    const cutoff = Date.now() - this.config.JOB_TTL_MINUTES * 60_000;
    for (const job of this.jobs.values()) {
      if (job.updatedAt > cutoff) continue;
      if (job.filePath) {
        await unlink(job.filePath).catch(() => undefined);
      }
      this.jobs.delete(job.id);
    }
  }

  stop(): void {
    clearInterval(this.cleanupTimer);
  }
}
