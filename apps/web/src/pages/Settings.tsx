import { useEffect, useState } from 'react';
import { Database, KeyRound, Save, Server, Trash2 } from 'lucide-react';
import { Badge, Button, Field, Section, Slider } from '../components/ui.js';
import { useToast } from '../components/Toast.js';
import { getHealth, getSettings, saveSettings } from '../lib/api.js';

export function Settings() {
  const toast = useToast();
  const [settings, setSettings] = useState(getSettings);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof getHealth>> | null>(
    null,
  );

  useEffect(() => {
    void getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Badge tone="accent">Configuration</Badge>
          <span className="text-[11px] text-muted">Stored in this browser</span>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Configure how the web app talks to the QR Studio API.
        </p>
      </header>

      <Section
        title="API connection"
        description="Change these if the API runs on another host or requires a key."
        icon={<Server size={17} />}
      >
        <Field
          label="API base URL"
          hint="Use /api when web and API share a domain, or http://host:3001/api in development."
        >
          <input
            className="input font-mono"
            value={settings.apiBaseUrl}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                apiBaseUrl: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="API key" hint="Leave empty when API_KEY is not configured.">
          <div className="relative">
            <KeyRound
              size={15}
              className="pointer-events-none absolute left-3 top-3.5 text-muted"
            />
            <input
              type="password"
              className="input pl-9 font-mono"
              value={settings.apiKey}
              onChange={(event) =>
                setSettings((current) => ({ ...current, apiKey: event.target.value }))
              }
              placeholder="Optional"
              autoComplete="off"
            />
          </div>
        </Field>
        <Button
          variant="primary"
          onClick={() => {
            saveSettings(settings);
            toast('Settings saved', 'success');
          }}
        >
          <Save size={15} /> Save settings
        </Button>
      </Section>

      <Section
        title="Export defaults"
        description="Prefilled values for new QR codes."
        icon={<Save size={17} />}
      >
        <Field label="Default format">
          <div className="grid grid-cols-2 gap-2">
            {(['png', 'svg'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() =>
                  setSettings((current) => ({ ...current, defaultFormat: format }))
                }
                className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase transition ${
                  settings.defaultFormat === format
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-panel2 text-muted'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </Field>
        <Slider
          label="Default export size"
          value={settings.defaultSize}
          min={256}
          max={4096}
          step={64}
          suffix="px"
          onChange={(defaultSize) =>
            setSettings((current) => ({ ...current, defaultSize }))
          }
        />
      </Section>

      <Section
        title="Local data"
        description="History and drafts never leave this browser."
        icon={<Database size={17} />}
      >
        <Button
          variant="danger"
          onClick={() => {
            localStorage.removeItem('qr-studio:history');
            sessionStorage.removeItem('qr-studio:editor-draft');
            toast('Local history and drafts cleared', 'success');
          }}
        >
          <Trash2 size={15} /> Clear local data
        </Button>
      </Section>

      <div className="card flex items-center justify-between p-5 text-xs">
        <span className="text-muted">Server status</span>
        <span
          className={
            health?.status === 'ok' ? 'text-success' : 'text-danger'
          }
        >
          {health ? `${health.status} · v${health.version}` : 'Unavailable'}
        </span>
      </div>
    </div>
  );
}
