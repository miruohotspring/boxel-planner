// 型
export type { Vec3, Color, Block, Bounds, Blueprint } from "./types.js";

// Zod スキーマ（バリデーション拡張が必要なケース向け）
export {
  Vec3Schema,
  ColorSchema,
  BlockSchema,
  BoundsSchema,
  BlueprintSchema,
} from "./schemas.js";

// バリデーション関数
export {
  validateBlueprint,
  parseBlueprint,
  parseBlueprintJson,
} from "./validators.js";
export type {
  ValidationResult,
  ValidationSuccess,
  ValidationFailure,
} from "./validators.js";

// ユーティリティ
export {
  positionKey,
  computeBounds,
  findDuplicatePositions,
  getSlice,
  buildPositionMap,
} from "./utils.js";

// 定数
export { CURRENT_VERSION, SUPPORTED_VERSIONS } from "./constants.js";
export type { SupportedVersion } from "./constants.js";
