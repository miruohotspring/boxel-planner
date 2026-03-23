# packages/schema 設計ドキュメント

## 役割

`.boxel.json` 設計図ファイルの型定義・バリデーション・座標ユーティリティを提供する共有パッケージ。
CLI (`packages/cli`) と Web UI (`packages/web`) の両方から import して使う。

---

## ファイル構成

```
packages/schema/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── constants.ts     # バージョン定数
│   ├── schemas.ts       # Zod スキーマ定義（コア）
│   ├── types.ts         # z.infer<> から TypeScript 型を生成
│   ├── validators.ts    # parse / validate ラッパー関数
│   ├── utils.ts         # 座標計算・スライス等のユーティリティ
│   ├── index.ts         # 公開 API の re-export
│   └── __tests__/
│       ├── schemas.test.ts
│       ├── validators.test.ts
│       └── utils.test.ts
```

---

## 依存グラフ（実装順）

```
constants.ts
     ↓
schemas.ts  ──→  types.ts
     ↓                ↓
validators.ts     utils.ts
          ↓       ↓
          index.ts
```

---

## 各ファイルの API 設計

### `constants.ts`

```ts
export const CURRENT_VERSION = "1.0" as const;
export const SUPPORTED_VERSIONS = ["1.0"] as const;
export type SupportedVersion = typeof SUPPORTED_VERSIONS[number];
```

バージョンアップ時の変更箇所をこのファイルに集約する。

---

### `schemas.ts`

```ts
import { z } from "zod";

export const Vec3Schema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
});

export const ColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "color must be a CSS hex color like #RRGGBB");

export const BlockSchema = Vec3Schema.extend({
  color: ColorSchema,
});

export const BoundsSchema = z.object({
  min: Vec3Schema,
  max: Vec3Schema,
}).refine(
  (b) => b.min.x <= b.max.x && b.min.y <= b.max.y && b.min.z <= b.max.z,
  { message: "bounds.min must be <= bounds.max on all axes" }
);

export const BlueprintSchema = z.object({
  version: z.literal("1.0"),
  name: z.string().min(1),
  description: z.string().optional(),
  bounds: BoundsSchema,
  structure: z.array(BlockSchema),
  scaffold: z.array(BlockSchema),
});
```

**設計ポイント:**
- `Vec3Schema` を共通化し、`bounds.min/max` と `Block` の座標が同じ制約を持つ
- `BoundsSchema` の `refine` で min <= max の整合性をチェック（型で表現不可）
- `version: z.literal("1.0")` で将来のバージョン追加を `z.union` に昇格しやすくする

---

### `types.ts`

```ts
import type { z } from "zod";
import type { Vec3Schema, ColorSchema, BlockSchema, BoundsSchema, BlueprintSchema } from "./schemas";

export type Vec3 = z.infer<typeof Vec3Schema>;
export type Color = z.infer<typeof ColorSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Bounds = z.infer<typeof BoundsSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
```

スキーマから型を自動導出することで、Zod 定義との乖離を防ぐ。

---

### `validators.ts`

```ts
export type ValidationSuccess = { ok: true; data: Blueprint };
export type ValidationFailure = {
  ok: false;
  errors: Array<{ path: string; message: string }>;
};
export type ValidationResult = ValidationSuccess | ValidationFailure;

// CLI 向け: 例外を投げず Result 型で返す
export function validateBlueprint(raw: unknown): ValidationResult;

// Web UI 向け: 失敗時に例外を投げる
export function parseBlueprint(raw: unknown): Blueprint;

// JSON 文字列から直接パース (CLI の主要ルート)
export function parseBlueprintJson(json: string): ValidationResult;
```

**なぜ Result 型か:**
- CLI は exit code と JSON エラー出力が必要 → 例外より Result 型が扱いやすい
- Web UI は React Error Boundary に例外を投げたい → `parseBlueprint` を提供

---

### `utils.ts`

```ts
// structure の実座標から bounds を自動計算 (init や fill 後に使う)
export function computeBounds(blocks: Block[]): Bounds | null;

// 重複座標のブロックを検出 (validate コマンドの追加チェック)
export function findDuplicatePositions(blocks: Block[]): string[];

// 指定 Y 層のブロックだけを返す (slice コマンド・2D ビュー)
export function getSlice(blocks: Block[], y: number): Block[];

// 座標を "x,y,z" 形式のキーに変換
export function positionKey(pos: Vec3): string;

// blocks を座標キー → Block の Map に変換 (O(1) 探索用)
export function buildPositionMap(blocks: Block[]): Map<string, Block>;
```

**`computeBounds` の戻り値が `Bounds | null` の理由:**
空配列のとき bounds は定義できないため、`null` で明示的に表現する。

---

## テストケース設計

### `schemas.test.ts`

| テスト対象 | ケース |
|---|---|
| `Vec3Schema` | 整数は OK / 小数は NG / フィールド欠損は NG |
| `ColorSchema` | `#888888` OK / `#F5A623` OK / `888888` NG / `#GGGGGG` NG / `#88888` (5桁) NG / `red` NG |
| `BoundsSchema` | min <= max は OK / min.x > max.x は NG |
| `BlueprintSchema` | 最小構成 OK / version `"2.0"` NG / name 空文字 NG / description 省略 OK / 深いパスのエラーメッセージ確認 |

### `validators.test.ts`

| テスト対象 | ケース |
|---|---|
| `validateBlueprint` | 有効オブジェクト → `ok: true` / 無効 → `ok: false` かつ errors に path が含まれる |
| `parseBlueprint` | 有効 → Blueprint / 無効 → 例外 |
| `parseBlueprintJson` | 有効 JSON → `ok: true` / 構文エラー JSON → errors に "JSON parse error" / バリデーション失敗 → スキーマエラー |

### `utils.test.ts`

| テスト対象 | ケース |
|---|---|
| `computeBounds` | 空配列 → `null` / 1ブロック → min === max / 複数ブロック正確に計算 / 負の座標も OK |
| `findDuplicatePositions` | 重複なし → `[]` / 同座標 2回 → 1エントリ / 同座標 3回 → 1エントリ |
| `getSlice` | Y=0 のみ返る / 該当なし → `[]` |
| `buildPositionMap` | キーが `"x,y,z"` 形式 / size が正確 |

---

## package.json の重要設定

```json
{
  "name": "@boxel-planner/schema",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "peerDependencies": {
    "zod": "^3.0.0"
  }
}
```

- `exports` で ESM/CJS 両対応（CLI は CJS、Web は ESM になりうる）
- `zod` は peerDependencies に置き、バージョン衝突を防ぐ
- ビルドは `tsup`（`dts: true` で型定義ファイルも自動生成）
