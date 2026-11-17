import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  LoaderCircle,
  Paintbrush,
  Play,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
  ERROR_CORRECTION_LEVELS,
  sanitizeFilename,
  type OutputFormat,
  type QRDesign,
  type QRDesignOverride,
} from '@qr-studio/shared';
import { generateQRCodeSVGString } from '@qr-studio/qr-engine/svg';
import { Badge, Button, Field, Section, Slider, ToggleRow } from '../components/ui.js';
import { useToast } from '../components/Toast.js';
import {
  createBatchJob,
  downloadBatchJob,
  getBatchJob,
  getSettings,
  type BatchJob,
} from '../lib/api.js';
import { parseCSV, parseJSONEntries, type ParsedEntry } from '../lib/csv.js';
import { cloneDesign, DEFAULT_DESIGN } from '../lib/presets.js';

type Mode = 'manual' | 'csv' | 'json';
const DRAFT_KEY = 'qr-studio:editor-draft';

interface Entry extends ParsedEntry {
  color?: string;
}

function readEditorDesign(): QRDesign | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { design: QRDesign }).design ?? null;
  } catch {
    return null;
  }
}

export function Batch() {
  const toast = useToast();
  const settings = useMemo(getSettings, []);
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('manual');
  const [text, setText] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [design, setDesign] = useState<QRDesign>(() => cloneDesign(DEFAULT_DESIGN));
  const [perItemColors, setPerItemColors] = useState(false);
  const [format, setFormat] = useState<OutputFormat>(settings.defaultFormat);
  const [size, setSize] = useState(settings.defaultSize);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [parseError, setParseError] = useState('');

  const validEntries = entries.filter(
    (entry) => entry.data.trim().length > 0 && entry.data.length <= 4000,
  );
  const invalidEntries = entries.length - validEntries.length;

  useEffect(() => {
    if (!job || (job.status !== 'pending' && job.status !== 'processing')) return;
    const timer = window.setInterval(() => {
      void getBatchJob(job.id)
        .then((next) => {
          setJob(next);
          if (next.status === 'completed' || next.status === 'failed') {
            window.clearInterval(timer);
          }
        })
        .catch((error: unknown) => {
          window.clearInterval(timer);
          toast(error instanceof Error ? error.message : 'Could not poll job', 'error');
        });
    }, 700);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, toast]);

  const parseText = (value: string, selected: Mode) => {
    try {
      const parsed =
        selected === 'json' ? parseJSONEntries(value) : parseCSV(value);
      setEntries(parsed.map((entry) => ({ ...entry })));
      setParseError('');
      if (parsed.length === 0) {
        toast('No entries found in the input.', 'info');
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Parsing failed');
      toast('Could not parse the input.', 'error');
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    const content = await file.text();
    const detected: Mode = file.name.toLowerCase().endsWith('.json')
      ? 'json'
      : 'csv';
    setMode(detected);
    setText(content);
    parseText(content, detected);
  };

  const updateEntry = (index: number, patch: Partial<Entry>) => {
    setEntries((current) =>
      current.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const buildPayload = () => ({
    format,
    size,
    design,
    archiveName: 'qr-studio-batch',
    items: validEntries.map((entry) => {
      const override: QRDesignOverride | undefined =
        perItemColors && entry.color ? { dots: { color: entry.color } } : undefined;
      return {
        data: entry.data,
        filename: entry.filename || undefined,
        name: entry.name || undefined,
        ...(override ? { design: override } : {}),
      };
    }),
  });

  const handleGenerate = async () => {
    if (validEntries.length === 0) {
      toast('Add at least one valid entry.', 'error');
      return;
    }
    setBusy(true);
    setJob(null);
    try {
      const created = await createBatchJob(buildPayload());
      setJob(created);
      toast(`Job queued for ${created.total} QR codes`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not queue batch', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!job) return;
    try {
      await downloadBatchJob(job);
      toast('ZIP archive downloaded', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Download failed', 'error');
    }
  };

  const previewEntries = validEntries.slice(0, 4);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="accent">Batch</Badge>
            <span className="text-[11px] text-muted">ZIP export</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Batch generator
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Turn a list of URLs into a named ZIP archive of QR codes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const loaded = readEditorDesign();
              if (loaded) {
                setDesign(loaded);
                toast('Design loaded from the editor', 'success');
              } else {
                toast('No saved editor design found', 'error');
              }
            }}
          >
            <Paintbrush size={15} /> Load editor design
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={busy}
            disabled={validEntries.length === 0}
          >
            <Play size={15} /> Generate {validEntries.length || ''} QR codes
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <Section
            title="Input"
            description="Paste URLs manually or upload a CSV / JSON file."
            icon={<Upload size={17} />}
          >
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'manual', label: 'Manual', icon: <Plus size={13} /> },
                  { id: 'csv', label: 'CSV', icon: <FileSpreadsheet size={13} /> },
                  { id: 'json', label: 'JSON', icon: <FileJson size={13} /> },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                    mode === option.id
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line bg-panel2 text-muted hover:text-ink'
                  }`}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
            <Field
              label={
                mode === 'json'
                  ? 'JSON array of entries'
                  : 'One entry per line: data, filename, name'
              }
              hint={
                mode === 'json'
                  ? 'Example: [{"data":"https://a.com","filename":"a"}]'
                  : 'Example: https://example.com, landing-page, Landing page'
              }
            >
              <textarea
                className="input min-h-[150px] resize-y font-mono text-xs"
                value={text}
                onChange={(event) => setText(event.target.value)}
                spellCheck={false}
                placeholder={
                  mode === 'json'
                    ? '[{"data":"https://example.com","filename":"example"}]'
                    : 'https://example.com/1, page-1, Page 1\nhttps://example.com/2, page-2, Page 2'
                }
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => parseText(text, mode)}>
                Parse entries
              </Button>
              <Button size="sm" onClick={() => fileInput.current?.click()}>
                <Upload size={13} /> Upload file
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />
            </div>
            {parseError && (
              <p className="flex items-center gap-2 text-xs text-danger">
                <AlertTriangle size={14} /> {parseError}
              </p>
            )}
          </Section>

          <Section
            title={`Entries (${entries.length})`}
            description="Review filenames and per-item overrides before generating."
            icon={<FileSpreadsheet size={17} />}
          >
            {entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-panel2/40 px-4 py-10 text-center text-xs text-muted">
                No entries yet. Paste a list above and press “Parse entries”.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">
                    <CheckCircle2 size={12} /> {validEntries.length} valid
                  </Badge>
                  {invalidEntries > 0 && (
                    <Badge tone="danger">
                      <XCircle size={12} /> {invalidEntries} invalid
                    </Badge>
                  )}
                  <Badge tone="neutral">ZIP: qr-studio-batch.zip</Badge>
                </div>

                <div className="max-h-[480px] overflow-auto rounded-xl border border-line">
                  <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-panel2 text-[10px] uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">#</th>
                        <th className="px-3 py-2.5 font-medium">Data</th>
                        <th className="px-3 py-2.5 font-medium">Filename</th>
                        {perItemColors && (
                          <th className="px-3 py-2.5 font-medium">Color</th>
                        )}
                        <th className="px-3 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {entries.map((entry, index) => {
                        const valid =
                          entry.data.trim().length > 0 && entry.data.length <= 4000;
                        return (
                          <tr key={index} className="hover:bg-panel2/40">
                            <td className="px-3 py-2 font-mono text-muted">
                              {index + 1}
                            </td>
                            <td className="max-w-[260px] px-3 py-2">
                              <input
                                className="input-sm w-full font-mono"
                                value={entry.data}
                                onChange={(event) =>
                                  updateEntry(index, { data: event.target.value })
                                }
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="input-sm w-full font-mono"
                                value={entry.filename}
                                onChange={(event) =>
                                  updateEntry(index, { filename: event.target.value })
                                }
                              />
                              <span className="mt-1 block text-[10px] text-muted">
                                → {sanitizeFilename(entry.filename, `qr-${index + 1}`, format)}
                              </span>
                            </td>
                            {perItemColors && (
                              <td className="px-3 py-2">
                                <input
                                  type="color"
                                  className="h-8 w-10 rounded-lg"
                                  value={entry.color ?? '#111118'}
                                  onChange={(event) =>
                                    updateEntry(index, { color: event.target.value })
                                  }
                                  aria-label={`Color for entry ${index + 1}`}
                                />
                              </td>
                            )}
                            <td className="px-3 py-2">
                              {valid ? (
                                <CheckCircle2 size={15} className="text-success" />
                              ) : (
                                <XCircle size={15} className="text-danger" />
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setEntries((current) =>
                                    current.filter((_, position) => position !== index),
                                  )
                                }
                                className="ml-3 text-muted transition hover:text-danger"
                                aria-label={`Remove entry ${index + 1}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {previewEntries.length > 0 && (
                  <div>
                    <p className="field-label">Preview</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {previewEntries.map((entry, index) => {
                        const itemDesign: QRDesign = perItemColors && entry.color
                          ? { ...design, dots: { ...design.dots, color: entry.color } }
                          : design;
                        return (
                          <div
                            key={index}
                            className="rounded-xl border border-line bg-panel2 p-2 text-center"
                          >
                            <div
                              className="qr-preview mx-auto aspect-square w-full max-w-[110px]"
                              dangerouslySetInnerHTML={{
                                __html: generateQRCodeSVGString(
                                  entry.data,
                                  itemDesign,
                                  256,
                                ),
                              }}
                            />
                            <p className="mt-2 truncate text-[10px] text-muted">
                              {sanitizeFilename(entry.filename, `qr-${index + 1}`, format)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <Section
            title="Shared design"
            description="Applied to every QR unless overridden."
            icon={<Paintbrush size={17} />}
          >
            <Field label="Dot shape">
              <select
                className="input"
                value={design.dots.type}
                onChange={(event) =>
                  setDesign((current) => ({
                    ...current,
                    dots: {
                      ...current.dots,
                      type: event.target.value as QRDesign['dots']['type'],
                    },
                  }))
                }
              >
                {DOT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Corner style">
              <select
                className="input"
                value={design.cornersSquare.type}
                onChange={(event) =>
                  setDesign((current) => ({
                    ...current,
                    cornersSquare: {
                      ...current.cornersSquare,
                      type: event.target.value as QRDesign['cornersSquare']['type'],
                    },
                  }))
                }
              >
                {CORNER_SQUARE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dot color">
                <input
                  type="color"
                  className="h-10 w-full rounded-lg"
                  value={
                    typeof design.dots.color === 'string' ? design.dots.color : '#111118'
                  }
                  onChange={(event) =>
                    setDesign((current) => ({
                      ...current,
                      dots: { ...current.dots, color: event.target.value },
                    }))
                  }
                />
              </Field>
              <Field label="Background">
                <input
                  type="color"
                  className="h-10 w-full rounded-lg"
                  value={design.background.color}
                  onChange={(event) =>
                    setDesign((current) => ({
                      ...current,
                      background: { ...current.background, color: event.target.value },
                    }))
                  }
                />
              </Field>
            </div>
            <ToggleRow
              label="Transparent background"
              checked={design.background.transparent}
              onChange={(transparent) =>
                setDesign((current) => ({
                  ...current,
                  background: { ...current.background, transparent },
                }))
              }
            />
            <ToggleRow
              label="Per-item colors"
              hint="Add a color column to the entry table."
              checked={perItemColors}
              onChange={setPerItemColors}
            />
            <Field label="Error correction">
              <select
                className="input"
                value={design.errorCorrectionLevel}
                onChange={(event) =>
                  setDesign((current) => ({
                    ...current,
                    errorCorrectionLevel: event.target.value as QRDesign['errorCorrectionLevel'],
                  }))
                }
              >
                {ERROR_CORRECTION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Format">
              <div className="grid grid-cols-2 gap-2">
                {(['png', 'svg'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormat(option)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase transition ${
                      format === option
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-panel2 text-muted'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Field>
            <Slider
              label="Export size"
              value={size}
              min={256}
              max={4096}
              step={64}
              suffix="px"
              onChange={setSize}
            />
          </Section>

          {job && (
            <div className="card space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">Generation job</h3>
                <Badge
                  tone={
                    job.status === 'completed'
                      ? 'success'
                      : job.status === 'failed'
                        ? 'danger'
                        : 'accent'
                  }
                >
                  {job.status === 'processing' || job.status === 'pending' ? (
                    <LoaderCircle size={12} className="animate-spin" />
                  ) : null}
                  {job.status}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <div className="text-base font-semibold text-ink">
                    {job.processed}/{job.total}
                  </div>
                  <div className="text-muted">Processed</div>
                </div>
                <div>
                  <div className="text-base font-semibold text-success">
                    {job.completed}
                  </div>
                  <div className="text-muted">Completed</div>
                </div>
                <div>
                  <div className="text-base font-semibold text-danger">
                    {job.failed}
                  </div>
                  <div className="text-muted">Failed</div>
                </div>
              </div>
              {job.error && <p className="text-xs text-danger">{job.error}</p>}
              {job.status === 'completed' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleDownload}
                >
                  <Download size={15} /> Download {job.archiveName}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
