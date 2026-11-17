import { ArrowUpRight, BookOpen, Copy, Terminal } from 'lucide-react';
import { Badge, Button } from '../components/ui.js';
import { useToast } from '../components/Toast.js';

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/health',
    description: 'Service health and configured limits.',
  },
  {
    method: 'GET',
    path: '/api/v1/qr/formats',
    description: 'Supported output formats and MIME types.',
  },
  {
    method: 'GET',
    path: '/api/v1/qr/styles',
    description: 'Available dot styles, corner styles and error correction levels.',
  },
  {
    method: 'POST',
    path: '/api/v1/qr/generate',
    description: 'Generate one PNG or SVG QR code with a custom filename.',
  },
  {
    method: 'POST',
    path: '/api/v1/qr/batch',
    description: 'Generate many QR codes and stream one ZIP archive.',
  },
  {
    method: 'POST',
    path: '/api/v1/qr/batch/jobs',
    description: 'Queue an asynchronous batch job (recommended for large batches).',
  },
  {
    method: 'GET',
    path: '/api/v1/qr/batch/jobs/:jobId',
    description: 'Poll job status, progress and result counts.',
  },
  {
    method: 'GET',
    path: '/api/v1/qr/batch/jobs/:jobId/download',
    description: 'Download the completed ZIP archive.',
  },
];

const SINGLE_EXAMPLE = `curl -X POST http://localhost:3000/api/v1/qr/generate \\
  -H 'Content-Type: application/json' \\
  -o example-website.png \\
  -d '{
    "data": "https://example.com",
    "filename": "example-website",
    "format": "png",
    "size": 1024,
    "design": {
      "dots": { "type": "rounded", "color": "#111111" },
      "background": { "transparent": true },
      "errorCorrectionLevel": "H"
    }
  }'`;

const BATCH_EXAMPLE = `curl -X POST http://localhost:3000/api/v1/qr/batch \\
  -H 'Content-Type: application/json' \\
  -o batch.zip \\
  -d '{
    "format": "png",
    "size": 1024,
    "design": { "background": { "transparent": true } },
    "items": [
      { "data": "https://example.com/1", "filename": "qr-page-1" },
      { "data": "https://example.com/2", "filename": "qr-page-2" }
    ]
  }'`;

export function Docs() {
  const toast = useToast();

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast('Example copied', 'success');
    } catch {
      toast('Clipboard unavailable', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Developer</Badge>
          <span className="text-[11px] text-muted">OpenAPI 3.0</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          API reference
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Generate QR codes from any application using the same engine as the editor.
        </p>
      </header>

      <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">Interactive Swagger UI</h2>
            <p className="text-xs text-muted">
              Try every endpoint directly in your browser at{' '}
              <code className="font-mono text-accent">/api/v1/docs</code>
            </p>
          </div>
        </div>
        <a href="/api/v1/docs" target="_blank" rel="noreferrer">
          <Button variant="primary">
            Open Swagger UI <ArrowUpRight size={15} />
          </Button>
        </a>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Endpoints</h2>
        </div>
        <div className="divide-y divide-line">
          {ENDPOINTS.map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className={`w-14 shrink-0 font-mono text-[11px] font-bold ${
                  endpoint.method === 'GET' ? 'text-success' : 'text-accent'
                }`}
              >
                {endpoint.method}
              </span>
              <code className="shrink-0 font-mono text-xs text-ink">
                {endpoint.path}
              </code>
              <span className="text-xs text-muted sm:ml-auto sm:text-right">
                {endpoint.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {[
          {
            title: 'Generate one QR code',
            code: SINGLE_EXAMPLE,
          },
          {
            title: 'Generate a batch ZIP',
            code: BATCH_EXAMPLE,
          },
        ].map((example) => (
          <section key={example.title} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Terminal size={15} className="text-accent" /> {example.title}
              </h2>
              <Button size="sm" variant="ghost" onClick={() => void copy(example.code)}>
                <Copy size={13} /> Copy
              </Button>
            </div>
            <pre className="overflow-x-auto p-5 text-[11px] leading-relaxed text-muted">
              <code>{example.code}</code>
            </pre>
          </section>
        ))}
      </div>

      <section className="card space-y-4 p-6 text-xs leading-relaxed text-muted">
        <h2 className="text-sm font-semibold text-ink">Authentication & limits</h2>
        <p>
          When <code className="font-mono text-accent">API_KEY</code> is set on the
          server, send it with every generation request using the{' '}
          <code className="font-mono text-accent">x-api-key</code> header. Health and
          documentation endpoints stay public.
        </p>
        <p>
          Batch size, concurrency, payload size and rate limiting are configurable
          through environment variables. Filenames are sanitized server-side and
          duplicate names are made unique automatically.
        </p>
        <p>
          Set <code className="font-mono text-accent">apiBaseUrl</code> and{' '}
          <code className="font-mono text-accent">API key</code> in Settings if the
          API lives on a different origin.
        </p>
      </section>
    </div>
  );
}
