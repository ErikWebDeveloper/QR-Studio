import type { ReactNode } from 'react';
import {
  BookOpen,
  Boxes,
  LayoutDashboard,
  QrCode,
  Settings2,
  Sparkles,
  Workflow,
} from 'lucide-react';
import type { View } from '../lib/types.js';

const NAV: Array<{ id: View; label: string; icon: typeof QrCode }> = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'editor', label: 'QR Editor', icon: QrCode },
  { id: 'batch', label: 'Batch generator', icon: Boxes },
  { id: 'docs', label: 'API reference', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function Layout({
  view,
  onNavigate,
  children,
}: {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-line bg-panel/70 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:py-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-glow">
              <QrCode size={19} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight text-ink">
                QR Studio
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-muted">
                generator suite
              </span>
            </span>
          </button>
          <span className="rounded-full border border-accent/25 bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent lg:hidden">
            v1.0
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition lg:w-full ${
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-panel2 hover:text-ink'
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden px-5 lg:absolute lg:bottom-6 lg:block">
          <div className="rounded-xl border border-line bg-panel2/70 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-ink">
              <Sparkles size={14} className="text-accent" />
              Self-hosted & private
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              Your data never leaves this server. Generate and export locally.
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      <div className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-panel/90 px-3 py-1.5 text-[10px] text-muted shadow-panel backdrop-blur lg:hidden">
        <Workflow size={12} className="text-accent" />
        QR Studio
      </div>
    </div>
  );
}
