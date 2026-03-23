import { describe, it, expect } from "vitest";
import type { Blueprint } from "@boxel-planner/schema";
import { buildOrthoViews, renderOrtho } from "../commands/ortho.js";

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

// ============================================================
// buildOrthoViews
// ============================================================

describe("buildOrthoViews", () => {
  it("structure と scaffold が両方空のとき null を返す", () => {
    const bp = makeBlueprint();
    const result = buildOrthoViews(bp, false);
    expect(result).toBeNull();
  });

  it("structure が空でも scaffold があれば null ではない", () => {
    const bp = makeBlueprint({
      scaffold: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
  });

  it("(0,0,0) にブロック1つ → TOP グリッドに ■ が1つ存在する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // TOP: 1x1 グリッド → [["■"]]
    expect(result!.topGrid).toEqual([["■"]]);
  });

  it("(0,0,0) にブロック1つ → FRONT グリッドに ■ が1つ存在する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // FRONT: 1x1 グリッド → [["■"]]
    expect(result!.frontGrid).toEqual([["■"]]);
  });

  it("(0,0,0) にブロック1つ → SIDE グリッドに ■ が1つ存在する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // SIDE: 1x1 グリッド → [["■"]]
    expect(result!.sideGrid).toEqual([["■"]]);
  });

  it("scaffold のみのブロックは --scaffold なしでは · になる", () => {
    const bp = makeBlueprint({
      scaffold: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    });
    const result = buildOrthoViews(bp, false); // showScaffold = false
    expect(result).not.toBeNull();
    expect(result!.topGrid[0]![0]).toBe("·");
    expect(result!.frontGrid[0]![0]).toBe("·");
    expect(result!.sideGrid[0]![0]).toBe("·");
  });

  it("scaffold のみのブロックは --scaffold ありでは ░ になる", () => {
    const bp = makeBlueprint({
      scaffold: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    });
    const result = buildOrthoViews(bp, true); // showScaffold = true
    expect(result).not.toBeNull();
    expect(result!.topGrid[0]![0]).toBe("░");
    expect(result!.frontGrid[0]![0]).toBe("░");
    expect(result!.sideGrid[0]![0]).toBe("░");
  });

  it("structure と scaffold が同じ位置にある場合、structure が優先（■）", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
      scaffold: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    });
    const result = buildOrthoViews(bp, true);
    expect(result).not.toBeNull();
    expect(result!.topGrid[0]![0]).toBe("■");
    expect(result!.frontGrid[0]![0]).toBe("■");
    expect(result!.sideGrid[0]![0]).toBe("■");
  });

  it("複数ブロック: TOP ビューで Z が行、X が列になる", () => {
    // (0,0,0), (1,0,0), (0,0,1) の3ブロック
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#FF0000" },
        { x: 0, y: 0, z: 1, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // bounds: x=0..1, y=0..0, z=0..1
    // TOP rows (z=0 to z=1):
    //   z=0: x=0 → ■, x=1 → ■
    //   z=1: x=0 → ■, x=1 → ·
    expect(result!.topGrid[0]).toEqual(["■", "■"]);
    expect(result!.topGrid[1]).toEqual(["■", "·"]);
  });

  it("複数ブロック: FRONT ビューで Y が行（上から降順）、X が列", () => {
    // (0,0,0) と (0,1,0)
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 0, y: 1, z: 0, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // bounds: x=0..0, y=0..1, z=0..0
    // FRONT rows (y=1 to y=0):
    //   y=1: x=0 → ■
    //   y=0: x=0 → ■
    expect(result!.frontGrid[0]).toEqual(["■"]); // y=1
    expect(result!.frontGrid[1]).toEqual(["■"]); // y=0
  });

  it("複数ブロック: SIDE ビューで Y が行（上から降順）、Z が列", () => {
    // (0,0,0) と (0,0,1)
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 0, y: 0, z: 1, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // bounds: x=0..0, y=0..0, z=0..1
    // SIDE rows (y=0 to y=0):
    //   y=0: z=0 → ■, z=1 → ■
    expect(result!.sideGrid[0]).toEqual(["■", "■"]);
  });

  it("bounds の外のブロックは表示されない（bounds が全ブロックから計算されるので自然にOK）", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 2, y: 0, z: 0, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false);
    expect(result).not.toBeNull();
    // bounds: x=0..2, y=0..0, z=0..0
    // TOP: 1行3列
    expect(result!.topGrid[0]).toHaveLength(3);
    expect(result!.topGrid[0]).toEqual(["■", "·", "■"]);
  });

  it("crop=structure では scaffold の余白を表示範囲に含めない", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
      scaffold: [{ x: 5, y: 0, z: 0, color: "#FF8C00" }],
    });
    const result = buildOrthoViews(bp, true, false, "solid", { crop: "structure" });
    expect(result).not.toBeNull();
    expect(result!.bounds.min.x).toBe(0);
    expect(result!.bounds.max.x).toBe(0);
    expect(result!.topGrid).toEqual([["■"]]);
  });

  it("center=true では空セルに中心線を描く", () => {
    const bp = makeBlueprint({
      structure: [
        { x: -1, y: 0, z: -1, color: "#FF0000" },
        { x: 1, y: 0, z: 1, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "solid", { center: true });
    expect(result).not.toBeNull();
    expect(result!.topGrid[1]?.[1]).toBe("┼");
  });

  it("gridStep=2 では空セルに補助グリッドを描く", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 1, y: 0, z: 1, color: "#FF0000" },
        { x: 3, y: 0, z: 3, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "solid", { gridStep: 2 });
    expect(result).not.toBeNull();
    expect(result!.topGrid[1]?.[1]).toBe("┼");
  });

  it("highlightColor では指定色を ◆ で強調する", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "solid", { highlightColor: "#0000ff" });
    expect(result).not.toBeNull();
    expect(result!.topGrid[0]).toEqual(["■", "◆"]);
  });
});

// ============================================================
// buildOrthoViews (verbose モード)
// ============================================================

describe("buildOrthoViews --verbose", () => {
  it("色が2種類あるとき legend が返される", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    expect(result!.legend).toBeDefined();
    expect(result!.legend).toContain("Legend:");
    expect(result!.legend).toContain("#FF0000");
    expect(result!.legend).toContain("#0000FF");
  });

  it("色が1種類のときは legend がなく ■ グリッドにフォールバック", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    expect(result!.legend).toBeUndefined();
    expect(result!.topGrid[0]).toEqual(["■", "■"]);
  });

  it("色が2種類あるとき TOP グリッドに記号が使われる（■ ではない）", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    // topGrid: z=0 の行 → x=0 が 'a'、x=1 が 'b'（または vice versa、登録順）
    expect(result!.topGrid[0]).not.toContain("■");
    expect(result!.topGrid[0]!.some((c) => typeof c === "string" && /[a-z]/.test(c))).toBe(true);
  });

  it("verbose なしのとき legend は undefined", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, false);
    expect(result).not.toBeNull();
    expect(result!.legend).toBeUndefined();
    // 通常の ■ グリッドが返る
    expect(result!.topGrid[0]).toEqual(["■", "■"]);
  });

  it("structure の色が先に記号を取得し scaffold が後に続く (--scaffold --verbose)", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#AAAAAA" }],
      scaffold: [{ x: 1, y: 0, z: 0, color: "#FF8C00" }],
    });
    const result = buildOrthoViews(bp, true, true);
    expect(result).not.toBeNull();
    expect(result!.legend).toBeDefined();
    // structure の色が 'a'、scaffold の色が 'b'
    expect(result!.legend).toContain("a = #AAAAAA");
    expect(result!.legend).toContain("b = #FF8C00");
    expect(result!.legend).toContain("(structure)");
    expect(result!.legend).toContain("(scaffold)");
  });

  it("palette 名と説明があると legend に出る", () => {
    const bp = makeBlueprint({
      palette: [
        { name: "main-wall", color: "#FF0000", description: "主壁" },
        { name: "roof-blue", color: "#0000FF", description: "屋根" },
      ],
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    expect(result!.legend).toContain("main-wall");
    expect(result!.legend).toContain("主壁");
    expect(result!.legend).toContain("roof-blue");
  });

  it("TOP ビューで代表色は最も Y が大きいブロックの色", () => {
    // (0,0,0) に #FF0000、(0,1,0) に #0000FF — 同じ (x=0,z=0) セルで Y が大きい #0000FF が代表
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 0, y: 1, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    // colorInfo: #FF0000 → 'a'、#0000FF → 'b'
    // TOP (x=0,z=0) の代表は Y=1 の #0000FF → 'b'
    expect(result!.topGrid[0]![0]).toBe("b");
  });

  it("FRONT ビューで代表色は最も Z が小さいブロックの色", () => {
    // (0,0,0) に #FF0000、(0,0,1) に #0000FF — 同じ (x=0,y=0) セルで Z が小さい #FF0000 が代表
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 0, y: 0, z: 1, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    // colorInfo: #FF0000 → 'a'、#0000FF → 'b'
    // FRONT (x=0,y=0) の代表は Z=0 の #FF0000 → 'a'
    expect(result!.frontGrid[0]![0]).toBe("a");
  });

  it("SIDE ビューで代表色は最も X が小さいブロックの色", () => {
    // (0,0,0) に #FF0000、(1,0,0) に #0000FF — 同じ (z=0,y=0) セルで X が小さい #FF0000 が代表
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const result = buildOrthoViews(bp, false, true);
    expect(result).not.toBeNull();
    // colorInfo: #FF0000 → 'a'、#0000FF → 'b'
    // SIDE (z=0,y=0) の代表は X=0 の #FF0000 → 'a'
    expect(result!.sideGrid[0]![0]).toBe("a");
  });
});

describe("buildOrthoViews --mode coord", () => {
  it("TOP では可視面の y 座標を返す", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 1, z: 0, color: "#FF0000" },
        { x: 0, y: 4, z: 0, color: "#00FF00" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "coord");
    expect(result).not.toBeNull();
    expect(result!.topGrid).toEqual([[4]]);
  });

  it("FRONT では手前に見える z 座標を返す", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 5, color: "#FF0000" },
        { x: 0, y: 0, z: 2, color: "#00FF00" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "coord");
    expect(result).not.toBeNull();
    expect(result!.frontGrid[0]).toEqual([2]);
  });

  it("SIDE では手前に見える x 座標を返す", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 3, y: 0, z: 0, color: "#FF0000" },
        { x: -1, y: 0, z: 0, color: "#00FF00" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "coord");
    expect(result).not.toBeNull();
    expect(result!.sideGrid[0]).toEqual([-1]);
  });

  it("ブロックのない列は null になる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 2, z: 0, color: "#FF0000" },
        { x: 2, y: 4, z: 0, color: "#FF0000" },
      ],
    });
    const result = buildOrthoViews(bp, false, false, "coord");
    expect(result).not.toBeNull();
    expect(result!.topGrid[0]).toEqual([2, null, 4]);
  });
});

// ============================================================
// renderOrtho
// ============================================================

describe("renderOrtho", () => {
  it("空の設計図では '(empty)' を返す", () => {
    const bp = makeBlueprint();
    expect(renderOrtho(bp, false)).toBe("(empty)");
  });

  it("出力に TOP / FRONT / SIDE のヘッダーが含まれる", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const output = renderOrtho(bp, false);
    expect(output).toContain("TOP");
    expect(output).toContain("FRONT");
    expect(output).toContain("SIDE");
  });

  it("■ が出力に含まれる", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const output = renderOrtho(bp, false);
    expect(output).toContain("■");
  });

  it("scaffold なしのとき ░ は含まれない", () => {
    const bp = makeBlueprint({
      scaffold: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    });
    const output = renderOrtho(bp, false);
    expect(output).not.toContain("░");
  });

  it("scaffold ありのとき ░ が含まれる", () => {
    const bp = makeBlueprint({
      scaffold: [{ x: 0, y: 0, z: 0, color: "#888888" }],
    });
    const output = renderOrtho(bp, true);
    expect(output).toContain("░");
  });

  it("3つのビューが同じ行数で横並びになる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 1, z: 1, color: "#FF0000" },
      ],
    });
    const output = renderOrtho(bp, false);
    // 各行はすべて空でないこと（ヘッダー含め複数行あること）
    const lines = output.split("\n");
    expect(lines.length).toBeGreaterThan(2);
    // 各行に3つのビューが含まれているはず（ヘッダー行を確認）
    const headerLine = lines[0]!;
    expect(headerLine).toContain("TOP");
    expect(headerLine).toContain("FRONT");
    expect(headerLine).toContain("SIDE");
  });

  it("--verbose で色が2種類あるとき ■ ではなく記号が使われる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const output = renderOrtho(bp, false, true);
    expect(output).not.toContain("■");
    expect(/[a-z]/.test(output)).toBe(true);
  });

  it("--verbose で色コードがレジェンドに含まれる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#0000FF" },
      ],
    });
    const output = renderOrtho(bp, false, true);
    expect(output).toContain("Legend:");
    expect(output).toContain("#FF0000");
    expect(output).toContain("#0000FF");
  });

  it("--verbose で色が1種類のみのとき ■ 表示のまま（フォールバック）", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 0, color: "#FF0000" },
      ],
    });
    const output = renderOrtho(bp, false, true);
    expect(output).toContain("■");
    expect(output).not.toContain("Legend:");
  });

  it("--scaffold --verbose で scaffold の色もレジェンドに区別される", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#888888" }],
      scaffold: [{ x: 1, y: 0, z: 0, color: "#FF8C00" }],
    });
    const output = renderOrtho(bp, true, true);
    expect(output).toContain("Legend:");
    expect(output).toContain("(structure)");
    expect(output).toContain("(scaffold)");
    expect(output).toContain("#888888");
    expect(output).toContain("#FF8C00");
  });

  it("--mode coord では数値が出力される", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 4, z: 0, color: "#FF0000" }],
    });
    const output = renderOrtho(bp, false, false, "coord");
    expect(output).toContain("4");
    expect(output).toContain("visible Y");
  });

  it("--mode coord --style braille では点字ヒートマップになる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 1, z: 0, color: "#FF0000" },
        { x: 1, y: 4, z: 0, color: "#FF0000" },
      ],
    });
    const output = renderOrtho(bp, false, false, "coord", "top", "braille");
    expect(output).toContain("braille");
    expect(output).toContain("Braille scale:");
    expect(/[⠁⠃⠇⠧⠷⠿⣷⣿]/u.test(output)).toBe(true);
    expect(output).not.toContain(" 4");
  });

  it("braille の FRONT は手前ほど濃くなる", () => {
    const bp = makeBlueprint({
      structure: [
        { x: 0, y: 0, z: 0, color: "#FF0000" },
        { x: 1, y: 0, z: 4, color: "#FF0000" },
      ],
    });
    const output = renderOrtho(bp, false, false, "coord", "front", "braille");
    expect(output).toContain("⣿");
    expect(output).toContain("⠁");
  });

  it("--view top では TOP のみ出力する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const output = renderOrtho(bp, false, false, "solid", "top");
    expect(output).toContain("TOP");
    expect(output).not.toContain("FRONT");
    expect(output).not.toContain("SIDE");
  });

  it("--view front では FRONT のみ出力する", () => {
    const bp = makeBlueprint({
      structure: [{ x: 0, y: 0, z: 0, color: "#FF0000" }],
    });
    const output = renderOrtho(bp, false, false, "coord", "front");
    expect(output).toContain("FRONT");
    expect(output).not.toContain("TOP");
    expect(output).not.toContain("SIDE");
  });
});
