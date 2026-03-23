import { describe, expect, it } from "vitest";
import type { Blueprint } from "@boxel-planner/schema";
import {
  lintBlueprint,
  lintColorCount,
  lintWallThickness,
} from "../lib/lint.js";

function makeBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  return {
    version: "1.0",
    name: "lint-test",
    palette: [],
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    structure: [],
    scaffold: [],
    ...overrides,
  };
}

describe("lintColorCount", () => {
  it("palette 色数が十分なら指摘しない", () => {
    const bp = makeBlueprint({
      palette: Array.from({ length: 10 }, (_, index) => ({
        name: `c${index}`,
        color: `#${String(index).repeat(6)}`.replace(/10/g, "A"),
        description: "test",
      })),
    });
    expect(lintColorCount(bp, 10)).toBeNull();
  });

  it("palette 色数が不足していると指摘する", () => {
    const bp = makeBlueprint({
      palette: [
        { name: "main", color: "#FFFFFF", description: "main" },
      ],
    });
    const issue = lintColorCount(bp, 10);
    expect(issue).not.toBeNull();
    expect(issue?.rule).toBe("color-count");
    expect(issue?.source).toBe("palette");
  });
});

describe("lintWallThickness", () => {
  it("厚み 2 の壁は指摘しない", () => {
    const structure = [];
    for (let x = 0; x <= 1; x++) {
      for (let y = 0; y <= 2; y++) {
        structure.push({ x, y, z: 0, color: "#AAAAAA" });
      }
    }
    const bp = makeBlueprint({ structure });
    expect(lintWallThickness(bp, 2)).toBeNull();
  });

  it("厚み 3 の壁を指摘する", () => {
    const structure = [];
    for (let x = 0; x <= 2; x++) {
      for (let y = 0; y <= 2; y++) {
        structure.push({ x, y, z: 0, color: "#AAAAAA" });
      }
    }
    const bp = makeBlueprint({ structure });
    const issue = lintWallThickness(bp, 2);
    expect(issue).not.toBeNull();
    expect(issue?.observed).toBe(3);
    expect(issue?.samples.length).toBeGreaterThan(0);
  });
});

describe("lintBlueprint", () => {
  it("複数 lint をまとめて返す", () => {
    const structure = [];
    for (let x = 0; x <= 2; x++) {
      structure.push({ x, y: 0, z: 0, color: "#AAAAAA" });
    }
    const bp = makeBlueprint({
      palette: [{ name: "main", color: "#AAAAAA", description: "main" }],
      structure,
    });
    const result = lintBlueprint(bp, { maxWallThickness: 2, minColors: 10 });
    expect(result.issues.map((issue) => issue.rule).sort()).toEqual([
      "color-count",
      "wall-thickness",
    ]);
  });
});
