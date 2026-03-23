import { describe, it, expect } from "vitest";
import { generateScaffoldBlocks } from "../commands/scaffold.js";
import type { Blueprint } from "@boxel-planner/schema";

function makeBlueprint(overrides: Partial<Blueprint> = {}): Blueprint {
  return {
    version: "1.0",
    name: "test",
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    structure: [],
    scaffold: [],
    ...overrides,
  };
}

describe("generateScaffoldBlocks", () => {
  it("structure が空のときは [] を返す", () => {
    const bp = makeBlueprint();
    const result = generateScaffoldBlocks(bp, 1);
    expect(result).toHaveLength(0);
  });

  it("1ブロックの structure に margin=1 で外周フレームが生成される", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const result = generateScaffoldBlocks(bp, 1);
    // outer: x=-1..1, y=-1..1, z=-1..1
    // 全ての足場ブロックは外周 XZ 上にある
    expect(result.length).toBeGreaterThan(0);
    for (const b of result) {
      expect(b.color).toBe("#FF8C00");
    }
  });

  it("margin=0 の場合、structure bounds ぴったりのフレームが生成される", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 2, y: 0, z: 2, color: "#FF0000" },
      ],
    });
    // bounds: x=0..2, y=0..0, z=0..2
    // outer (margin=0): x=0..2, y=0..0, z=0..2
    // 外周 XZ: 全辺
    const result = generateScaffoldBlocks(bp, 0);
    // (0,0,0), (1,0,0), (2,0,0), (0,0,1), (2,0,1), (0,0,2), (1,0,2), (2,0,2) = 8
    expect(result.length).toBe(8);
  });

  it("margin=1 で 1x1x1 structure から正しい外周が生成される", () => {
    const bp = makeBlueprint({
      structure: [{ x: 5, y: 5, z: 5, color: "#FF0000" }],
    });
    // outer: x=4..6, y=4..6, z=4..6
    // 各 Y 層 (4,5,6) で XZ 外周 3x3 の辺
    // Y=4: 3x3外周 = 8ブロック
    // Y=5: 8ブロック
    // Y=6: 8ブロック
    // 合計 24
    const result = generateScaffoldBlocks(bp, 1);
    expect(result.length).toBe(24);
    // 全ブロックが outer 境界上にあることを確認
    for (const b of result) {
      const onBorderX = b.x === 4 || b.x === 6;
      const onBorderZ = b.z === 4 || b.z === 6;
      expect(onBorderX || onBorderZ).toBe(true);
    }
  });

  it("多段 structure でも正しく生成される", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 0, y: 2, z: 0, color: "#FF0000" },
      ],
    });
    // bounds: x=0..0, y=0..2, z=0..0
    // outer (margin=1): x=-1..1, y=-1..3, z=-1..1
    const result = generateScaffoldBlocks(bp, 1);
    expect(result.length).toBeGreaterThan(0);
    // Y の範囲が -1 〜 3 の 5 層
    const yValues = new Set(result.map((b) => b.y));
    expect(yValues.has(-1)).toBe(true);
    expect(yValues.has(3)).toBe(true);
  });

  it("既存の scaffold は上書きされる（前回の scaffold は使わない）", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
      scaffold: [{ x: 100, y: 100, z: 100, color: "#AAAAAA" }],
    });
    // generateScaffoldBlocks は blueprint.scaffold を無視して新規生成する
    const result = generateScaffoldBlocks(bp, 1);
    const hasOld = result.some((b) => b.x === 100);
    expect(hasOld).toBe(false);
  });

  it("全足場ブロックのカラーはデフォルト #FF8C00", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#123456" }],
    });
    const result = generateScaffoldBlocks(bp, 1);
    for (const b of result) {
      expect(b.color).toBe("#FF8C00");
    }
  });

  it("重複座標が存在しない", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 4, y: 4, z: 4, color: "#FF0000" },
      ],
    });
    const result = generateScaffoldBlocks(bp, 1);
    const keys = result.map((b) => `${b.x},${b.y},${b.z}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
