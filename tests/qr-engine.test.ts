import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  generateQRCodeBatchAll,
  generateQRCodePNG,
  validateQRCodeOptions,
} from '@qr-studio/qr-engine';
import { generateQRCodeSVGString } from '@qr-studio/qr-engine/svg';
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
  createBatchRequestSchema,
  designSchema,
  uniqueFilename,
} from '@qr-studio/shared';
import { alphaAt, decodePNG } from './helpers.js';

describe('QR engine', () => {
  it('generates a decodable PNG from a URL', async () => {
    const data = 'https://example.com/engine-test';
    const png = await generateQRCodePNG(data, {}, 512);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    await expect(decodePNG(png)).resolves.toBe(data);
  });

  it('generates a decodable PNG from arbitrary unicode text', async () => {
    const data = 'QR Studio — café ☕ 東京';
    const png = await generateQRCodePNG(data, {}, 512);
    await expect(decodePNG(png)).resolves.toBe(data);
  });

  it('generates SVG with a viewBox and no raster image', () => {
    const svg = generateQRCodeSVGString('https://example.com', {}, 512);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox=');
    expect(svg).not.toContain('<image');
  });

  it('preserves alpha transparency in PNG and SVG', async () => {
    const design = designSchema.parse({ background: { transparent: true } });
    const png = await generateQRCodePNG('transparent', design, 512);
    await expect(alphaAt(png, 0, 0)).resolves.toBe(0);
    const svg = generateQRCodeSVGString('transparent', design, 512);
    expect(svg).not.toContain('<rect x="0" y="0"');
  });

  it('supports every dot style and keeps codes decodable', async () => {
    for (const type of DOT_TYPES) {
      const png = await generateQRCodePNG('style-dots', { dots: { type } }, 512);
      await expect(decodePNG(png), `dot style ${type}`).resolves.toBe('style-dots');
    }
  });

  it('supports every corner square and corner dot style', async () => {
    for (const type of CORNER_SQUARE_TYPES) {
      const png = await generateQRCodePNG(
        'style-corners',
        { cornersSquare: { type } },
        512,
      );
      await expect(decodePNG(png), `corner ${type}`).resolves.toBe('style-corners');
    }
    for (const type of CORNER_DOT_TYPES) {
      const png = await generateQRCodePNG(
        'style-corner-dots',
        { cornersDot: { type } },
        512,
      );
      await expect(decodePNG(png), `corner dot ${type}`).resolves.toBe(
        'style-corner-dots',
      );
    }
  });

  it('supports gradients and custom colors', async () => {
    const design = designSchema.parse({
      dots: {
        type: 'rounded',
        color: { type: 'linear', start: '#0ea5e9', end: '#4338ca', rotation: 45 },
      },
      background: { color: '#f8fafc', rounded: 6 },
    });
    const svg = generateQRCodeSVGString('gradient', design, 512);
    expect(svg).toContain('<linearGradient');
    const png = await generateQRCodePNG('gradient', design, 512);
    await expect(decodePNG(png)).resolves.toBe('gradient');
  });

  it('embeds a logo and upgrades error correction', async () => {
    const logo = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 124, g: 92, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${logo.toString('base64')}`;
    const design = designSchema.parse({
      logo: { dataUrl, size: 0.16 },
    });
    const result = validateQRCodeOptions('with-logo', design);
    expect(result.valid).toBe(true);
    const png = await generateQRCodePNG('with-logo', design, 640);
    await expect(decodePNG(png)).resolves.toBe('with-logo');
  });

  it('rejects invalid configuration', () => {
    expect(() =>
      designSchema.parse({ dots: { color: 'red"><script>alert(1)</script>' } }),
    ).toThrow();
    expect(() =>
      generateQRCodeSVGString('x', { errorCorrectionLevel: 'Z' as never }),
    ).toThrow();
    const result = validateQRCodeOptions('x', {
      background: { color: '#000000' },
      dots: { color: '#010101' },
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.join(' ')).toMatch(/ontrast/i);
  });
});

describe('batch generation', () => {
  const schema = createBatchRequestSchema(500);

  it('generates 50 QR codes with unique sanitized filenames', async () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      data: `https://example.com/page-${index + 1}`,
      filename: `../qr page ${index + 1}`,
    }));
    const batch = schema.parse({ format: 'png', size: 256, items });
    const results = await generateQRCodeBatchAll(batch, { concurrency: 4 });

    expect(results).toHaveLength(50);
    expect(results.every((entry) => entry.content !== undefined)).toBe(true);
    const names = new Set(results.map((entry) => entry.filename));
    expect(names.size).toBe(50);
    expect(results.every((entry) => !entry.filename.includes('/'))).toBe(true);
  });

  it('applies per-item design overrides', async () => {
    const batch = schema.parse({
      format: 'png',
      size: 256,
      design: { dots: { color: '#000000' } },
      items: [
        { data: 'a', filename: 'a', design: { dots: { color: '#ff0000' } } },
        { data: 'b', filename: 'b' },
      ],
    });
    const results = await generateQRCodeBatchAll(batch);
    const a = results[0]!.content as Buffer;
    const b = results[1]!.content as Buffer;
    expect(a.equals(b)).toBe(false);
    await expect(decodePNG(a)).resolves.toBe('a');
    await expect(decodePNG(b)).resolves.toBe('b');
  });

  it('makes duplicate filenames safe', () => {
    const used = new Set<string>();
    expect(uniqueFilename('qr.png', used)).toBe('qr.png');
    expect(uniqueFilename('qr.png', used)).toBe('qr-2.png');
    expect(uniqueFilename('qr.png', used)).toBe('qr-3.png');
  });

  it('enforces the configured batch limit', () => {
    const items = Array.from({ length: 6 }, (_, index) => ({
      data: `item-${index}`,
    }));
    expect(() => createBatchRequestSchema(5).parse({ items })).toThrow();
  });
});
