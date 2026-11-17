import sharp from 'sharp';
import type { QRDesign } from '@qr-studio/shared';
import { generateQRCodeSVG } from './svg.js';

export async function generateQRCodePNG(
  data: string,
  design: Partial<QRDesign> = {},
  size = 1024,
): Promise<Buffer> {
  const { svg } = generateQRCodeSVG(data, design, size);
  return sharp(Buffer.from(svg), { density: 72 }).png().toBuffer();
}

export async function svgToPNG(svg: string, size = 1024): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 72 })
    .resize(size, size, { fit: 'fill' })
    .png()
    .toBuffer();
}
