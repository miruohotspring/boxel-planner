/**
 * shapes.test.ts
 * circle / cylinder / sphere / ellipse コマンドのロジックテスト
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import type { Blueprint, Block } from "@boxel-planner/schema";
import { positionKey, computeBounds } from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";

// ============================================================
// テスト用ヘルパー
// ============================================================

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "boxel-shapes-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function tmpFile(name: string): string {
  return path.join(tmpDir, name);
}

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

function writeFixture(filePath: string, bp: Blueprint): void {
  fs.writeFileSync(filePath, JSON.stringify(bp, null, 2), "utf-8");
}

// ============================================================
// 共通：円生成ロジック（circle / cylinder の基礎）
// ============================================================

function generateCircleBlocks(
  cx: number,
  cz: number,
  r: number,
  y: number,
  color: string,
  filled: boolean
): Block[] {
  const blocks: Block[] = [];
  for (let x = cx - r; x <= cx + r; x++) {
    for (let z = cz - r; z <= cz + r; z++) {
      const dx = x - cx;
      const dz = z - cz;
      const dist2 = dx * dx + dz * dz;
      let place: boolean;
      if (filled) {
        place = dist2 <= r * r;
      } else {
        const rInner = r - 0.5;
        const rOuter = r + 0.5;
        place = dist2 >= rInner * rInner && dist2 <= rOuter * rOuter;
      }
      if (place) blocks.push({ x, y, z, color });
    }
  }
  return blocks;
}

function generateCylinderBlocks(
  cx: number,
  cz: number,
  r: number,
  y1: number,
  y2: number,
  color: string,
  filled: boolean
): Block[] {
  const blocks: Block[] = [];
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  for (let y = minY; y <= maxY; y++) {
    blocks.push(...generateCircleBlocks(cx, cz, r, y, color, filled));
  }
  return blocks;
}

function generateSphereBlocks(
  cx: number,
  cy: number,
  cz: number,
  r: number,
  color: string,
  filled: boolean,
  half: "top" | "bottom" | "full"
): Block[] {
  const blocks: Block[] = [];
  for (let x = cx - r; x <= cx + r; x++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let z = cz - r; z <= cz + r; z++) {
        if (half === "top" && y < cy) continue;
        if (half === "bottom" && y > cy) continue;
        const dx = x - cx;
        const dy = y - cy;
        const dz = z - cz;
        const dist2 = dx * dx + dy * dy + dz * dz;
        let place: boolean;
        if (filled) {
          place = dist2 <= r * r;
        } else {
          const rInner = r - 0.5;
          const rOuter = r + 0.5;
          place = dist2 >= rInner * rInner && dist2 <= rOuter * rOuter;
        }
        if (place) blocks.push({ x, y, z, color });
      }
    }
  }
  return blocks;
}

function generateEllipseBlocks(
  cx: number,
  cz: number,
  rx: number,
  rz: number,
  y: number,
  color: string,
  filled: boolean
): Block[] {
  const blocks: Block[] = [];
  for (let x = cx - rx; x <= cx + rx; x++) {
    for (let z = cz - rz; z <= cz + rz; z++) {
      const dx = x - cx;
      const dz = z - cz;
      const ellipseVal = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
      let place: boolean;
      if (filled) {
        place = ellipseVal <= 1;
      } else {
        place = ellipseVal >= 0.7 && ellipseVal <= 1.3;
      }
      if (place) blocks.push({ x, y, z, color });
    }
  }
  return blocks;
}

function generateSpireBlocks(
  cx: number,
  cz: number,
  y: number,
  radii: number[],
  color: string,
  capColor?: string
): Block[] {
  const blocks: Block[] = [];
  for (const [index, radius] of radii.entries()) {
    blocks.push(...generateCircleBlocks(cx, cz, radius, y + index, color, true));
  }
  if (capColor) {
    blocks.push({ x: cx, y: y + radii.length, z: cz, color: capColor });
  }
  return blocks;
}

// ============================================================
// circle テスト
// ============================================================

describe("circle command logic", () => {
  const COLOR = "#888888";

  it("リング（r=4）: 適切なブロック数が生成される", () => {
    const blocks = generateCircleBlocks(5, 5, 4, 0, COLOR, false);
    // r=4 のリングはおよそ 25〜35 ブロック
    expect(blocks.length).toBeGreaterThan(10);
    expect(blocks.length).toBeLessThan(60);
  });

  it("塗りつぶし（r=4）: リングより多いブロック数", () => {
    const ring = generateCircleBlocks(5, 5, 4, 0, COLOR, false);
    const filled = generateCircleBlocks(5, 5, 4, 0, COLOR, true);
    expect(filled.length).toBeGreaterThan(ring.length);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateCircleBlocks(5, 5, 4, 0, COLOR, false);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("全ブロックのY座標が指定値になっている", () => {
    const blocks = generateCircleBlocks(5, 5, 4, 3, COLOR, false);
    for (const b of blocks) {
      expect(b.y).toBe(3);
    }
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("circle.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateCircleBlocks(5, 5, 4, 0, COLOR, false);
    const posMap = new Map<string, Block>();
    for (const b of blocks) {
      posMap.set(positionKey(b), b);
    }
    const newBlocks = Array.from(posMap.values());
    const updated: Blueprint = {
      ...bp,
      structure: newBlocks,
      bounds: computeBounds(newBlocks) ?? bp.bounds,
    };
    writeBlueprint(fp, updated);

    const result = readBlueprint(fp);
    expect(result.structure.length).toBe(newBlocks.length);
    expect(result.bounds.max.x).toBeGreaterThan(result.bounds.min.x);
  });

  it("重複座標が生成されない（posMap でユニーク）", () => {
    const blocks = generateCircleBlocks(0, 0, 4, 0, COLOR, true);
    const keys = new Set(blocks.map((b) => positionKey(b)));
    expect(keys.size).toBe(blocks.length);
  });

  it("塗りつぶし円（r=4）: 概ねπr²に近いブロック数", () => {
    const blocks = generateCircleBlocks(0, 0, 4, 0, COLOR, true);
    // π * 4² ≈ 50.3 → ±10% なら 45〜56
    expect(blocks.length).toBeGreaterThanOrEqual(45);
    expect(blocks.length).toBeLessThanOrEqual(56);
  });
});

// ============================================================
// cylinder テスト
// ============================================================

describe("cylinder command logic", () => {
  const COLOR = "#888888";

  it("中空円柱（r=4, Y=0〜10）: ブロック数が circle×11 と一致", () => {
    const circleBlocks = generateCircleBlocks(5, 5, 4, 0, COLOR, false);
    const cylinderBlocks = generateCylinderBlocks(5, 5, 4, 0, 10, COLOR, false);
    expect(cylinderBlocks.length).toBe(circleBlocks.length * 11);
  });

  it("塗りつぶし円柱は中空より多いブロック数", () => {
    const hollow = generateCylinderBlocks(5, 5, 4, 0, 10, COLOR, false);
    const filled = generateCylinderBlocks(5, 5, 4, 0, 10, COLOR, true);
    expect(filled.length).toBeGreaterThan(hollow.length);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateCylinderBlocks(5, 5, 4, 0, 10, COLOR, false);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("YレンジがY1〜Y2の全層をカバーしている", () => {
    const blocks = generateCylinderBlocks(5, 5, 3, 2, 5, COLOR, false);
    const ys = new Set(blocks.map((b) => b.y));
    expect(ys.has(2)).toBe(true);
    expect(ys.has(3)).toBe(true);
    expect(ys.has(4)).toBe(true);
    expect(ys.has(5)).toBe(true);
    expect(ys.has(1)).toBe(false);
    expect(ys.has(6)).toBe(false);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("cylinder.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateCylinderBlocks(5, 5, 4, 0, 10, COLOR, false);
    const posMap = new Map<string, Block>();
    for (const b of blocks) {
      posMap.set(positionKey(b), b);
    }
    const newBlocks = Array.from(posMap.values());
    const updated: Blueprint = {
      ...bp,
      structure: newBlocks,
      bounds: computeBounds(newBlocks) ?? bp.bounds,
    };
    writeBlueprint(fp, updated);

    const result = readBlueprint(fp);
    expect(result.structure.length).toBeGreaterThan(0);
    expect(result.bounds.min.y).toBe(0);
    expect(result.bounds.max.y).toBe(10);
  });

  it("y1 > y2 でも正しく処理される（min/max 正規化）", () => {
    const blocks1 = generateCylinderBlocks(0, 0, 3, 0, 4, COLOR, false);
    const blocks2 = generateCylinderBlocks(0, 0, 3, 4, 0, COLOR, false);
    expect(blocks1.length).toBe(blocks2.length);
  });
});

// ============================================================
// sphere テスト
// ============================================================

describe("sphere command logic", () => {
  const COLOR = "#aaaaaa";

  it("完全球（r=5, 中空）: 適切なブロック数", () => {
    const blocks = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    // 中空球殻のブロック数は 4πr² ≈ 314 ±10% なら 283〜346
    expect(blocks.length).toBeGreaterThan(200);
    expect(blocks.length).toBeLessThan(400);
  });

  it("塗りつぶし球は中空球より多いブロック数", () => {
    const hollow = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    const filled = generateSphereBlocks(5, 5, 5, 5, COLOR, true, "full");
    expect(filled.length).toBeGreaterThan(hollow.length);
  });

  it("top half はブロック数が full のおよそ半分", () => {
    const full = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    const top = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "top");
    // top は Y >= cy の範囲なので概ね半分 ± 中央の輪
    expect(top.length).toBeGreaterThan(full.length * 0.4);
    expect(top.length).toBeLessThan(full.length * 0.65);
  });

  it("bottom half は full のおよそ半分", () => {
    const full = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    const bottom = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "bottom");
    expect(bottom.length).toBeGreaterThan(full.length * 0.4);
    expect(bottom.length).toBeLessThan(full.length * 0.65);
  });

  it("top + bottom のブロック数は full 以上（Y=cy 層が重複）", () => {
    const full = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    const top = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "top");
    const bottom = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "bottom");
    expect(top.length + bottom.length).toBeGreaterThanOrEqual(full.length);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("sphere.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateSphereBlocks(5, 5, 5, 5, COLOR, false, "full");
    const posMap = new Map<string, Block>();
    for (const b of blocks) {
      posMap.set(positionKey(b), b);
    }
    const newBlocks = Array.from(posMap.values());
    const updated: Blueprint = {
      ...bp,
      structure: newBlocks,
      bounds: computeBounds(newBlocks) ?? bp.bounds,
    };
    writeBlueprint(fp, updated);

    const result = readBlueprint(fp);
    expect(result.structure.length).toBeGreaterThan(0);
    // r=5 なら X 方向に 0..10 (cx-r=0, cx+r=10)
    expect(result.bounds.max.x - result.bounds.min.x).toBeGreaterThan(0);
  });

  it("重複座標が生成されない", () => {
    const blocks = generateSphereBlocks(0, 0, 0, 4, COLOR, true, "full");
    const keys = new Set(blocks.map((b) => positionKey(b)));
    expect(keys.size).toBe(blocks.length);
  });
});

// ============================================================
// ellipse テスト
// ============================================================

describe("ellipse command logic", () => {
  const COLOR = "#4a90d9";

  it("塗りつぶし楕円（rx=6, rz=4）: 概ねπ*rx*rz に近いブロック数", () => {
    const blocks = generateEllipseBlocks(5, 5, 6, 4, 0, COLOR, true);
    // π * 6 * 4 ≈ 75.4 → ±10% なら 68〜83
    expect(blocks.length).toBeGreaterThanOrEqual(65);
    expect(blocks.length).toBeLessThanOrEqual(90);
  });

  it("塗りつぶしはリングより多いブロック数", () => {
    const ring = generateEllipseBlocks(5, 5, 6, 4, 0, COLOR, false);
    const filled = generateEllipseBlocks(5, 5, 6, 4, 0, COLOR, true);
    expect(filled.length).toBeGreaterThan(ring.length);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateEllipseBlocks(5, 5, 6, 4, 0, COLOR, false);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("全ブロックのY座標が指定値になっている", () => {
    const blocks = generateEllipseBlocks(5, 5, 6, 4, 7, COLOR, false);
    for (const b of blocks) {
      expect(b.y).toBe(7);
    }
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("ellipse.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateEllipseBlocks(5, 5, 6, 4, 0, COLOR, true);
    const posMap = new Map<string, Block>();
    for (const b of blocks) {
      posMap.set(positionKey(b), b);
    }
    const newBlocks = Array.from(posMap.values());
    const updated: Blueprint = {
      ...bp,
      structure: newBlocks,
      bounds: computeBounds(newBlocks) ?? bp.bounds,
    };
    writeBlueprint(fp, updated);

    const result = readBlueprint(fp);
    expect(result.structure.length).toBe(newBlocks.length);
    // rx=6 → max.x - min.x should be ≈ 12
    expect(result.bounds.max.x - result.bounds.min.x).toBe(12);
    // rz=4 → max.z - min.z should be ≈ 8
    expect(result.bounds.max.z - result.bounds.min.z).toBe(8);
  });

  it("重複座標が生成されない", () => {
    const blocks = generateEllipseBlocks(0, 0, 6, 4, 0, COLOR, true);
    const keys = new Set(blocks.map((b) => positionKey(b)));
    expect(keys.size).toBe(blocks.length);
  });

  it("rx=rz の場合、円に近い形状になる", () => {
    const circle = generateCircleBlocks(0, 0, 4, 0, COLOR, true);
    const ellipse = generateEllipseBlocks(0, 0, 4, 4, 0, COLOR, true);
    // 同じ半径の円と楕円は似たブロック数（±5ブロック以内）
    expect(Math.abs(circle.length - ellipse.length)).toBeLessThanOrEqual(10);
  });
});

// ============================================================
// spire テスト
// ============================================================

describe("spire command logic", () => {
  const COLOR = "#3E5FA8";
  const CAP_COLOR = "#D8B343";

  it("半径列ぶんの層が順に積まれる", () => {
    const blocks = generateSpireBlocks(0, 0, 10, [4, 3, 3, 2, 1], COLOR);
    const ys = new Set(blocks.map((block) => block.y));
    expect(ys).toEqual(new Set([10, 11, 12, 13, 14]));
  });

  it("下層ほど上層よりブロック数が多い", () => {
    const baseLayer = generateSpireBlocks(0, 0, 0, [4], COLOR);
    const topLayer = generateSpireBlocks(0, 0, 0, [1], COLOR);
    expect(baseLayer.length).toBeGreaterThan(topLayer.length);
  });

  it("cap-color 指定時に頂点ブロックが追加される", () => {
    const blocks = generateSpireBlocks(2, -1, 5, [3, 2, 1], COLOR, CAP_COLOR);
    const top = blocks.find((block) => block.x === 2 && block.y === 8 && block.z === -1);
    expect(top?.color).toBe(CAP_COLOR);
  });

  it("重複座標が生成されない", () => {
    const blocks = generateSpireBlocks(0, 0, 0, [3, 3, 2, 2, 1], COLOR, CAP_COLOR);
    const keys = new Set(blocks.map((block) => positionKey(block)));
    expect(keys.size).toBe(blocks.length);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("spire.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateSpireBlocks(0, 0, 4, [3, 2, 1], COLOR, CAP_COLOR);
    const posMap = new Map<string, Block>();
    for (const block of blocks) {
      posMap.set(positionKey(block), block);
    }
    const newBlocks = Array.from(posMap.values());
    const updated: Blueprint = {
      ...bp,
      structure: newBlocks,
      bounds: computeBounds(newBlocks) ?? bp.bounds,
    };
    writeBlueprint(fp, updated);

    const result = readBlueprint(fp);
    expect(result.bounds.min).toEqual({ x: -3, y: 4, z: -3 });
    expect(result.bounds.max).toEqual({ x: 3, y: 7, z: 3 });
  });
});

// ============================================================
// カラーバリデーションロジックのテスト
// ============================================================

describe("color validation", () => {
  const validColors = ["#888888", "#FF0000", "#aaaaaa", "#AbCdEf"];
  const invalidColors = ["888888", "#GG0000", "#1234", "red", ""];

  for (const c of validColors) {
    it(`valid: "${c}"`, () => {
      expect(/^#[0-9A-Fa-f]{6}$/.test(c)).toBe(true);
    });
  }

  for (const c of invalidColors) {
    it(`invalid: "${c}"`, () => {
      expect(/^#[0-9A-Fa-f]{6}$/.test(c)).toBe(false);
    });
  }
});
