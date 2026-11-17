export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code = 'AppError',
  ) {
    super(message);
    this.name = code;
  }
}

export function parseByteSize(value: string): number {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
  if (!match) {
    return 12 * 1024 * 1024;
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? 'b').toLowerCase();
  const multiplier =
    unit === 'gb'
      ? 1024 ** 3
      : unit === 'mb'
        ? 1024 ** 2
        : unit === 'kb'
          ? 1024
          : 1;
  return Math.floor(amount * multiplier);
}
