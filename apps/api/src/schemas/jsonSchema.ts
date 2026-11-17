import type { ZodType } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function stripUnsupported(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUnsupported);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '$schema' && key !== 'default')
        .map(([key, item]) => [key, stripUnsupported(item)]),
    );
  }
  return value;
}

export function requestBodySchema(schema: ZodType): Record<string, unknown> {
  return stripUnsupported(
    zodToJsonSchema(schema, { target: 'openApi3' }),
  ) as Record<string, unknown>;
}
