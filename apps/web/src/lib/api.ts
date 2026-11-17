export interface AppSettings {
  apiBaseUrl: string;
  apiKey: string;
  defaultSize: number;
  defaultFormat: 'png' | 'svg';
}

const SETTINGS_KEY = 'qr-studio:settings';

export const DEFAULT_SETTINGS: AppSettings = {
  apiBaseUrl: '/api',
  apiKey: '',
  defaultSize: 1024,
  defaultFormat: 'png',
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export class APIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const settings = getSettings();
  const headers = new Headers(init?.headers);
  if (!headers.has('content-type') && init?.body) {
    headers.set('content-type', 'application/json');
  }
  if (settings.apiKey) {
    headers.set('x-api-key', settings.apiKey);
  }
  const base = settings.apiBaseUrl.replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let details: unknown;
    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
      details = body;
    } catch {
      message = response.status === 401 ? 'Invalid API key' : message;
    }
    throw new APIError(message, response.status, details);
  }
  return response;
}

export async function generateQRFile(payload: unknown): Promise<Blob> {
  const response = await apiFetch('/v1/qr/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.blob();
}

export interface BatchJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  completed: number;
  failed: number;
  progress: number;
  archiveName: string;
  downloadUrl: string | null;
  error: string | null;
}

export async function createBatchJob(payload: unknown): Promise<BatchJob> {
  const response = await apiFetch('/v1/qr/batch/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return (await response.json()) as BatchJob;
}

export async function getBatchJob(id: string): Promise<BatchJob> {
  const response = await apiFetch(`/v1/qr/batch/jobs/${encodeURIComponent(id)}`);
  return (await response.json()) as BatchJob;
}

export async function downloadBatchJob(job: BatchJob): Promise<void> {
  const response = await apiFetch(`/v1/qr/batch/jobs/${job.id}/download`);
  const blob = await response.blob();
  downloadBlob(blob, job.archiveName);
}

export async function getHealth(): Promise<{
  status: string;
  version: string;
  limits: { maxBatchSize: number; batchConcurrency: number };
}> {
  const response = await apiFetch('/v1/health');
  return (await response.json()) as Awaited<ReturnType<typeof getHealth>>;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, filename: string, mime: string): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}
