/**
 * surface.test.ts
 * surface コマンドのロジックテスト
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "boxel-surface-test-"));
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
// 曲面生成ロジックのヘルパー関数
// ============================================================

interface SurfaceOptions {
  cx?: number;
  cy?: number;
  cz?: number;
  samples?: number;
  color: string;
}

function generateTorusBlocks(
  bigR: number,
  smallR: number,
  opts: SurfaceOptions
): Block[] {
  const { cx = 0, cy = 0, cz = 0, samples = 80, color } = opts;
  const N = samples;
  const TWO_PI = 2 * Math.PI;
  const posMap = new Map<string, Block>();
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * TWO_PI;
    for (let j = 0; j <= N; j++) {
      const v = (j / N) * TWO_PI;
      const fx = (bigR + smallR * Math.cos(u)) * Math.cos(v);
      const fy = smallR * Math.sin(u);
      const fz = (bigR + smallR * Math.cos(u)) * Math.sin(v);
      const x = Math.round(fx) + cx;
      const y = Math.round(fy) + cy;
      const z = Math.round(fz) + cz;
      const block: Block = { x, y, z, color };
      posMap.set(positionKey(block), block);
    }
  }
  return Array.from(posMap.values());
}

function generateParaboloidBlocks(
  a: number,
  b: number,
  range: number,
  opts: SurfaceOptions
): Block[] {
  const { cx = 0, cy = 0, cz = 0, samples = 80, color } = opts;
  const N = samples;
  const posMap = new Map<string, Block>();
  for (let i = 0; i <= N; i++) {
    const u = -range + (i / N) * 2 * range;
    for (let j = 0; j <= N; j++) {
      const v = -range + (j / N) * 2 * range;
      const x = Math.round(u) + cx;
      const y = Math.round(a * u * u + b * v * v) + cy;
      const z = Math.round(v) + cz;
      const block: Block = { x, y, z, color };
      posMap.set(positionKey(block), block);
    }
  }
  return Array.from(posMap.values());
}

function generateWaveBlocks(
  amplitude: number,
  kx: number,
  kz: number,
  range: number,
  opts: SurfaceOptions
): Block[] {
  const { cx = 0, cy = 0, cz = 0, samples = 80, color } = opts;
  const N = samples;
  const posMap = new Map<string, Block>();
  for (let i = 0; i <= N; i++) {
    const u = -range + (i / N) * 2 * range;
    for (let j = 0; j <= N; j++) {
      const v = -range + (j / N) * 2 * range;
      const x = Math.round(u) + cx;
      const y = Math.round(amplitude * Math.sin(kx * u) * Math.sin(kz * v)) + cy;
      const z = Math.round(v) + cz;
      const block: Block = { x, y, z, color };
      posMap.set(positionKey(block), block);
    }
  }
  return Array.from(posMap.values());
}

function generateGaussianBlocks(
  amplitude: number,
  sigmaX: number,
  sigmaZ: number,
  range: number,
  opts: SurfaceOptions
): Block[] {
  const { cx = 0, cy = 0, cz = 0, samples = 80, color } = opts;
  const N = samples;
  const posMap = new Map<string, Block>();
  for (let i = 0; i <= N; i++) {
    const u = -range + (i / N) * 2 * range;
    for (let j = 0; j <= N; j++) {
      const v = -range + (j / N) * 2 * range;
      const x = Math.round(u) + cx;
      const y = Math.round(amplitude * Math.exp(
        -(u * u / (2 * sigmaX * sigmaX) + v * v / (2 * sigmaZ * sigmaZ))
      )) + cy;
      const z = Math.round(v) + cz;
      const block: Block = { x, y, z, color };
      posMap.set(positionKey(block), block);
    }
  }
  return Array.from(posMap.values());
}

function generateSaddleBlocks(
  a: number,
  b: number,
  range: number,
  opts: SurfaceOptions
): Block[] {
  const { cx = 0, cy = 0, cz = 0, samples = 80, color } = opts;
  const N = samples;
  const posMap = new Map<string, Block>();
  for (let i = 0; i <= N; i++) {
    const u = -range + (i / N) * 2 * range;
    for (let j = 0; j <= N; j++) {
      const v = -range + (j / N) * 2 * range;
      const x = Math.round(u) + cx;
      const y = Math.round(a * u * u - b * v * v) + cy;
      const z = Math.round(v) + cz;
      const block: Block = { x, y, z, color };
      posMap.set(positionKey(block), block);
    }
  }
  return Array.from(posMap.values());
}

// ============================================================
// torus テスト
// ============================================================

describe("surface torus", () => {
  const COLOR = "#888888";

  it("ブロックが1つ以上生成される", () => {
    const blocks = generateTorusBlocks(4, 1.5, { color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateTorusBlocks(4, 1.5, { color: COLOR });
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("cx/cy/cz オフセットが正しく反映される", () => {
    const cx = 5, cy = 5, cz = 5;
    const bigR = 4, smallR = 1.5;
    const blocks = generateTorusBlocks(bigR, smallR, { cx, cy, cz, color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
    // すべてのブロックがオフセット周辺に集まる
    // x は cx ± (R + r), y は cy ± r, z は cz ± (R + r)
    const maxExtent = bigR + smallR + 1; // +1 for rounding
    for (const b of blocks) {
      expect(Math.abs(b.x - cx)).toBeLessThanOrEqual(maxExtent);
      expect(Math.abs(b.y - cy)).toBeLessThanOrEqual(smallR + 1);
      expect(Math.abs(b.z - cz)).toBeLessThanOrEqual(maxExtent);
    }
  });

  it("samples を増やすと同等以上のブロック数になる", () => {
    const low = generateTorusBlocks(4, 1.5, { color: COLOR, samples: 20 });
    const high = generateTorusBlocks(4, 1.5, { color: COLOR, samples: 80 });
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it("重複座標が生成されない（posMap でユニーク）", () => {
    const blocks = generateTorusBlocks(4, 1.5, { color: COLOR });
    const keys = new Set(blocks.map((b) => positionKey(b)));
    expect(keys.size).toBe(blocks.length);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("torus.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateTorusBlocks(4, 1.5, { cx: 5, cy: 5, cz: 5, color: COLOR });
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
    expect(result.bounds.max.x).toBeGreaterThan(result.bounds.min.x);
  });
});

// ============================================================
// paraboloid テスト
// ============================================================

describe("surface paraboloid", () => {
  const COLOR = "#8B4513";

  it("ブロックが1つ以上生成される", () => {
    const blocks = generateParaboloidBlocks(0.4, 0.4, 5, { color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateParaboloidBlocks(0.4, 0.4, 5, { color: COLOR });
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("cx/cy/cz オフセットが正しく反映される", () => {
    const cx = 5, cy = 0, cz = 5;
    const range = 5;
    const blocks = generateParaboloidBlocks(0.4, 0.4, range, { cx, cy, cz, color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
    // x/z は cx ± range 内, y は cy 以上（放物面 y=au²+bv² >= 0）
    for (const b of blocks) {
      expect(Math.abs(b.x - cx)).toBeLessThanOrEqual(range + 1);
      expect(Math.abs(b.z - cz)).toBeLessThanOrEqual(range + 1);
      expect(b.y).toBeGreaterThanOrEqual(cy);
    }
  });

  it("samples を増やすと同等以上のブロック数になる", () => {
    const low = generateParaboloidBlocks(0.4, 0.4, 5, { color: COLOR, samples: 20 });
    const high = generateParaboloidBlocks(0.4, 0.4, 5, { color: COLOR, samples: 80 });
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("paraboloid.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateParaboloidBlocks(0.4, 0.4, 5, { cx: 5, cy: 0, cz: 5, color: COLOR });
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
    expect(result.bounds.max.y).toBeGreaterThan(result.bounds.min.y);
  });
});

// ============================================================
// wave テスト
// ============================================================

describe("surface wave", () => {
  const COLOR = "#4a90d9";

  it("ブロックが1つ以上生成される", () => {
    const blocks = generateWaveBlocks(3, 0.6, 0.6, 10, { color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateWaveBlocks(3, 0.6, 0.6, 10, { color: COLOR });
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("cx/cy/cz オフセットが正しく反映される", () => {
    const cx = 0, cy = 5, cz = 0;
    const amplitude = 3;
    const range = 10;
    const blocks = generateWaveBlocks(amplitude, 0.6, 0.6, range, { cx, cy, cz, color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
    // x/z は cx ± range 内
    for (const b of blocks) {
      expect(Math.abs(b.x - cx)).toBeLessThanOrEqual(range + 1);
      expect(Math.abs(b.z - cz)).toBeLessThanOrEqual(range + 1);
      // y は cy ± amplitude 内
      expect(Math.abs(b.y - cy)).toBeLessThanOrEqual(amplitude + 1);
    }
  });

  it("samples を増やすと同等以上のブロック数になる", () => {
    const low = generateWaveBlocks(3, 0.6, 0.6, 10, { color: COLOR, samples: 20 });
    const high = generateWaveBlocks(3, 0.6, 0.6, 10, { color: COLOR, samples: 80 });
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("wave.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateWaveBlocks(3, 0.6, 0.6, 10, { cx: 0, cy: 5, cz: 0, color: COLOR });
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
    expect(result.bounds.max.x).toBeGreaterThan(result.bounds.min.x);
  });
});

// ============================================================
// gaussian テスト
// ============================================================

describe("surface gaussian", () => {
  const COLOR = "#5A7A4A";

  it("ブロックが1つ以上生成される", () => {
    const blocks = generateGaussianBlocks(6, 3, 3, 8, { color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateGaussianBlocks(6, 3, 3, 8, { color: COLOR });
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("cx/cy/cz オフセットが正しく反映される", () => {
    const cx = 5, cy = 0, cz = 5;
    const amplitude = 6;
    const range = 8;
    const blocks = generateGaussianBlocks(amplitude, 3, 3, range, { cx, cy, cz, color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      expect(Math.abs(b.x - cx)).toBeLessThanOrEqual(range + 1);
      expect(Math.abs(b.z - cz)).toBeLessThanOrEqual(range + 1);
      // gaussian y は cy 以上（exp >= 0）
      expect(b.y).toBeGreaterThanOrEqual(cy);
      expect(b.y).toBeLessThanOrEqual(cy + amplitude + 1);
    }
  });

  it("中心でY値が最大になる（ガウシアン丘）", () => {
    const cx = 0, cy = 0, cz = 0;
    const blocks = generateGaussianBlocks(6, 3, 3, 8, { cx, cy, cz, color: COLOR });
    const centerBlock = blocks.find((b) => b.x === cx && b.z === cz);
    expect(centerBlock).toBeDefined();
    // 中心のブロックは最大高さ付近にある
    const maxY = Math.max(...blocks.map((b) => b.y));
    expect(centerBlock!.y).toBe(maxY);
  });

  it("samples を増やすと同等以上のブロック数になる", () => {
    const low = generateGaussianBlocks(6, 3, 3, 8, { color: COLOR, samples: 20 });
    const high = generateGaussianBlocks(6, 3, 3, 8, { color: COLOR, samples: 80 });
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("gaussian.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateGaussianBlocks(6, 3, 3, 8, { cx: 5, cy: 0, cz: 5, color: COLOR });
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
    expect(result.bounds.max.y).toBeGreaterThan(result.bounds.min.y);
  });
});

// ============================================================
// saddle テスト
// ============================================================

describe("surface saddle", () => {
  const COLOR = "#888888";

  it("ブロックが1つ以上生成される", () => {
    const blocks = generateSaddleBlocks(0.3, 0.3, 5, { color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("全ブロックが指定色になっている", () => {
    const blocks = generateSaddleBlocks(0.3, 0.3, 5, { color: COLOR });
    for (const b of blocks) {
      expect(b.color).toBe(COLOR);
    }
  });

  it("cx/cy/cz オフセットが正しく反映される", () => {
    const cx = 5, cy = 5, cz = 5;
    const a = 0.3, b = 0.3, range = 5;
    const blocks = generateSaddleBlocks(a, b, range, { cx, cy, cz, color: COLOR });
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(Math.abs(block.x - cx)).toBeLessThanOrEqual(range + 1);
      expect(Math.abs(block.z - cz)).toBeLessThanOrEqual(range + 1);
    }
  });

  it("鞍部（u=0, v=0）は中心Y座標に近い", () => {
    const cx = 0, cy = 5, cz = 0;
    const blocks = generateSaddleBlocks(0.3, 0.3, 5, { cx, cy, cz, color: COLOR });
    const centerBlock = blocks.find((b) => b.x === cx && b.z === cz);
    expect(centerBlock).toBeDefined();
    // u=0, v=0 のとき y = 0, なので centerBlock.y = cy
    expect(centerBlock!.y).toBe(cy);
  });

  it("samples を増やすと同等以上のブロック数になる", () => {
    const low = generateSaddleBlocks(0.3, 0.3, 5, { color: COLOR, samples: 20 });
    const high = generateSaddleBlocks(0.3, 0.3, 5, { color: COLOR, samples: 80 });
    expect(high.length).toBeGreaterThanOrEqual(low.length);
  });

  it("ファイルに書き込まれ bounds が更新される", () => {
    const fp = tmpFile("saddle.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    const blocks = generateSaddleBlocks(0.3, 0.3, 5, { cx: 5, cy: 5, cz: 5, color: COLOR });
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
    expect(result.bounds.max.x).toBeGreaterThan(result.bounds.min.x);
  });
});
