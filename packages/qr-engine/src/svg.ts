import qrcode from 'qrcode-generator';
import {
  designSchema,
  type Color,
  type Gradient,
  type QRDesign,
} from '@qr-studio/shared';
import {
  circlePath,
  cornerDotPath,
  cornerSquareHolePath,
  cornerSquareOuterPath,
  dotPath,
} from './shapes.js';

export interface SVGResult {
  svg: string;
  moduleCount: number;
  warnings: string[];
}

interface Defs {
  map: Map<string, string>;
  entries: string[];
}

function createGradient(id: string, gradient: Gradient, total: number): string {
  if (gradient.type === 'radial') {
    return [
      `<radialGradient id="${id}" cx="50%" cy="50%" r="70%">`,
      `<stop offset="0%" stop-color="${gradient.start}"/>`,
      `<stop offset="100%" stop-color="${gradient.end}"/>`,
      '</radialGradient>',
    ].join('');
  }

  const angle = (gradient.rotation * Math.PI) / 180;
  const radius = total / 2;
  const cx = total / 2;
  const cy = total / 2;
  const x1 = cx - Math.cos(angle) * radius;
  const y1 = cy - Math.sin(angle) * radius;
  const x2 = cx + Math.cos(angle) * radius;
  const y2 = cy + Math.sin(angle) * radius;
  return [
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}">`,
    `<stop offset="0%" stop-color="${gradient.start}"/>`,
    `<stop offset="100%" stop-color="${gradient.end}"/>`,
    '</linearGradient>',
  ].join('');
}

function fillFor(color: Color, defs: Defs, total: number): string {
  if (typeof color === 'string') {
    return color;
  }
  const key = JSON.stringify(color);
  const existing = defs.map.get(key);
  if (existing) {
    return `url(#${existing})`;
  }
  const id = `grad-${defs.map.size}`;
  defs.map.set(key, id);
  defs.entries.push(createGradient(id, color, total));
  return `url(#${id})`;
}

function buildMatrix(data: string, design: QRDesign) {
  (qrcode as unknown as { stringToBytes: (value: string) => number[] }).stringToBytes =
    (value: string) => Array.from(new TextEncoder().encode(value));
  const qr = qrcode(0, design.errorCorrectionLevel);
  qr.addData(data);
  qr.make();
  const moduleCount = qr.getModuleCount();
  const dark: Array<[number, number]> = [];

  const inFinder = (row: number, col: number) =>
    (row < 8 && col < 8) ||
    (row < 8 && col >= moduleCount - 8) ||
    (row >= moduleCount - 8 && col < 8);

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qr.isDark(row, col) && !inFinder(row, col)) {
        dark.push([col, row]);
      }
    }
  }
  return { moduleCount, dark };
}

export function generateQRCodeSVG(
  data: string,
  rawDesign: Partial<QRDesign>,
  size = 1024,
): SVGResult {
  const design = designSchema.parse(rawDesign) as QRDesign;
  const warnings: string[] = [];
  const effectiveDesign: QRDesign = design.logo
    ? { ...design, errorCorrectionLevel: 'H' }
    : design;

  if (design.logo && design.errorCorrectionLevel !== 'H') {
    warnings.push('Error correction was raised to H because a logo is present.');
  }

  const { moduleCount, dark } = buildMatrix(data, effectiveDesign);
  const { margin, background, dots, cornersSquare, cornersDot, logo } =
    effectiveDesign;
  const total = moduleCount + margin * 2;
  const scale = size / total;
  const defs: Defs = { map: new Map(), entries: [] };

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}">`,
  );

  if (!background.transparent || background.gradient) {
    const fill = background.gradient
      ? fillFor(background.gradient, defs, total)
      : background.color;
    const radius = (background.rounded / 100) * (total / 2);
    parts.push(
      `<rect x="0" y="0" width="${total}" height="${total}" rx="${radius.toFixed(2)}" fill="${fill}"/>`,
    );
  }

  const dotFill = fillFor(dots.color, defs, total);
  if (dark.length > 0) {
    const overlap = dots.type === 'square' ? 0 : 0.06;
    const dotPaths = dark
      .map(([col, row]) =>
        dotPath(
          dots.type,
          col + margin - overlap / 2,
          row + margin - overlap / 2,
          1 + overlap,
        ),
      )
      .join('');
    parts.push(`<path fill="${dotFill}" d="${dotPaths}"/>`);
  }

  const squareFill = fillFor(cornersSquare.color, defs, total);
  const dotFillCorners = fillFor(cornersDot.color, defs, total);
  const finderOrigins: Array<[number, number]> = [
    [0, 0],
    [moduleCount - 7, 0],
    [0, moduleCount - 7],
  ];

  for (const [fx, fy] of finderOrigins) {
    const x = fx + margin;
    const y = fy + margin;
    const ring = [
      cornerSquareOuterPath(cornersSquare.type, x, y),
      cornerSquareHolePath(cornersSquare.type, x, y),
    ].join('');
    parts.push(
      `<path fill="${squareFill}" fill-rule="evenodd" d="${ring}"/>`,
    );
    parts.push(
      `<path fill="${dotFillCorners}" d="${cornerDotPath(cornersDot.type, x + 2, y + 2)}"/>`,
    );
  }

  if (logo) {
    const logoSize = moduleCount * logo.size;
    const center = margin + moduleCount / 2;
    const x = center - logoSize / 2;
    const y = center - logoSize / 2;
    if (logo.background) {
      const pad = (logo.margin / 100) * logoSize;
      const boxSize = logoSize + pad * 2;
      const radius = (logo.borderRadius / 100) * (boxSize / 2);
      parts.push(
        `<rect x="${(x - pad).toFixed(3)}" y="${(y - pad).toFixed(3)}" width="${boxSize.toFixed(3)}" height="${boxSize.toFixed(3)}" rx="${radius.toFixed(3)}" fill="${logo.backgroundColor}"/>`,
      );
    }
    parts.push(
      `<image href="${logo.dataUrl}" xlink:href="${logo.dataUrl}" x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${logoSize.toFixed(3)}" height="${logoSize.toFixed(3)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  if (defs.entries.length > 0) {
    parts.splice(1, 0, `<defs>${defs.entries.join('')}</defs>`);
  }
  parts.push('</svg>');

  if (margin < 4) {
    warnings.push('A quiet zone smaller than 4 modules can hurt scannability.');
  }
  if (moduleCount > 90 && size < 512) {
    warnings.push('This QR has a high density; consider a larger export size.');
  }

  return {
    svg: parts.join(''),
    moduleCount,
    warnings,
  };
}

export function generateQRCodeSVGString(
  data: string,
  design: Partial<QRDesign> = {},
  size = 1024,
): string {
  return generateQRCodeSVG(data, design, size).svg;
}

export { circlePath };
