import { z } from 'zod';
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DOT_TYPES,
  ERROR_CORRECTION_LEVELS,
  OUTPUT_FORMATS,
} from './styles.js';


const colorString = z
  .string()
  .max(64)
  .regex(
    /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]{3,20})$/,
    'Invalid color. Use HEX, rgb(), rgba(), hsl() or a CSS color name.',
  );

export const gradientSchema = z
  .object({
    type: z.enum(['linear', 'radial']).default('linear'),
    start: colorString,
    end: colorString,
    rotation: z.number().min(0).max(360).default(0),
  })
  .strict();

export const colorSchema = z.union([colorString, gradientSchema]);

export const dotsSchema = z
  .object({
    type: z.enum(DOT_TYPES).default('rounded'),
    color: colorSchema.default('#000000'),
  })
  .strict();

export const cornersSquareSchema = z
  .object({
    type: z.enum(CORNER_SQUARE_TYPES).default('extra-rounded'),
    color: colorSchema.default('#000000'),
  })
  .strict();

export const cornersDotSchema = z
  .object({
    type: z.enum(CORNER_DOT_TYPES).default('dot'),
    color: colorSchema.default('#000000'),
  })
  .strict();

export const backgroundSchema = z
  .object({
    color: colorString.default('#ffffff'),
    transparent: z.boolean().default(false),
    gradient: gradientSchema.optional(),
    rounded: z.number().min(0).max(50).default(0),
  })
  .strict();

export const logoSchema = z
  .object({
    dataUrl: z
      .string()
      .max(2_500_000)
      .regex(
        /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/,
        'Logo must be a base64 data URL of a PNG, JPEG, WebP or SVG image.',
      ),
    size: z.number().min(0.05).max(0.4).default(0.22),
    margin: z.number().min(0).max(20).default(4),
    background: z.boolean().default(true),
    backgroundColor: colorString.default('#ffffff'),
    borderRadius: z.number().min(0).max(50).default(8),
  })
  .strict();

export const designSchema = z
  .object({
    dots: dotsSchema.default({}),
    cornersSquare: cornersSquareSchema.default({}),
    cornersDot: cornersDotSchema.default({}),
    background: backgroundSchema.default({}),
    logo: logoSchema.optional(),
    errorCorrectionLevel: z.enum(ERROR_CORRECTION_LEVELS).default('H'),
    margin: z.number().min(0).max(20).default(4),
  })
  .strict();

export const designOverrideSchema = z
  .object({
    dots: z
      .object({
        type: z.enum(DOT_TYPES).optional(),
        color: colorSchema.optional(),
      })
      .strict()
      .optional(),
    cornersSquare: z
      .object({
        type: z.enum(CORNER_SQUARE_TYPES).optional(),
        color: colorSchema.optional(),
      })
      .strict()
      .optional(),
    cornersDot: z
      .object({
        type: z.enum(CORNER_DOT_TYPES).optional(),
        color: colorSchema.optional(),
      })
      .strict()
      .optional(),
    background: z
      .object({
        color: colorString.optional(),
        transparent: z.boolean().optional(),
        gradient: gradientSchema.optional(),
        rounded: z.number().min(0).max(50).optional(),
      })
      .strict()
      .optional(),
    logo: logoSchema.optional(),
    errorCorrectionLevel: z.enum(ERROR_CORRECTION_LEVELS).optional(),
    margin: z.number().min(0).max(20).optional(),
  })
  .strict();

export const formatSchema = z.enum(OUTPUT_FORMATS).default('png');

export const sizeSchema = z.number().int().min(128).max(4096).default(1024);

export const dataSchema = z.string().min(1).max(4000);

export const generateRequestSchema = z
  .object({
    data: dataSchema,
    filename: z.string().max(200).optional(),
    format: formatSchema,
    size: sizeSchema,
    design: designSchema.default({}),
  })
  .strict();

export const batchItemSchema = z
  .object({
    data: dataSchema,
    filename: z.string().max(200).optional(),
    name: z.string().max(200).optional(),
    design: designOverrideSchema.optional(),
  })
  .strict();

export function createBatchRequestSchema(maxBatchSize: number) {
  return z
    .object({
      format: formatSchema,
      size: sizeSchema,
      design: designSchema.default({}),
      archiveName: z.string().max(200).optional(),
      items: z.array(batchItemSchema).min(1).max(maxBatchSize),
    })
    .strict();
}

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  uptime: z.number(),
  version: z.string(),
});

export type Gradient = z.infer<typeof gradientSchema>;
export type Color = z.infer<typeof colorSchema>;
export type DotsOptions = z.infer<typeof dotsSchema>;
export type CornersSquareOptions = z.infer<typeof cornersSquareSchema>;
export type CornersDotOptions = z.infer<typeof cornersDotSchema>;
export type BackgroundOptions = z.infer<typeof backgroundSchema>;
export type LogoOptions = z.infer<typeof logoSchema>;
export type QRDesign = z.infer<typeof designSchema>;
export type QRDesignOverride = z.infer<typeof designOverrideSchema>;
export type OutputFormat = z.infer<typeof formatSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type BatchItem = z.infer<typeof batchItemSchema>;
export type BatchRequest = z.infer<ReturnType<typeof createBatchRequestSchema>>;
