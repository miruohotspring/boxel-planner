import { z } from "zod";

export const Vec3Schema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
});

export const ColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "color must be a CSS hex color like #RRGGBB");

export const PaletteEntrySchema = z.object({
  name: z.string().min(1),
  color: ColorSchema,
  description: z.string().min(1),
});

export const BlockSchema = Vec3Schema.extend({
  color: ColorSchema,
});

export const BoundsSchema = z
  .object({
    min: Vec3Schema,
    max: Vec3Schema,
  })
  .refine(
    (b) => b.min.x <= b.max.x && b.min.y <= b.max.y && b.min.z <= b.max.z,
    { message: "bounds.min must be <= bounds.max on all axes" }
  );

export const BlueprintSchema = z.object({
  version: z.literal("1.0"),
  name: z.string().min(1),
  description: z.string().optional(),
  palette: z.array(PaletteEntrySchema).optional(),
  bounds: BoundsSchema,
  structure: z.array(BlockSchema),
  scaffold: z.array(BlockSchema),
});
