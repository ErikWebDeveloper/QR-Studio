import {
  dataSchema,
  designSchema,
  type Color,
  type QRDesign,
} from '@qr-studio/shared';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  design?: QRDesign;
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  navy: [0, 0, 128],
  silver: [192, 192, 192],
};

function parseColor(color: string): [number, number, number] | null {
  const named = NAMED_COLORS[color.toLowerCase()];
  if (named) return named;

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const full =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split('')
            .map((char) => char + char)
            .join('')
        : hex.slice(0, 6);
    if (!/^[0-9a-f]{6}$/i.test(full)) return null;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }

  const match = color.match(/^rgba?\(([\d\s.,%]+)\)$/i);
  if (!match) return null;
  const values = match[1]!
    .split(',')
    .slice(0, 3)
    .map((value) => Number(value.trim().replace('%', '')));
  if (values.length !== 3 || values.some((value) => Number.isNaN(value))) {
    return null;
  }
  return values.map((value) => (value <= 1 && match[1]!.includes('%') ? value * 255 : value)) as [
    number,
    number,
    number,
  ];
}

function luminance(color: [number, number, number]): number {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]) {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function isGradient(color: Color): color is Extract<Color, { type: string }> {
  return typeof color !== 'string';
}

export function validateQRCodeOptions(
  data: unknown,
  options: unknown,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const dataResult = dataSchema.safeParse(data);
  if (!dataResult.success) {
    errors.push('Data must be a non-empty string of at most 4000 characters.');
  }

  const designResult = designSchema.safeParse(options ?? {});
  if (!designResult.success) {
    for (const issue of designResult.error.issues.slice(0, 10)) {
      errors.push(`${issue.path.join('.') || 'design'}: ${issue.message}`);
    }
    return { valid: false, errors, warnings };
  }

  const design = designResult.data;
  const { dots, background, logo } = design;

  if (background.transparent && !background.gradient) {
    warnings.push(
      'Transparent QR codes must be placed on a light background to remain scannable.',
    );
  }
  if (design.margin < 4) {
    warnings.push('Keep a quiet zone of at least 4 modules for reliable scanning.');
  }
  if (design.errorCorrectionLevel === 'L') {
    warnings.push('Error correction L offers little protection against damage.');
  }
  if (logo && logo.size > 0.3) {
    warnings.push('A logo larger than 30% of the QR can make it unscannable.');
  }
  if (logo && design.errorCorrectionLevel !== 'H') {
    warnings.push('Use error correction H when embedding a logo.');
  }
  if (isGradient(dots.color) || background.gradient) {
    warnings.push('Gradients can reduce contrast; verify the result with a scanner.');
  }

  if (!isGradient(dots.color) && !background.gradient && !background.transparent) {
    const foreground = parseColor(dots.color);
    const backdrop = parseColor(background.color);
    if (foreground && backdrop) {
      const ratio = contrastRatio(foreground, backdrop);
      if (ratio < 3) {
        warnings.push(
          `Contrast ratio is ${ratio.toFixed(2)}:1. At least 3:1 is recommended for QR codes.`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, design };
}
