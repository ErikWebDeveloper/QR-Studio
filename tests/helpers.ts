import jsQR from 'jsqr';
import {
  BinaryBitmap,
  HybridBinarizer,
  LuminanceSource,
  MultiFormatReader,
} from '@zxing/library';
import sharp from 'sharp';
import { unzipSync } from 'fflate';

class RawLuminanceSource extends LuminanceSource {
  constructor(
    private readonly pixels: Uint8Array,
    width: number,
    height: number,
  ) {
    super(width, height);
  }

  override getRow(y: number, row?: Uint8ClampedArray): Uint8ClampedArray {
    const slice = this.pixels.slice(
      y * this.getWidth(),
      (y + 1) * this.getWidth(),
    );
    const result = row ?? new Uint8ClampedArray(this.getWidth());
    result.set(slice);
    return result;
  }

  override getMatrix(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.pixels);
  }

  override isRotateSupported(): boolean {
    return false;
  }

  override invert(): LuminanceSource {
    const inverted = new Uint8ClampedArray(this.pixels.length);
    for (let index = 0; index < this.pixels.length; index += 1) {
      inverted[index] = 255 - (this.pixels[index] ?? 0);
    }
    return new RawLuminanceSource(inverted, this.getWidth(), this.getHeight());
  }
}

export async function decodePNG(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(
      new RawLuminanceSource(new Uint8Array(data), info.width, info.height),
    ),
  );
  let zxing: string | null = null;
  try {
    zxing = new MultiFormatReader().decode(bitmap)?.getText() ?? null;
  } catch {
    zxing = null;
  }
  if (zxing) return zxing;
  return decodeWithJSQR(buffer);
}

export async function decodeWithJSQR(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return (
    jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
  );
}

export async function alphaAt(
  buffer: Buffer,
  x: number,
  y: number,
): Promise<number> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const offset = (y * info.width + x) * info.channels;
  return data[offset + info.channels - 1] ?? 0;
}

export function unzip(buffer: Buffer): Record<string, Buffer> {
  const entries = unzipSync(new Uint8Array(buffer));
  return Object.fromEntries(
    Object.entries(entries).map(([name, content]) => [name, Buffer.from(content)]),
  );
}
