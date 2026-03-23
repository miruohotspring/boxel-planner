import { describe, expect, it } from "vitest";
import {
  validateBlueprint,
  parseBlueprint,
  parseBlueprintJson,
} from "../validators.js";

const validBlueprint = {
  version: "1.0" as const,
  name: "Test",
  palette: [
    { name: "stone-main", color: "#888888", description: "主石材" },
  ],
  bounds: {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 0, y: 0, z: 0 },
  },
  structure: [{ x: 0, y: 0, z: 0, color: "#888888" }],
  scaffold: [],
};

describe("validateBlueprint", () => {
  it("有効なオブジェクトは ok: true と data を返す", () => {
    const result = validateBlueprint(validBlueprint);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Test");
    }
  });

  it("version が欠けていると ok: false を返す", () => {
    const { version: _, ...withoutVersion } = validBlueprint;
    const result = validateBlueprint(withoutVersion);
    expect(result.ok).toBe(false);
  });

  it("palette を省略しても ok: true を返す", () => {
    const { palette: _, ...withoutPalette } = validBlueprint;
    const result = validateBlueprint(withoutPalette);
    expect(result.ok).toBe(true);
  });

  it("errors に path と message が含まれる", () => {
    const result = validateBlueprint({ ...validBlueprint, name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty("path");
      expect(result.errors[0]).toHaveProperty("message");
    }
  });

  it("深いパスのエラーが structure[0].color を示す", () => {
    const result = validateBlueprint({
      ...validBlueprint,
      structure: [{ x: 0, y: 0, z: 0, color: "invalid" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.errors.map((e) => e.path);
      expect(paths.some((p) => p.includes("structure"))).toBe(true);
    }
  });

  it("null を渡すと ok: false を返す", () => {
    const result = validateBlueprint(null);
    expect(result.ok).toBe(false);
  });
});

describe("parseBlueprint", () => {
  it("有効なオブジェクトは Blueprint を返す", () => {
    const bp = parseBlueprint(validBlueprint);
    expect(bp.name).toBe("Test");
  });

  it("無効なオブジェクトは例外を投げる", () => {
    expect(() => parseBlueprint({ version: "1.0" })).toThrow();
  });
});

describe("parseBlueprintJson", () => {
  it("有効な JSON 文字列は ok: true を返す", () => {
    const result = parseBlueprintJson(JSON.stringify(validBlueprint));
    expect(result.ok).toBe(true);
  });

  it("構文エラーの JSON は ok: false で 'JSON parse error' を含む", () => {
    const result = parseBlueprintJson("{invalid json}");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]?.message).toMatch(/JSON parse error/i);
    }
  });

  it("バリデーション失敗の JSON は ok: false でスキーマエラーを返す", () => {
    const invalid = { ...validBlueprint, name: "" };
    const result = parseBlueprintJson(JSON.stringify(invalid));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
