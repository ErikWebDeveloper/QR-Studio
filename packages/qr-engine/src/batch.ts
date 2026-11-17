import {
  sanitizeFilename,
  uniqueFilename,
  type BatchRequest,
  type OutputFormat,
  type QRDesign,
  type QRDesignOverride,
} from '@qr-studio/shared';
import { generateQRCodePNG } from './png.js';
import { generateQRCodeSVGString } from './svg.js';

export interface BatchEntryResult {
  index: number;
  data: string;
  name?: string;
  filename: string;
  format: OutputFormat;
  content?: Buffer | string;
  error?: string;
  warnings: string[];
}

function compact<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

export function mergeDesign(
  base: QRDesign,
  override?: QRDesignOverride,
): QRDesign {
  if (!override) {
    return base;
  }
  const patch = compact(override);
  return {
    ...base,
    ...patch,
    dots: patch.dots ? { ...base.dots, ...compact(patch.dots) } : base.dots,
    cornersSquare: patch.cornersSquare
      ? { ...base.cornersSquare, ...compact(patch.cornersSquare) }
      : base.cornersSquare,
    cornersDot: patch.cornersDot
      ? { ...base.cornersDot, ...compact(patch.cornersDot) }
      : base.cornersDot,
    background: patch.background
      ? { ...base.background, ...compact(patch.background) }
      : base.background,
    logo: patch.logo !== undefined ? patch.logo : base.logo,
  } as QRDesign;
}

export interface BatchOptions {
  concurrency?: number;
}

export async function* generateQRCodeBatch(
  batch: BatchRequest,
  options: BatchOptions = {},
): AsyncGenerator<BatchEntryResult> {
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 4, 32));
  const usedNames = new Set<string>();

  for (let start = 0; start < batch.items.length; start += concurrency) {
    const chunk = batch.items.slice(start, start + concurrency);
    const prepared = chunk.map((item, offset) => ({
      item,
      index: start + offset,
      filename: uniqueFilename(
        sanitizeFilename(item.filename, `qr-${start + offset + 1}`, batch.format),
        usedNames,
      ),
    }));

    const results = await Promise.all(
      prepared.map(async ({ item, index, filename }): Promise<BatchEntryResult> => {
        const design = mergeDesign(batch.design, item.design);
        try {
          if (batch.format === 'svg') {
            const generated = generateQRCodeSVGString(item.data, design, batch.size);
            return {
              index,
              data: item.data,
              name: item.name,
              filename,
              format: batch.format,
              content: generated,
              warnings: [],
            };
          }
          const generated = await generateQRCodePNG(item.data, design, batch.size);
          return {
            index,
            data: item.data,
            name: item.name,
            filename,
            format: batch.format,
            content: generated,
            warnings: [],
          };
        } catch (error) {
          return {
            index,
            data: item.data,
            name: item.name,
            filename,
            format: batch.format,
            error: error instanceof Error ? error.message : 'Generation failed',
            warnings: [],
          };
        }
      }),
    );

    for (const result of results) {
      yield result;
    }
  }
}

export async function generateQRCodeBatchAll(
  batch: BatchRequest,
  options: BatchOptions = {},
): Promise<BatchEntryResult[]> {
  const results: BatchEntryResult[] = [];
  for await (const result of generateQRCodeBatch(batch, options)) {
    results.push(result);
  }
  return results;
}
