import { describe, expect, it } from "vitest";
import {
  positionKey,
  computeBounds,
  findDuplicatePositions,
  getSlice,
  buildPositionMap,
} from "../utils.js";
import type { Block } from "../types.js";

const block = (x: number, y: number, z: number, color = "#888888"): Block => ({
  x,
  y,
  z,
  color,
});

describe("positionKey", () => {
  it('"x,y,z" 形式の文字列を返す', () => {
    expect(positionKey({ x: 1, y: 2, z: 3 })).toBe("1,2,3");
  });

  it("負の座標も正しく処理する", () => {
    expect(positionKey({ x: -1, y: 0, z: -5 })).toBe("-1,0,-5");
  });
});

describe("computeBounds", () => {
  it("空配列のとき null を返す", () => {
    expect(computeBounds([])).toBeNull();
  });

  it("1 ブロックのとき min === max === そのブロック座標", () => {
    const result = computeBounds([block(3, 4, 5)]);
    expect(result).toEqual({
      min: { x: 3, y: 4, z: 5 },
      max: { x: 3, y: 4, z: 5 },
    });
  });

  it("複数ブロックの min/max が正確に計算される", () => {
    const blocks = [block(0, 0, 0), block(5, 3, 9), block(2, 7, 1)];
    expect(computeBounds(blocks)).toEqual({
      min: { x: 0, y: 0, z: 0 },
      max: { x: 5, y: 7, z: 9 },
    });
  });

  it("負の座標を含む場合も正しく動く", () => {
    const blocks = [block(-3, -1, 0), block(2, 4, -5)];
    expect(computeBounds(blocks)).toEqual({
      min: { x: -3, y: -1, z: -5 },
      max: { x: 2, y: 4, z: 0 },
    });
  });
});

describe("findDuplicatePositions", () => {
  it("重複なし → 空配列", () => {
    expect(findDuplicatePositions([block(0, 0, 0), block(1, 0, 0)])).toEqual([]);
  });

  it("同座標が 2 回 → そのキーを含む配列", () => {
    const result = findDuplicatePositions([block(0, 0, 0), block(0, 0, 0)]);
    expect(result).toContain("0,0,0");
    expect(result).toHaveLength(1);
  });

  it("同座標が 3 回でも重複エントリは 1 件のみ", () => {
    const result = findDuplicatePositions([
      block(1, 1, 1),
      block(1, 1, 1),
      block(1, 1, 1),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("1,1,1");
  });

  it("異なる座標が重複する場合はそれぞれ検出される", () => {
    const result = findDuplicatePositions([
      block(0, 0, 0),
      block(0, 0, 0),
      block(1, 1, 1),
      block(1, 1, 1),
    ]);
    expect(result).toHaveLength(2);
    expect(result).toContain("0,0,0");
    expect(result).toContain("1,1,1");
  });
});

describe("getSlice", () => {
  const blocks = [
    block(0, 0, 0),
    block(1, 0, 0),
    block(0, 1, 0),
    block(0, 2, 0),
  ];

  it("Y=0 のブロックだけを返す", () => {
    const result = getSlice(blocks, 0);
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.y === 0)).toBe(true);
  });

  it("Y=1 のブロックだけを返す", () => {
    const result = getSlice(blocks, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ x: 0, y: 1, z: 0 });
  });

  it("該当する Y がないとき空配列を返す", () => {
    expect(getSlice(blocks, 99)).toEqual([]);
  });
});

describe("buildPositionMap", () => {
  it("キーが 'x,y,z' 形式", () => {
    const map = buildPositionMap([block(1, 2, 3)]);
    expect(map.has("1,2,3")).toBe(true);
  });

  it("Map の size が正確", () => {
    const map = buildPositionMap([block(0, 0, 0), block(1, 0, 0), block(2, 0, 0)]);
    expect(map.size).toBe(3);
  });

  it("重複座標は後勝ちで上書きされる", () => {
    const map = buildPositionMap([
      block(0, 0, 0, "#111111"),
      block(0, 0, 0, "#222222"),
    ]);
    expect(map.size).toBe(1);
    expect(map.get("0,0,0")?.color).toBe("#222222");
  });

  it("空配列のとき空 Map を返す", () => {
    expect(buildPositionMap([])).toEqual(new Map());
  });
});
