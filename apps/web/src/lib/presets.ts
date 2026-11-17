import type { QRDesign } from '@qr-studio/shared';

export const DEFAULT_DESIGN: QRDesign = {
  dots: { type: 'rounded', color: '#111118' },
  cornersSquare: { type: 'extra-rounded', color: '#111118' },
  cornersDot: { type: 'dot', color: '#111118' },
  background: {
    color: '#ffffff',
    transparent: false,
    rounded: 0,
  },
  errorCorrectionLevel: 'H',
  margin: 4,
};

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  design: QRDesign;
}

export const PRESETS: DesignPreset[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean, high-contrast squares',
    design: {
      ...DEFAULT_DESIGN,
      dots: { type: 'square', color: '#000000' },
      cornersSquare: { type: 'square', color: '#000000' },
      cornersDot: { type: 'square', color: '#000000' },
    },
  },
  {
    id: 'soft',
    name: 'Soft',
    description: 'Rounded modules, timeless look',
    design: DEFAULT_DESIGN,
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Brand-ready accent color',
    design: {
      ...DEFAULT_DESIGN,
      dots: { type: 'extra-rounded', color: '#5b3df5' },
      cornersSquare: { type: 'classy-rounded', color: '#5b3df5' },
      cornersDot: { type: 'classy-rounded', color: '#5b3df5' },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Gradient on a transparent canvas',
    design: {
      ...DEFAULT_DESIGN,
      dots: {
        type: 'rounded',
        color: {
          type: 'linear',
          start: '#0ea5e9',
          end: '#4338ca',
          rotation: 45,
        },
      },
      cornersSquare: { type: 'rounded', color: '#0ea5e9' },
      cornersDot: { type: 'dot', color: '#4338ca' },
      background: { color: '#ffffff', transparent: true, rounded: 0 },
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Rounded frame with a light card',
    design: {
      ...DEFAULT_DESIGN,
      dots: { type: 'classy', color: '#1f2937' },
      cornersSquare: { type: 'inpoint', color: '#1f2937' },
      cornersDot: { type: 'heart', color: '#e11d48' },
      background: { color: '#f8fafc', transparent: false, rounded: 8 },
    },
  },
];

export function cloneDesign(design: QRDesign): QRDesign {
  return JSON.parse(JSON.stringify(design)) as QRDesign;
}
