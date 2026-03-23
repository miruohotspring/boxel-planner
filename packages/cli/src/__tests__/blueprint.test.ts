import { describe, expect, it } from "vitest";
import type { Block } from "@boxel-planner/schema";
import {
  collectMirroredPlacements,
  collectTranslatedPlacements,
  isBlockInRange,
  mirrorBlockForPlacement,
  mirrorBlock,
  normalizeRange,
  placeBlueprintIntoTarget,
  rotateBlockY,
  summarizeBounds,
  transformBlockForPlacement,
  translateBlueprint,
} from "../lib/blueprint.js";

describe("lib/blueprint", () => {
  it("normalizeRange: 座標順が逆でも min/max に正規化される", () => {
    expect(
      normalizeRange({ x1: 5, y1: 8, z1: 3, x2: 1, y2: 2, z2: 7 })
    ).toEqual({
      min: { x: 1, y: 2, z: 3 },
      max: { x: 5, y: 8, z: 7 },
    });
  });

  it("isBlockInRange: 範囲内判定ができる", () => {
    const range = normalizeRange({ x1: 0, y1: 0, z1: 0, x2: 4, y2: 4, z2: 4 });
    expect(isBlockInRange({ x: 2, y: 2, z: 2 }, range)).toBe(true);
    expect(isBlockInRange({ x: 5, y: 2, z: 2 }, range)).toBe(false);
  });

  it("collectTranslatedPlacements: repeat 回数分のコピー先を作る", () => {
    const source: Block[] = [
      { x: 1, y: 2, z: 3, color: "#AAAAAA" },
    ];

    const placements = collectTranslatedPlacements(source, { dx: 2, dy: 0, dz: -1 }, 3);

    expect(Array.from(placements.values())).toEqual([
      { x: 3, y: 2, z: 2, color: "#AAAAAA" },
      { x: 5, y: 2, z: 1, color: "#AAAAAA" },
      { x: 7, y: 2, z: 0, color: "#AAAAAA" },
    ]);
  });

  it("mirrorBlock: .5 origin でも整数座標に鏡映できる", () => {
    expect(
      mirrorBlock({ x: 2, y: 3, z: 4, color: "#FFFFFF" }, "x", 4.5)
    ).toEqual({ x: 7, y: 3, z: 4, color: "#FFFFFF" });
  });

  it("collectMirroredPlacements: 鏡映先をまとめて生成できる", () => {
    const source: Block[] = [
      { x: 2, y: 0, z: 1, color: "#111111" },
      { x: 3, y: 0, z: 1, color: "#222222" },
    ];

    const placements = collectMirroredPlacements(source, "x", 5);

    expect(Array.from(placements.values())).toEqual([
      { x: 8, y: 0, z: 1, color: "#111111" },
      { x: 7, y: 0, z: 1, color: "#222222" },
    ]);
  });

  it("summarizeBounds: ブロック配列から size を計算できる", () => {
    const blocks: Block[] = [
      { x: 2, y: 1, z: 4, color: "#000000" },
      { x: 6, y: 3, z: 8, color: "#000000" },
    ];

    expect(summarizeBounds(blocks)).toEqual({
      min: { x: 2, y: 1, z: 4 },
      max: { x: 6, y: 3, z: 8 },
      size: { x: 5, y: 3, z: 5 },
    });
  });

  it("mirrorBlockForPlacement: local x 反転ができる", () => {
    expect(
      mirrorBlockForPlacement({ x: 2, y: 4, z: -3, color: "#123456" }, "x")
    ).toEqual({ x: -2, y: 4, z: -3, color: "#123456" });
  });

  it("rotateBlockY: 90 度回転で (x,z) -> (-z,x)", () => {
    expect(
      rotateBlockY({ x: 2, y: 4, z: 3, color: "#123456" }, 90)
    ).toEqual({ x: -3, y: 4, z: 2, color: "#123456" });
  });

  it("transformBlockForPlacement: mirror -> rotate -> translate の順で適用する", () => {
    expect(
      transformBlockForPlacement(
        { x: 2, y: 1, z: 3, color: "#ABCDEF" },
        {
          mirror: "x",
          rotateY: 270,
          offset: { x: 10, y: 20, z: 30 },
        }
      )
    ).toEqual({ x: 13, y: 21, z: 32, color: "#ABCDEF" });
  });

  it("translateBlueprint: include=all で両レイヤーを平行移動する", () => {
    const translated = translateBlueprint(
      {
        version: "1.0",
        name: "part",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        structure: [{ x: 0, y: 1, z: 2, color: "#AAAAAA" }],
        scaffold: [{ x: 1, y: 2, z: 3, color: "#FF8C00" }],
      },
      { x: 10, y: 20, z: 30 },
      "all"
    );

    expect(translated).toEqual({
      structure: [{ x: 10, y: 21, z: 32, color: "#AAAAAA" }],
      scaffold: [{ x: 11, y: 22, z: 33, color: "#FF8C00" }],
    });
  });

  it("translateBlueprint: rotateY と mirror を適用して配置できる", () => {
    const translated = translateBlueprint(
      {
        version: "1.0",
        name: "part",
        bounds: { min: { x: -1, y: 0, z: 0 }, max: { x: 1, y: 0, z: 2 } },
        structure: [{ x: 1, y: 0, z: 2, color: "#AAAAAA" }],
        scaffold: [],
      },
      { x: 10, y: 0, z: 30 },
      "structure",
      { mirror: "z", rotateY: 90 }
    );

    expect(translated).toEqual({
      structure: [{ x: 12, y: 0, z: 31, color: "#AAAAAA" }],
      scaffold: [],
    });
  });

  it("placeBlueprintIntoTarget: collision=ours では target を優先する", () => {
    const result = placeBlueprintIntoTarget(
      {
        version: "1.0",
        name: "target",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        structure: [{ x: 5, y: 0, z: 0, color: "#111111" }],
        scaffold: [],
      },
      {
        version: "1.0",
        name: "source",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 0, z: 0 } },
        structure: [
          { x: 0, y: 0, z: 0, color: "#AAAAAA" },
          { x: 1, y: 0, z: 0, color: "#BBBBBB" },
        ],
        scaffold: [],
      },
      {
        at: { x: 5, y: 0, z: 0 },
        include: "structure",
        collision: "ours",
      }
    );

    expect(result.blueprint.structure).toEqual([
      { x: 5, y: 0, z: 0, color: "#111111" },
      { x: 6, y: 0, z: 0, color: "#BBBBBB" },
    ]);
    expect(result.stats).toEqual({
      placedStructure: 1,
      placedScaffold: 0,
      collisions: 1,
      skipped: 1,
    });
  });

  it("placeBlueprintIntoTarget: collision=theirs では source が上書きする", () => {
    const result = placeBlueprintIntoTarget(
      {
        version: "1.0",
        name: "target",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 0, z: 0 } },
        structure: [],
        scaffold: [{ x: 5, y: 0, z: 0, color: "#FF8C00" }],
      },
      {
        version: "1.0",
        name: "source",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        structure: [{ x: 0, y: 0, z: 0, color: "#ABCDEF" }],
        scaffold: [],
      },
      {
        at: { x: 5, y: 0, z: 0 },
        include: "structure",
        collision: "theirs",
      }
    );

    expect(result.blueprint.structure).toEqual([
      { x: 5, y: 0, z: 0, color: "#ABCDEF" },
    ]);
    expect(result.blueprint.scaffold).toEqual([]);
    expect(result.stats).toEqual({
      placedStructure: 1,
      placedScaffold: 0,
      collisions: 1,
      skipped: 0,
    });
  });

  it("placeBlueprintIntoTarget: collision=error では衝突時に例外", () => {
    expect(() =>
      placeBlueprintIntoTarget(
        {
          version: "1.0",
          name: "target",
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
          structure: [{ x: 1, y: 2, z: 3, color: "#111111" }],
          scaffold: [],
        },
        {
          version: "1.0",
          name: "source",
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
          structure: [{ x: 0, y: 0, z: 0, color: "#222222" }],
          scaffold: [],
        },
        {
          at: { x: 1, y: 2, z: 3 },
          include: "structure",
          collision: "error",
        }
      )
    ).toThrow(/Placement collision/);
  });

  it("placeBlueprintIntoTarget: rotateY で向きを変えて配置できる", () => {
    const result = placeBlueprintIntoTarget(
      {
        version: "1.0",
        name: "target",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } },
        structure: [],
        scaffold: [],
      },
      {
        version: "1.0",
        name: "source",
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 0, z: 1 } },
        structure: [
          { x: 2, y: 0, z: 0, color: "#AAAAAA" },
          { x: 2, y: 0, z: 1, color: "#BBBBBB" },
        ],
        scaffold: [],
      },
      {
        at: { x: 10, y: 0, z: 10 },
        include: "structure",
        collision: "error",
        rotateY: 90,
      }
    );

    expect(result.blueprint.structure).toEqual([
      { x: 10, y: 0, z: 12, color: "#AAAAAA" },
      { x: 9, y: 0, z: 12, color: "#BBBBBB" },
    ]);
  });
});
