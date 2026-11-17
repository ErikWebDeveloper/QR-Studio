import type { Color, Gradient } from '@qr-studio/shared';
import { Field, Segmented, Slider, ToggleRow } from './ui.js';

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const safeColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#000000';
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          type="color"
          value={safeColor}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 rounded-lg"
          aria-label={`${label} color picker`}
        />
        <input
          className="input font-mono text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-label={`${label} color value`}
        />
      </div>
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  allowGradient = true,
}: {
  label: string;
  value: Color;
  onChange: (value: Color) => void;
  allowGradient?: boolean;
}) {
  const gradient = typeof value !== 'string' ? value : null;

  const setGradient = (patch: Partial<Gradient>) => {
    const base: Gradient = gradient ?? {
      type: 'linear',
      start: typeof value === 'string' ? value : '#7c5cff',
      end: '#4338ca',
      rotation: 45,
    };
    onChange({ ...base, ...patch });
  };

  return (
    <div className="space-y-4">
      {allowGradient && (
        <ToggleRow
          label="Use gradient"
          checked={gradient !== null}
          onChange={(enabled) =>
            onChange(
              enabled
                ? {
                    type: 'linear',
                    start: typeof value === 'string' ? value : value.start,
                    end: '#4338ca',
                    rotation: 45,
                  }
                : gradient
                  ? gradient.start
                  : '#000000',
            )
          }
        />
      )}
      {gradient ? (
        <>
          <Field label="Gradient type">
            <Segmented
              options={[
                { value: 'linear', label: 'Linear' },
                { value: 'radial', label: 'Radial' },
              ]}
              value={gradient.type}
              onChange={(type) => setGradient({ type })}
            />
          </Field>
          <ColorInput
            label="Start color"
            value={gradient.start}
            onChange={(start) => setGradient({ start })}
          />
          <ColorInput
            label="End color"
            value={gradient.end}
            onChange={(end) => setGradient({ end })}
          />
          {gradient.type === 'linear' && (
            <Slider
              label="Rotation"
              value={gradient.rotation}
              min={0}
              max={360}
              suffix="°"
              onChange={(rotation) => setGradient({ rotation })}
            />
          )}
        </>
      ) : (
        <ColorInput
          label={label}
          value={typeof value === 'string' ? value : value.start}
          onChange={onChange}
        />
      )}
    </div>
  );
}
