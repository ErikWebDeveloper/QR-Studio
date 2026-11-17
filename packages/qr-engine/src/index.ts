import type { QRDesign } from '@qr-studio/shared';
import { generateQRCodePNG } from './png.js';
import { generateQRCodeSVGString } from './svg.js';

export * from './shapes.js';
export * from './svg.js';
export * from './png.js';
export * from './batch.js';
export * from './validation.js';

export async function generateQRCode(
  data: string,
  design: Partial<QRDesign> = {},
  format: 'png' | 'svg' = 'png',
  size = 1024,
): Promise<Buffer | string> {
  return format === 'svg'
    ? generateQRCodeSVGString(data, design, size)
    : generateQRCodePNG(data, design, size);
}
