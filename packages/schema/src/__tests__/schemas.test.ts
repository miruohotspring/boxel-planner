import { describe, expect, it } from "vitest";
import {
  Vec3Schema,
  ColorSchema,
  PaletteEntrySchema,
  BlockSchema,
  BoundsSchema,
  BlueprintSchema,
} from "../schemas.js";

describe("Vec3Schema", () => {
  it("整数座標は parse できる", () => {
    expect(Vec3Schema.parse({ x: 0, y: 1, z: -5 })).toEqual({ x: 0, y: 1, z: -5 });
  });

  it("小数座標は失敗する", () => {
    expect(() => Vec3Schema.parse({ x: 1.5, y: 0, z: 0 })).toThrow();
  });

  it("フィールドが欠けると失敗する", () => {
    expect(() => Vec3Schema.parse({ x: 0, y: 0 })).toThrow();
  });
});

describe("ColorSchema", () => {
  it.each(["#888888", "#F5A623", "#000000", "#ffffff", "#AABBCC"])(
    '"%s" は valid',
    (color) => {
      expect(ColorSchema.parse(color)).toBe(color);
    }
  );

  it.each(["888888", "#GGGGGG", "#88888", "#8888888", "red", "", "#"])(
    '"%s" は invalid',
    (color) => {
      expect(() => ColorSchema.parse(color)).toThrow();
    }
  );
});

describe("BlockSchema", () => {
  it("有効な Vec3 + color は parse できる", () => {
    const block = { x: 1, y: 2, z: 3, color: "#aabbcc" };
    expect(BlockSchema.parse(block)).toEqual(block);
  });

  it("color が無効だと失敗する", () => {
    expect(() => BlockSchema.parse({ x: 0, y: 0, z: 0, color: "blue" })).toThrow();
  });
});

describe("PaletteEntrySchema", () => {
  it("有効なパレット定義は parse できる", () => {
    const entry = {
      name: "stone-main",
      color: "#AABBCC",
      description: "主壁の石材色",
    };
    expect(PaletteEntrySchema.parse(entry)).toEqual(entry);
  });

  it("color が不正だと失敗する", () => {
    expect(() =>
      PaletteEntrySchema.parse({
        name: "bad",
        color: "blue",
        description: "説明",
      })
    ).toThrow();
  });
});

describe("BoundsSchema", () => {
  it("min <= max のとき valid", () => {
    const bounds = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 9, y: 9, z: 9 },
    };
    expect(BoundsSchema.parse(bounds)).toEqual(bounds);
  });

  it("min === max のとき valid（1ブロック）", () => {
    const bounds = {
      min: { x: 5, y: 5, z: 5 },
      max: { x: 5, y: 5, z: 5 },
    };
    expect(BoundsSchema.parse(bounds)).toEqual(bounds);
  });

  it("min.x > max.x のとき refine で失敗する", () => {
    expect(() =>
      BoundsSchema.parse({
        min: { x: 10, y: 0, z: 0 },
        max: { x: 0, y: 9, z: 9 },
      })
    ).toThrow();
  });

  it("すべての軸で min > max のとき失敗する", () => {
    expect(() =>
      BoundsSchema.parse({
        min: { x: 9, y: 9, z: 9 },
        max: { x: 0, y: 0, z: 0 },
      })
    ).toThrow();
  });
});

describe("BlueprintSchema", () => {
  const validBlueprint = {
    version: "1.0" as const,
    name: "Test Building",
    palette: [
      { name: "stone-main", color: "#888888", description: "主石材" },
      { name: "roof-dark", color: "#203A74", description: "屋根の濃色" },
    ],
    bounds: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 1 },
    },
    structure: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    scaffold: [],
  };

  it("最小構成の有効な設計図は parse できる", () => {
    expect(() => BlueprintSchema.parse(validBlueprint)).not.toThrow();
  });

  it("structure と scaffold が空配列でも parse できる", () => {
    expect(() =>
      BlueprintSchema.parse({
        ...validBlueprint,
        structure: [],
        scaffold: [],
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
        },
      })
    ).not.toThrow();
  });

  it("description を省略しても parse できる", () => {
    const { ...rest } = validBlueprint;
    expect(() => BlueprintSchema.parse(rest)).not.toThrow();
  });

  it("description を含んでいても parse できる", () => {
    expect(() =>
      BlueprintSchema.parse({ ...validBlueprint, description: "説明文" })
    ).not.toThrow();
  });

  it("palette を省略しても parse できる", () => {
    const { palette: _, ...withoutPalette } = validBlueprint;
    expect(() => BlueprintSchema.parse(withoutPalette)).not.toThrow();
  });

  it('version が "2.0" だと失敗する', () => {
    expect(() =>
      BlueprintSchema.parse({ ...validBlueprint, version: "2.0" })
    ).toThrow();
  });

  it("name が空文字だと失敗する", () => {
    expect(() =>
      BlueprintSchema.parse({ ...validBlueprint, name: "" })
    ).toThrow();
  });

  it("structure 内のブロックの color が不正なとき、エラーパスが structure を含む", () => {
    const result = BlueprintSchema.safeParse({
      ...validBlueprint,
      structure: [{ x: 0, y: 0, z: 0, color: "bad-color" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join("."));
      expect(paths.some((p) => p.startsWith("structure"))).toBe(true);
    }
  });
});
