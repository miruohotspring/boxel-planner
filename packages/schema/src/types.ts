import type { z } from "zod";
import type {
  Vec3Schema,
  ColorSchema,
  BlockSchema,
  BoundsSchema,
  BlueprintSchema,
} from "./schemas.js";

export type Vec3 = z.infer<typeof Vec3Schema>;
export type Color = z.infer<typeof ColorSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Bounds = z.infer<typeof BoundsSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
