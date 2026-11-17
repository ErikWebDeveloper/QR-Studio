import type {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
} from '@qr-studio/shared';

export type DotType = (typeof DOT_TYPES)[number];
export type CornerSquareType = (typeof CORNER_SQUARE_TYPES)[number];
export type CornerDotType = (typeof CORNER_DOT_TYPES)[number];

const n = (value: number): string => Number(value.toFixed(3)).toString();

export function rectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 0,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    return `M${n(x)} ${n(y)}h${n(width)}v${n(height)}h${n(-width)}Z`;
  }
  return [
    `M${n(x + r)} ${n(y)}`,
    `H${n(x + width - r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x + width)} ${n(y + r)}`,
    `V${n(y + height - r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x + width - r)} ${n(y + height)}`,
    `H${n(x + r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + height - r)}`,
    `V${n(y + r)}`,
    `A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}`,
    'Z',
  ].join('');
}

export function circlePath(cx: number, cy: number, radius: number): string {
  const r = Math.max(0, radius);
  return (
    `M${n(cx - r)} ${n(cy)}` +
    `a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0` +
    `a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`
  );
}

export function dotPath(type: DotType, x: number, y: number, size: number): string {
  const s = size;
  switch (type) {
    case 'square':
      return rectPath(x, y, s, s);
    case 'dots':
    case 'dot':
      return circlePath(x + s / 2, y + s / 2, s * 0.5);
    case 'rounded':
      return rectPath(x, y, s, s, s * 0.25);
    case 'extra-rounded':
      return rectPath(x, y, s, s, s * 0.47);
    case 'classy':
      return [
        rectPath(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88),
        rectPath(x, y, s * 0.2, s * 0.2),
        rectPath(x + s * 0.8, y, s * 0.2, s * 0.2),
        rectPath(x, y + s * 0.8, s * 0.2, s * 0.2),
        rectPath(x + s * 0.8, y + s * 0.8, s * 0.2, s * 0.2),
      ].join('');
    case 'classy-rounded':
      return [
        rectPath(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.18),
        rectPath(x, y, s * 0.22, s * 0.22, s * 0.07),
        rectPath(x + s * 0.78, y, s * 0.22, s * 0.22, s * 0.07),
        rectPath(x, y + s * 0.78, s * 0.22, s * 0.22, s * 0.07),
        rectPath(x + s * 0.78, y + s * 0.78, s * 0.22, s * 0.22, s * 0.07),
      ].join('');
    default:
      return rectPath(x, y, s, s);
  }
}

export function cornerSquareOuterPath(
  type: CornerSquareType,
  x: number,
  y: number,
): string {
  const s = 7;
  switch (type) {
    case 'rounded':
    case 'outpoint':
    case 'inpoint':
      return rectPath(x, y, s, s, s * 0.19);
    case 'extra-rounded':
      return rectPath(x, y, s, s, s * 0.48);
    case 'dot':
    case 'circle':
      return circlePath(x + s / 2, y + s / 2, s / 2);
    case 'classy':
    case 'classy-rounded':
      return rectPath(x, y, s, s, s * 0.1);
    case 'square':
    default:
      return rectPath(x, y, s, s);
  }
}

export function cornerSquareHolePath(
  type: CornerSquareType,
  x: number,
  y: number,
): string {
  if (type === 'dot' || type === 'circle' || type === 'extra-rounded') {
    return circlePath(x + 3.5, y + 3.5, 2.5);
  }
  if (type === 'outpoint') {
    return rectPath(x + 1, y + 1, 5, 5, 0.2);
  }
  if (type === 'inpoint') {
    return rectPath(x + 1, y + 1, 5, 5, 2.3);
  }
  const radius = type === 'square' ? 0 : 1.1;
  return rectPath(x + 1, y + 1, 5, 5, radius);
}

export function cornerDotPath(
  type: CornerDotType,
  x: number,
  y: number,
): string {
  const s = 3;
  switch (type) {
    case 'dot':
    case 'circle':
      return circlePath(x + s / 2, y + s / 2, s * 0.56);
    case 'rounded':
      return rectPath(x - 0.08, y - 0.08, s + 0.16, s + 0.16, s * 0.28);
    case 'heart':
      return (
        `M${n(x + 1.5)} ${n(y + 3.05)}` +
        `C${n(x - 0.55)} ${n(y + 1.7)} ${n(x - 0.25)} ${n(y - 0.05)} ${n(x + 1.5)} ${n(y + 0.7)}` +
        `C${n(x + 3.25)} ${n(y - 0.05)} ${n(x + 3.55)} ${n(y + 1.7)} ${n(x + 1.5)} ${n(y + 3.05)}Z`
      );
    case 'classy':
      return [
        rectPath(x + 0.3, y + 0.3, 2.4, 2.4),
        rectPath(x, y, 0.6, 0.6),
        rectPath(x + 2.4, y, 0.6, 0.6),
        rectPath(x, y + 2.4, 0.6, 0.6),
        rectPath(x + 2.4, y + 2.4, 0.6, 0.6),
      ].join('');
    case 'classy-rounded':
      return [
        rectPath(x + 0.3, y + 0.3, 2.4, 2.4, 0.5),
        rectPath(x, y, 0.7, 0.7, 0.25),
        rectPath(x + 2.3, y, 0.7, 0.7, 0.25),
        rectPath(x, y + 2.3, 0.7, 0.7, 0.25),
        rectPath(x + 2.3, y + 2.3, 0.7, 0.7, 0.25),
      ].join('');
    case 'square':
    default:
      return rectPath(x, y, s, s);
  }
}
