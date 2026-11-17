import { useEffect, useState } from 'react';
import { AlertTriangle, Grid2X2, Sun } from 'lucide-react';

export function QRPreview({
  svg,
  transparent,
  error,
}: {
  svg: string;
  transparent: boolean;
  error?: string;
}) {
  const [checker, setChecker] = useState(transparent);
  useEffect(() => setChecker(transparent), [transparent]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-ink">Live preview</h2>
          <p className="text-[11px] text-muted">Updates as you customize</p>
        </div>
        <div className="flex rounded-lg border border-line bg-panel2 p-0.5">
          <button
            type="button"
            onClick={() => setChecker(false)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition ${
              checker ? 'text-muted hover:text-ink' : 'bg-line text-ink'
            }`}
          >
            <Sun size={13} /> Light
          </button>
          <button
            type="button"
            onClick={() => setChecker(true)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] transition ${
              checker ? 'bg-line text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <Grid2X2 size={13} /> Checker
          </button>
        </div>
      </div>

      <div className="p-5">
        <div
          className={`relative aspect-square w-full overflow-hidden rounded-2xl border border-line ${
            checker ? 'checkerboard' : 'bg-white'
          }`}
        >
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-panel2/95 px-6 text-center">
              <AlertTriangle size={22} className="text-danger" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          ) : (
            <div
              className="qr-preview absolute inset-3"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
        </div>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          {transparent
            ? 'Transparency enabled — exported files keep real alpha pixels.'
            : 'Solid background — export matches this preview exactly.'}
        </p>
      </div>
    </div>
  );
}
