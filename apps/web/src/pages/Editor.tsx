import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Braces,
  Palette,
  Download,
  ImagePlus,
  Layers3,
  Paintbrush,
  ScanLine,
  Shapes,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
  ERROR_CORRECTION_LEVELS,
  sanitizeFilename,
  type Color,
  type CornersDotOptions,
  type CornersSquareOptions,
  type DotsOptions,
  type LogoOptions,
  type OutputFormat,
  type QRDesign,
} from '@qr-studio/shared';
import { generateQRCodeSVGString } from '@qr-studio/qr-engine/svg';
import { validateQRCodeOptions } from '@qr-studio/qr-engine/validation';
import { ColorField } from '../components/ColorField.js';
import { QRPreview } from '../components/QRPreview.js';
import { Badge, Button, Field, Section, Slider, ToggleRow } from '../components/ui.js';
import { useToast } from '../components/Toast.js';
import {
  downloadBlob,
  downloadText,
  generateQRFile,
  getSettings,
} from '../lib/api.js';
import {
  cloneDesign,
  DEFAULT_DESIGN,
  PRESETS,
} from '../lib/presets.js';
import { saveDesign } from '../lib/history.js';

const DRAFT_KEY = 'qr-studio:editor-draft';

interface Draft {
  data: string;
  design: QRDesign;
}

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Draft;
      if (parsed.data && parsed.design) return parsed;
    }
  } catch {
    /* ignore malformed draft */
  }
  return { data: 'https://example.com', design: cloneDesign(DEFAULT_DESIGN) };
}

const labelize = (value: string) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

export function Editor() {
  const toast = useToast();
  const settings = useMemo(getSettings, []);
  const initial = useMemo(loadDraft, []);
  const [data, setData] = useState(initial.data);
  const [name, setName] = useState('My QR code');
  const [filename, setFilename] = useState('my-qr-code');
  const [design, setDesign] = useState<QRDesign>(initial.design);
  const [format, setFormat] = useState<OutputFormat>(settings.defaultFormat);
  const [size, setSize] = useState(settings.defaultSize);
  const [busy, setBusy] = useState(false);

  const updateDraft = (next: Partial<Draft>) => {
    const draft = { data, design, ...next };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  };

  const preview = useMemo(() => {
    try {
      if (!data.trim()) return { svg: '', error: 'Enter content to see a preview.' };
      return {
        svg: generateQRCodeSVGString(data, design, 512),
        error: undefined,
      };
    } catch (error) {
      return {
        svg: '',
        error: error instanceof Error ? error.message : 'Invalid configuration',
      };
    }
  }, [data, design]);

  const readability = useMemo(
    () => validateQRCodeOptions(data, design),
    [data, design],
  );

  const setDots = (patch: Partial<DotsOptions>) => {
    setDesign((current) => ({ ...current, dots: { ...current.dots, ...patch } }));
  };
  const setCornersSquare = (patch: Partial<CornersSquareOptions>) => {
    setDesign((current) => ({
      ...current,
      cornersSquare: { ...current.cornersSquare, ...patch },
    }));
  };
  const setCornersDot = (patch: Partial<CornersDotOptions>) => {
    setDesign((current) => ({
      ...current,
      cornersDot: { ...current.cornersDot, ...patch },
    }));
  };
  const setBackground = (patch: Partial<QRDesign['background']>) => {
    setDesign((current) => ({
      ...current,
      background: { ...current.background, ...patch },
    }));
  };
  const setLogo = (patch: Partial<LogoOptions>) => {
    setDesign((current) => ({
      ...current,
      logo: current.logo ? { ...current.logo, ...patch } : undefined,
    }));
  };

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (!LOGO_MIME_TYPES.includes(file.type)) {
      toast('Unsupported logo format. Use PNG, JPEG, WebP or SVG.', 'error');
      return;
    }
    if (file.size > 1_500_000) {
      toast('Logo must be smaller than 1.5 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDesign((current) => ({
        ...current,
        errorCorrectionLevel: 'H',
        logo: {
          dataUrl: String(reader.result),
          size: 0.22,
          margin: 4,
          background: true,
          backgroundColor: '#ffffff',
          borderRadius: 8,
        },
      }));
      toast('Logo added. Error correction set to H.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const recordHistory = () => {
    saveDesign({
      id: `${Date.now()}`,
      name: name || filename,
      data,
      design: design as unknown,
      createdAt: new Date().toISOString(),
    });
  };

  const handleDownload = async () => {
    if (!readability.valid || preview.error) {
      toast('Fix the configuration before downloading.', 'error');
      return;
    }
    setBusy(true);
    try {
      const safeName = sanitizeFilename(filename, 'qr-code', format);
      if (format === 'svg') {
        const svg = generateQRCodeSVGString(data, design, size);
        downloadText(svg, safeName, 'image/svg+xml;charset=utf-8');
      } else {
        const blob = await generateQRFile({ data, filename, format, size, design });
        downloadBlob(blob, safeName);
      }
      updateDraft({});
      recordHistory();
      toast(`${safeName} downloaded`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Download failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyPayload = async () => {
    const payload = { data, filename, format, size, design };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast('API payload copied to clipboard', 'success');
    } catch {
      toast('Clipboard unavailable in this browser', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="accent">Editor</Badge>
            <span className="text-[11px] text-muted">Live rendering</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            QR Code Editor
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Design a scannable QR code and export it as PNG or SVG.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyPayload}>
            <Braces size={15} /> Copy API payload
          </Button>
          <Button variant="primary" onClick={handleDownload} loading={busy}>
            <Download size={15} /> Download {format.toUpperCase()}
          </Button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
        <div className="space-y-4">
          <Section
            title="Content"
            description="What should this QR code encode?"
            icon={<ScanLine size={17} />}
          >
            <Field
              label="URL or text"
              hint="Up to 4000 characters. Longer content creates denser codes."
            >
              <textarea
                className="input min-h-[92px] resize-y"
                value={data}
                onChange={(event) => setData(event.target.value)}
                placeholder="https://example.com"
                spellCheck={false}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name">
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Summer campaign"
                />
              </Field>
              <Field label="Filename">
                <input
                  className="input"
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  placeholder="my-qr-code"
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Quick styles"
            description="Start from a curated look, then fine-tune it."
            icon={<Paintbrush size={17} />}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDesign(cloneDesign(preset.design));
                    toast(`${preset.name} style applied`, 'success');
                  }}
                  className="rounded-xl border border-line bg-panel2 p-3 text-left transition hover:border-accent/60 hover:bg-accent-soft"
                >
                  <span className="block text-xs font-semibold text-ink">
                    {preset.name}
                  </span>
                  <span className="mt-1 block text-[10px] leading-snug text-muted">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section
            title="Dots"
            description="Shape and color of the QR modules."
            icon={<Shapes size={17} />}
          >
            <Field label="Dot shape">
              <select
                className="input"
                value={design.dots.type}
                onChange={(event) =>
                  setDots({ type: event.target.value as DotsOptions['type'] })
                }
              >
                {DOT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </select>
            </Field>
            <ColorField
              label="Dot color"
              value={design.dots.color as Color}
              onChange={(color) => setDots({ color })}
            />
          </Section>

          <Section
            title="Corners"
            description="Position markers can be styled independently."
            icon={<Layers3 size={17} />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Outer corners">
                <select
                  className="input"
                  value={design.cornersSquare.type}
                  onChange={(event) =>
                    setCornersSquare({
                      type: event.target.value as CornersSquareOptions['type'],
                    })
                  }
                >
                  {CORNER_SQUARE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelize(type)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Inner dots">
                <select
                  className="input"
                  value={design.cornersDot.type}
                  onChange={(event) =>
                    setCornersDot({
                      type: event.target.value as CornersDotOptions['type'],
                    })
                  }
                >
                  {CORNER_DOT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelize(type)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <ColorField
              label="Outer corner color"
              value={design.cornersSquare.color as Color}
              onChange={(color) => setCornersSquare({ color })}
            />
            <ColorField
              label="Inner dot color"
              value={design.cornersDot.color as Color}
              onChange={(color) => setCornersDot({ color })}
            />
          </Section>

          <Section
            title="Background"
            description="Solid, gradient or fully transparent."
            icon={<Palette size={17} />}
          >
            <ToggleRow
              label="Transparent background"
              hint="Produces real alpha transparency in PNG and SVG."
              checked={design.background.transparent}
              onChange={(transparent) => setBackground({ transparent })}
            />
            {!design.background.transparent && (
              <ColorField
                label="Background color"
                value={
                  design.background.gradient ?? design.background.color
                }
                onChange={(value) =>
                  setBackground(
                    typeof value === 'string'
                      ? { color: value, gradient: undefined }
                      : { gradient: value },
                  )
                }
              />
            )}
            <Slider
              label="Rounded corners"
              value={design.background.rounded}
              min={0}
              max={50}
              suffix="%"
              onChange={(rounded) => setBackground({ rounded })}
            />
          </Section>

          <Section
            title="Center logo"
            description="Add a brand mark in the middle of the QR."
            icon={<ImagePlus size={17} />}
          >
            {!design.logo ? (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-panel2/50 px-4 py-7 text-center transition hover:border-accent/60 hover:bg-accent-soft">
                <Upload size={20} className="text-accent" />
                <span className="text-xs font-medium text-ink">
                  Upload a logo
                </span>
                <span className="text-[11px] text-muted">
                  PNG, JPEG, WebP or SVG · max 1.5 MB
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => handleLogo(event.target.files?.[0])}
                />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-line bg-panel2 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs text-ink">
                    <ImagePlus size={15} className="text-accent" />
                    Logo embedded
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDesign((current) => ({ ...current, logo: undefined }))}
                  >
                    <Trash2 size={13} /> Remove
                  </Button>
                </div>
                <Slider
                  label="Logo size"
                  value={Math.round(design.logo.size * 100)}
                  min={5}
                  max={40}
                  suffix="%"
                  onChange={(value) => setLogo({ size: value / 100 })}
                />
                <Slider
                  label="Logo margin"
                  value={design.logo.margin}
                  min={0}
                  max={20}
                  suffix="%"
                  onChange={(margin) => setLogo({ margin })}
                />
                <Slider
                  label="Background radius"
                  value={design.logo.borderRadius}
                  min={0}
                  max={50}
                  suffix="%"
                  onChange={(borderRadius) => setLogo({ borderRadius })}
                />
                <ToggleRow
                  label="Logo background"
                  checked={design.logo.background}
                  onChange={(background) => setLogo({ background })}
                />
                {design.logo.background && (
                  <ColorField
                    label="Logo background color"
                    value={design.logo.backgroundColor}
                    onChange={(backgroundColor) =>
                      setLogo({
                        backgroundColor:
                          typeof backgroundColor === 'string'
                            ? backgroundColor
                            : backgroundColor.start,
                      })
                    }
                    allowGradient={false}
                  />
                )}
              </>
            )}
          </Section>

          <Section
            title="Export"
            description="Format, resolution and scanner tolerance."
            icon={<Download size={17} />}
          >
            <Field label="Format">
              <div className="grid grid-cols-2 gap-2">
                {(['png', 'svg'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormat(option)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-semibold uppercase transition ${
                      format === option
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-panel2 text-muted hover:text-ink'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Field>
            <Slider
              label={format === 'png' ? 'Export resolution' : 'SVG base size'}
              value={size}
              min={256}
              max={4096}
              step={64}
              suffix="px"
              onChange={setSize}
            />
            <Slider
              label="Quiet zone"
              value={design.margin}
              min={0}
              max={12}
              suffix=" modules"
              onChange={(margin) => setDesign((current) => ({ ...current, margin }))}
            />
            <Field label="Error correction">
              <select
                className="input"
                value={design.errorCorrectionLevel}
                onChange={(event) =>
                  setDesign((current) => ({
                    ...current,
                    errorCorrectionLevel: event.target
                      .value as QRDesign['errorCorrectionLevel'],
                  }))
                }
              >
                {ERROR_CORRECTION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level} —{' '}
                    {{
                      L: 'Low capacity / low tolerance',
                      M: 'Balanced',
                      Q: 'High tolerance',
                      H: 'Maximum tolerance (recommended)',
                    }[level]}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-8 xl:self-start">
          <QRPreview
            svg={preview.svg}
            transparent={design.background.transparent}
            error={preview.error}
          />

          {(readability.warnings.length > 0 || !readability.valid) && (
            <div className="card border-warning/30 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                <AlertTriangle size={16} /> Readability checks
              </div>
              <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted">
                {!readability.valid &&
                  readability.errors.map((issue, index) => (
                    <li key={`error-${index}`} className="text-danger">
                      • {issue}
                    </li>
                  ))}
                {readability.warnings.map((warning, index) => (
                  <li key={`warning-${index}`}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-ink">Current design</h3>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt className="text-muted">Dots</dt>
                <dd className="mt-1 text-ink">{design.dots.type}</dd>
              </div>
              <div>
                <dt className="text-muted">Corners</dt>
                <dd className="mt-1 text-ink">{design.cornersSquare.type}</dd>
              </div>
              <div>
                <dt className="text-muted">Background</dt>
                <dd className="mt-1 text-ink">
                  {design.background.transparent ? 'Transparent' : 'Solid'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Correction</dt>
                <dd className="mt-1 text-ink">{design.errorCorrectionLevel}</dd>
              </div>
              <div>
                <dt className="text-muted">Output</dt>
                <dd className="mt-1 text-ink">
                  {format.toUpperCase()} · {size}px
                </dd>
              </div>
              <div>
                <dt className="text-muted">Logo</dt>
                <dd className="mt-1 text-ink">{design.logo ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
