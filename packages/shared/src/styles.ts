export const DOT_TYPES = [
  'square',
  'rounded',
  'dots',
  'dot',
  'extra-rounded',
  'classy',
  'classy-rounded',
] as const;

export const CORNER_SQUARE_TYPES = [
  'square',
  'rounded',
  'extra-rounded',
  'dot',
  'circle',
  'classy',
  'classy-rounded',
  'outpoint',
  'inpoint',
] as const;

export const CORNER_DOT_TYPES = [
  'square',
  'dot',
  'circle',
  'rounded',
  'heart',
  'classy',
  'classy-rounded',
] as const;

export const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

export const OUTPUT_FORMATS = ['png', 'svg'] as const;

export const STYLE_CATALOG = {
  dots: DOT_TYPES,
  cornersSquare: CORNER_SQUARE_TYPES,
  cornersDot: CORNER_DOT_TYPES,
  errorCorrectionLevel: ERROR_CORRECTION_LEVELS,
  formats: OUTPUT_FORMATS,
} as const;
