import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import type { Blueprint } from "@boxel-planner/schema";

// ============================================================
// テスト用ヘルパー
// ============================================================

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "boxel-test-"));
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
    palette: [],
    bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
    structure: [],
    scaffold: [],
    ...overrides,
  };
}

function writeFixture(filePath: string, bp: Blueprint): void {
  fs.writeFileSync(filePath, JSON.stringify(bp, null, 2), "utf-8");
}

function readFixture(filePath: string): Blueprint {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Blueprint;
}

// ============================================================
// lib/file
// ============================================================
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import {
  addPaletteEntry,
  updatePaletteEntry,
  removePaletteEntry,
} from "../commands/palette.js";

describe("lib/file", () => {
  it("readBlueprint: 有効なファイルを読み込める", () => {
    const fp = tmpFile("test.boxel.json");
    const bp = makeBlueprint({
      name: "hello",
      palette: [{ name: "stone", color: "#888888", description: "石材" }],
    });
    writeFixture(fp, bp);
    const result = readBlueprint(fp);
    expect(result.name).toBe("hello");
    expect(result.palette).toHaveLength(1);
  });

  it("readBlueprint: 存在しないファイルで例外", () => {
    expect(() => readBlueprint(tmpFile("nonexistent.json"))).toThrow();
  });

  it("readBlueprint: 無効なJSONで例外", () => {
    const fp = tmpFile("bad.json");
    fs.writeFileSync(fp, "not json", "utf-8");
    expect(() => readBlueprint(fp)).toThrow();
  });

  it("writeBlueprint: ファイルを書き込める", () => {
    const fp = tmpFile("out.boxel.json");
    const bp = makeBlueprint({ name: "written" });
    writeBlueprint(fp, bp);
    const result = readFixture(fp);
    expect(result.name).toBe("written");
  });
});

// ============================================================
// commands/init (ロジック相当)
// ============================================================
describe("init command logic", () => {
  it("新規 Blueprint の初期構造が正しい", () => {
    const bp = makeBlueprint({ name: "myhouse", structure: [], scaffold: [] });
    expect(bp.version).toBe("1.0");
    expect(bp.palette).toEqual([]);
    expect(bp.structure).toHaveLength(0);
    expect(bp.scaffold).toHaveLength(0);
  });
});

// ============================================================
// commands/palette ロジック
// ============================================================
describe("palette command logic", () => {
  it("パレット定義を追加できる", () => {
    const bp = makeBlueprint();
    const updated = addPaletteEntry(bp, {
      name: "stone-main",
      color: "#E8ECF5",
      description: "主壁色",
    });
    expect(updated.palette).toEqual([
      { name: "stone-main", color: "#E8ECF5", description: "主壁色" },
    ]);
  });

  it("同名のパレット定義は追加できない", () => {
    const bp = makeBlueprint({
      palette: [{ name: "stone-main", color: "#E8ECF5", description: "主壁色" }],
    });
    expect(() =>
      addPaletteEntry(bp, {
        name: "stone-main",
        color: "#FFFFFF",
        description: "別色",
      })
    ).toThrow(/already exists/);
  });

  it("パレット定義を更新できる", () => {
    const bp = makeBlueprint({
      palette: [{ name: "stone-main", color: "#E8ECF5", description: "主壁色" }],
    });
    const updated = updatePaletteEntry(bp, "stone-main", {
      color: "#FFFFFF",
      description: "より明るい石材",
    });
    expect(updated.palette).toEqual([
      { name: "stone-main", color: "#FFFFFF", description: "より明るい石材" },
    ]);
  });

  it("パレット定義の名前を変更できる", () => {
    const bp = makeBlueprint({
      palette: [{ name: "stone-main", color: "#E8ECF5", description: "主壁色" }],
    });
    const updated = updatePaletteEntry(bp, "stone-main", {
      newName: "wall-main",
    });
    expect(updated.palette?.[0]?.name).toBe("wall-main");
  });

  it("パレット定義を削除できる", () => {
    const bp = makeBlueprint({
      palette: [{ name: "stone-main", color: "#E8ECF5", description: "主壁色" }],
    });
    const updated = removePaletteEntry(bp, "stone-main");
    expect(updated.palette).toEqual([]);
  });
});

// ============================================================
// commands/add ロジック
// ============================================================
import {
  computeBounds,
  positionKey,
  buildPositionMap,
  type Block,
} from "@boxel-planner/schema";

describe("add command logic", () => {
  it("structure にブロックを追加できる", () => {
    const fp = tmpFile("add.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    // ロジックを再現
    const block: Block = { x: 1, y: 0, z: 2, color: "#FF0000" };
    bp.structure.push(block);
    const newBounds = computeBounds([...bp.structure, ...bp.scaffold]) ?? bp.bounds;
    bp.bounds = newBounds;
    writeBlueprint(fp, bp);

    const result = readFixture(fp);
    expect(result.structure).toHaveLength(1);
    expect(result.structure[0]?.color).toBe("#FF0000");
    expect(result.bounds.max).toEqual({ x: 1, y: 0, z: 2 });
  });

  it("同座標にブロックを追加すると上書きされる", () => {
    const fp = tmpFile("overwrite.boxel.json");
    const initial: Block = { x: 0, y: 0, z: 0, color: "#AAAAAA" };
    const bp = makeBlueprint({ structure: [initial] });
    writeFixture(fp, bp);

    const blocks = [...bp.structure];
    const key = positionKey({ x: 0, y: 0, z: 0 });
    const idx = blocks.findIndex((b) => positionKey(b) === key);
    const newBlock: Block = { x: 0, y: 0, z: 0, color: "#BBBBBB" };
    if (idx >= 0) blocks[idx] = newBlock;
    bp.structure = blocks;
    writeBlueprint(fp, bp);

    const result = readFixture(fp);
    expect(result.structure).toHaveLength(1);
    expect(result.structure[0]?.color).toBe("#BBBBBB");
  });
});

// ============================================================
// commands/remove ロジック
// ============================================================
describe("remove command logic", () => {
  it("存在するブロックを削除できる", () => {
    const block: Block = { x: 3, y: 1, z: 5, color: "#123456" };
    const blocks = [block, { x: 0, y: 0, z: 0, color: "#000000" }];
    const key = positionKey({ x: 3, y: 1, z: 5 });
    const filtered = blocks.filter((b) => positionKey(b) !== key);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.color).toBe("#000000");
  });

  it("存在しない座標を削除しようとしても変化なし", () => {
    const blocks: Block[] = [{ x: 0, y: 0, z: 0, color: "#000000" }];
    const key = positionKey({ x: 9, y: 9, z: 9 });
    const filtered = blocks.filter((b) => positionKey(b) !== key);
    expect(filtered).toHaveLength(1);
  });

  it("範囲削除: 複数ブロックを一括削除できる", () => {
    const fp = tmpFile("remove-range.boxel.json");
    // 3x1x3 = 9 ブロックを配置
    const blocks: Block[] = [];
    for (let x = 0; x <= 2; x++) {
      for (let z = 0; z <= 2; z++) {
        blocks.push({ x, y: 0, z, color: "#888888" });
      }
    }
    const bp = makeBlueprint({ structure: blocks });
    writeFixture(fp, bp);

    // x:0-1, z:0-1 の 2x2=4 ブロックを削除
    const minX = 0, maxX = 1, minY = 0, maxY = 0, minZ = 0, maxZ = 1;
    const inRange = (bx: number, by: number, bz: number): boolean =>
      bx >= minX && bx <= maxX &&
      by >= minY && by <= maxY &&
      bz >= minZ && bz <= maxZ;

    const read = readFixture(fp);
    const before = read.structure.length;
    const filtered = read.structure.filter((b) => !inRange(b.x, b.y, b.z));
    const removedCount = before - filtered.length;

    expect(removedCount).toBe(4);
    expect(filtered).toHaveLength(5);
  });

  it("範囲削除: ファイルに書き込まれた結果が正しい", () => {
    const fp = tmpFile("remove-range-write.boxel.json");
    // 2x1x2 = 4 ブロックを配置
    const blocks: Block[] = [
      { x: 0, y: 0, z: 0, color: "#FF0000" },
      { x: 1, y: 0, z: 0, color: "#FF0000" },
      { x: 0, y: 0, z: 1, color: "#FF0000" },
      { x: 1, y: 0, z: 1, color: "#FF0000" },
      { x: 5, y: 0, z: 5, color: "#00FF00" }, // 範囲外
    ];
    const bp = makeBlueprint({ structure: blocks });
    writeFixture(fp, bp);

    // x:0-1, y:0-0, z:0-1 の範囲を削除
    const minX = 0, maxX = 1, minY = 0, maxY = 0, minZ = 0, maxZ = 1;
    const inRange = (bx: number, by: number, bz: number): boolean =>
      bx >= minX && bx <= maxX &&
      by >= minY && by <= maxY &&
      bz >= minZ && bz <= maxZ;

    const read = readFixture(fp);
    const newStructure = read.structure.filter((b) => !inRange(b.x, b.y, b.z));
    const newBp = { ...read, structure: newStructure };
    writeBlueprint(fp, newBp);

    const result = readFixture(fp);
    // 範囲外の1ブロックだけ残る
    expect(result.structure).toHaveLength(1);
    expect(result.structure[0]?.color).toBe("#00FF00");
  });
});

// ============================================================
// commands/get ロジック
// ============================================================
describe("get command logic", () => {
  it("存在するブロックを取得できる", () => {
    const block: Block = { x: 2, y: 3, z: 4, color: "#ABCDEF" };
    const map = buildPositionMap([block]);
    const result = map.get(positionKey({ x: 2, y: 3, z: 4 }));
    expect(result?.color).toBe("#ABCDEF");
  });

  it("存在しない座標は undefined", () => {
    const map = buildPositionMap([]);
    const result = map.get(positionKey({ x: 0, y: 0, z: 0 }));
    expect(result).toBeUndefined();
  });
});

// ============================================================
// commands/fill ロジック
// ============================================================
describe("fill command logic", () => {
  it("範囲をすべて埋められる", () => {
    const posMap = new Map<string, Block>();
    for (let x = 0; x <= 1; x++) {
      for (let y = 0; y <= 1; y++) {
        for (let z = 0; z <= 1; z++) {
          const b: Block = { x, y, z, color: "#FF0000" };
          posMap.set(positionKey(b), b);
        }
      }
    }
    // 2x2x2 = 8 ブロック
    expect(posMap.size).toBe(8);
  });

  it("hollow モードでは外周のみ", () => {
    const minX = 0, maxX = 2, minY = 0, maxY = 2, minZ = 0, maxZ = 2;
    const posMap = new Map<string, Block>();
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const onBorder =
            x === minX || x === maxX ||
            y === minY || y === maxY ||
            z === minZ || z === maxZ;
          if (!onBorder) continue;
          const b: Block = { x, y, z, color: "#FF0000" };
          posMap.set(positionKey(b), b);
        }
      }
    }
    // 3x3x3 = 27 total, 1 inner = 26 border
    expect(posMap.size).toBe(26);
  });

  it("dry-run: ファイルが変更されない", () => {
    const fp = tmpFile("fill-dryrun.boxel.json");
    const bp = makeBlueprint();
    writeFixture(fp, bp);

    // dry-run ロジックを再現: fill の計算のみ行い writeBlueprint を呼ばない
    const minX = 0, maxX = 9, minY = 0, maxY = 4, minZ = 0, maxZ = 9;
    const existingBlocks = [...bp.structure];
    const posMap = new Map<string, Block>();
    for (const b of existingBlocks) {
      posMap.set(positionKey(b), b);
    }

    let added = 0;
    const hollow = true;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (hollow) {
            const onBorder =
              x === minX || x === maxX ||
              y === minY || y === maxY ||
              z === minZ || z === maxZ;
            if (!onBorder) continue;
          }
          const block: Block = { x, y, z, color: "#888888" };
          const key = positionKey(block);
          if (!posMap.has(key)) added++;
          // dry-run なので posMap への set はするが writeBlueprint は呼ばない
        }
      }
    }

    // ファイルは変更されていないこと
    const result = readFixture(fp);
    expect(result.structure).toHaveLength(0);

    // 10x5x10 の hollow 外周ブロック数を確認
    // 10x10x5 - 8x8x3 = 500 - 192 = 308
    expect(added).toBe(308);
  });

  it("dry-run: hollow の count が正しい（10x5x10）", () => {
    // 10x5x10 hollow の外周ブロック数: 全体 - 内部
    // 全体: 10 * 5 * 10 = 500
    // 内部: (10-2) * (5-2) * (10-2) = 8 * 3 * 8 = 192
    // 外周: 500 - 192 = 308
    const minX = 0, maxX = 9, minY = 0, maxY = 4, minZ = 0, maxZ = 9;
    let count = 0;
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const onBorder =
            x === minX || x === maxX ||
            y === minY || y === maxY ||
            z === minZ || z === maxZ;
          if (onBorder) count++;
        }
      }
    }
    expect(count).toBe(308);
  });
});

// ============================================================
// commands/render ロジック
// ============================================================
import { renderSlice } from "../commands/render.js";
import { evaluateSizeLimits } from "../commands/check.js";
import { evaluateAccessPath } from "../commands/check-access.js";

describe("render command", () => {
  it("Y断面のグリッドを出力できる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#00FF00" },
      ],
    });
    const { grid, structureCount, scaffoldCount } = renderSlice(bp, 0);
    expect(structureCount).toBe(2);
    expect(scaffoldCount).toBe(0);
    expect(grid).toContain("■");
  });

  it("ブロックがない Y 層でも出力できる", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 1, z: 0, color: "#FF0000" }],
    });
    const { structureCount, scaffoldCount } = renderSlice(bp, 0);
    expect(structureCount).toBe(0);
    expect(scaffoldCount).toBe(0);
  });

  it("空の設計図では '(empty)' を返す", () => {
    const bp = makeBlueprint();
    const { grid } = renderSlice(bp, 0);
    expect(grid).toBe("(empty)");
  });
});

// ============================================================
// commands/check ロジック
// ============================================================
describe("check command", () => {
  it("structure のサイズが上限内なら passed=true", () => {
    const bp = makeBlueprint({
      structure: [
        { x: -2, y: 0, z: -1, color: "#FF0000" },
        { x: 2, y: 3, z: 1, color: "#FF0000" },
      ],
    });

    const result = evaluateSizeLimits(bp, "structure", { x: 5, y: 4, z: 3 });

    expect(result.passed).toBe(true);
    expect(result.bounds?.size).toEqual({ x: 5, y: 4, z: 3 });
    expect(result.checks).toEqual([
      { axis: "x", size: 5, limit: 5, ok: true },
      { axis: "y", size: 4, limit: 4, ok: true },
      { axis: "z", size: 3, limit: 3, ok: true },
    ]);
  });

  it("structure のサイズが上限を超えると passed=false", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 5, y: 1, z: 0, color: "#FF0000" },
      ],
    });

    const result = evaluateSizeLimits(bp, "structure", { x: 5, y: 2 });

    expect(result.passed).toBe(false);
    expect(result.checks).toEqual([
      { axis: "x", size: 6, limit: 5, ok: false },
      { axis: "y", size: 2, limit: 2, ok: true },
    ]);
  });

  it("target=all では scaffold を含めたサイズで判定する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
      scaffold: [{ x: 4, y: 0, z: 0, color: "#888888" }],
    });

    const result = evaluateSizeLimits(bp, "all", { x: 4 });

    expect(result.passed).toBe(false);
    expect(result.bounds?.size.x).toBe(5);
  });

  it("空レイヤーは size 0 として扱う", () => {
    const bp = makeBlueprint();
    const result = evaluateSizeLimits(bp, "structure", { x: 0, y: 0, z: 0 });

    expect(result.passed).toBe(true);
    expect(result.bounds).toBeNull();
    expect(result.checks).toEqual([
      { axis: "x", size: 0, limit: 0, ok: true },
      { axis: "y", size: 0, limit: 0, ok: true },
      { axis: "z", size: 0, limit: 0, ok: true },
    ]);
  });
});

describe("check-access command", () => {
  it("障害物がなければ pathFound=true", () => {
    const bp = makeBlueprint();
    const result = evaluateAccessPath(bp, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 });

    expect(result.pathFound).toBe(true);
    expect(result.distance).toBe(2);
  });

  it("壁で完全に塞がれると pathFound=false", () => {
    const bp = makeBlueprint({
      structure: Array.from({ length: 9 }, (_, i) => {
        const y = Math.floor(i / 3) - 1;
        const z = (i % 3) - 1;
        return { x: 1, y, z, color: "#FF0000" };
      }),
    });
    const result = evaluateAccessPath(bp, { x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { margin: 0 });

    expect(result.pathFound).toBe(false);
    expect(result.reason).toContain("no path");
  });

  it("開始点が埋まっていると失敗する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const result = evaluateAccessPath(bp, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });

    expect(result.pathFound).toBe(false);
    expect(result.reason).toBe("start is occupied");
  });

  it("includeScaffold=true で足場も障害物として扱う", () => {
    const bp = makeBlueprint({
      scaffold: [{ x: 1, y: 0, z: 0, color: "#888888" }],
    });

    const withoutScaffold = evaluateAccessPath(
      bp,
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { margin: 0 }
    );
    const withScaffold = evaluateAccessPath(
      bp,
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { includeScaffold: true, margin: 0 }
    );

    expect(withoutScaffold.pathFound).toBe(true);
    expect(withScaffold.pathFound).toBe(false);
  });
});

// ============================================================
// commands/validate ロジック
// ============================================================
import { parseBlueprintJson, findDuplicatePositions } from "@boxel-planner/schema";

describe("validate command logic", () => {
  it("有効な設計図は ok:true を返す", () => {
    const bp = makeBlueprint({ name: "valid" });
    const result = parseBlueprintJson(JSON.stringify(bp));
    expect(result.ok).toBe(true);
  });

  it("無効な設計図は ok:false を返す", () => {
    const result = parseBlueprintJson('{"version":"2.0","name":"bad"}');
    expect(result.ok).toBe(false);
  });

  it("重複座標を検出できる", () => {
    const blocks: Block[] = [
      { x: 0, y: 0, z: 0, color: "#FF0000" },
      { x: 0, y: 0, z: 0, color: "#00FF00" },
    ];
    const dups = findDuplicatePositions(blocks);
    expect(dups).toHaveLength(1);
    expect(dups[0]).toBe("0,0,0");
  });

  it("重複なしなら空配列", () => {
    const blocks: Block[] = [
      { x: 0, y: 0, z: 0, color: "#FF0000" },
      { x: 1, y: 0, z: 0, color: "#00FF00" },
    ];
    expect(findDuplicatePositions(blocks)).toHaveLength(0);
  });
});
