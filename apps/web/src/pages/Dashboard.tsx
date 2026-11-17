import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  Braces,
  CheckCircle2,
  Clock3,
  Download,
  Gauge,
  Layers3,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import type { QRDesign } from '@qr-studio/shared';
import { Badge, Button, EmptyState } from '../components/ui.js';
import { getHealth } from '../lib/api.js';
import { getHistory, removeDesign, type SavedDesign } from '../lib/history.js';
import type { View } from '../lib/types.js';

const FEATURES = [
  {
    icon: <Sparkles size={18} />,
    title: 'Visual editor',
    text: 'Shape every module, corner, color and gradient with instant feedback.',
  },
  {
    icon: <ShieldCheck size={18} />,
    title: 'Scannable by design',
    text: 'Quiet zones, error correction and readability warnings keep codes reliable.',
  },
  {
    icon: <Boxes size={18} />,
    title: 'Batch generation',
    text: 'Hundreds of QR codes, custom filenames and a single ZIP download.',
  },
  {
    icon: <Braces size={18} />,
    title: 'REST API first',
    text: 'The same engine is available programmatically through a documented API.',
  },
];

export function Dashboard({
  onNavigate,
  onOpenDesign,
}: {
  onNavigate: (view: View) => void;
  onOpenDesign: (entry: SavedDesign) => void;
}) {
  const [history, setHistory] = useState<SavedDesign[]>(getHistory());
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getHealth>> | null>(
    null,
  );

  useEffect(() => {
    void getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="space-y-8">
      <section className="card relative overflow-hidden p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge tone="accent">
            <Zap size={12} /> Ready to generate
          </Badge>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Beautiful QR codes,
            <br />
            <span className="text-accent">built to be scanned.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            QR Studio is your self-hosted workspace for creating, customizing and
            exporting QR codes — interactively or through a single API call.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={() => onNavigate('editor')}>
              <QrCode size={17} /> New QR code
            </Button>
            <Button size="lg" onClick={() => onNavigate('batch')}>
              <Layers3 size={17} /> Batch generator
            </Button>
            <Button variant="ghost" size="lg" onClick={() => onNavigate('docs')}>
              API reference <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Service',
            value: health?.status === 'ok' ? 'Online' : 'Offline',
            icon: <Gauge size={18} />,
            tone: health?.status === 'ok' ? 'success' : 'danger',
          },
          {
            label: 'Max batch size',
            value: health ? String(health.limits.maxBatchSize) : '—',
            icon: <Boxes size={18} />,
            tone: 'accent',
          },
          {
            label: 'Concurrency',
            value: health ? String(health.limits.batchConcurrency) : '—',
            icon: <Zap size={18} />,
            tone: 'neutral',
          },
          {
            label: 'API version',
            value: health ? health.version : '—',
            icon: <CheckCircle2 size={18} />,
            tone: 'neutral',
          },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-panel2 text-accent">
              {stat.icon}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted">
                {stat.label}
              </div>
              <div className="mt-1 text-lg font-semibold text-ink">{stat.value}</div>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">What you can do</h2>
            <p className="text-xs text-muted">
              Everything runs on your own infrastructure.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card p-5 transition hover:border-accent/40 hover:bg-panel2/70"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
                {feature.icon}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Clock3 size={17} className="text-accent" /> Recent designs
            </h2>
            <p className="text-xs text-muted">
              Saved locally in this browser when you download a QR code.
            </p>
          </div>
          {history.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                localStorage.removeItem('qr-studio:history');
                setHistory([]);
              }}
            >
              <Trash2 size={13} /> Clear
            </Button>
          )}
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon={<Download size={20} />}
            title="No designs yet"
            description="Create and download your first QR code in the editor. It will appear here for quick access."
            action={
              <Button size="sm" variant="primary" onClick={() => onNavigate('editor')}>
                Open editor
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="card flex items-center gap-3 p-4 transition hover:border-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">
                    {entry.name}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-muted">
                    {entry.data}
                  </div>
                  <div className="mt-1 text-[10px] text-muted">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onOpenDesign(entry)}
                  aria-label={`Open ${entry.name}`}
                >
                  Open
                </Button>
                <button
                  type="button"
                  onClick={() => setHistory(removeDesign(entry.id))}
                  className="text-muted transition hover:text-danger"
                  aria-label="Remove design"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Need to automate QR creation?
          </h2>
          <p className="mt-1 text-xs text-muted">
            Use <code className="font-mono text-accent">POST /api/v1/qr/batch</code> to
            generate an entire ZIP archive in one request.
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate('docs')}>
          View API docs <ArrowRight size={15} />
        </Button>
      </section>
    </div>
  );
}
