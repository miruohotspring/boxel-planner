import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";
import { generateRoofBlocks } from "../lib/primitives.js";

export function registerRoof(program: Command): void {
  program
    .command("roof <file>")
    .description("張り出しと段差を持つ矩形屋根を生成する")
    .requiredOption("--x1 <n>", "基準矩形の開始X座標", Number)
    .requiredOption("--z1 <n>", "基準矩形の開始Z座標", Number)
    .requiredOption("--x2 <n>", "基準矩形の終了X座標", Number)
    .requiredOption("--z2 <n>", "基準矩形の終了Z座標", Number)
    .requiredOption("--y <n>", "開始Y座標", Number)
    .requiredOption("--layers <n>", "屋根の段数", Number)
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--overhang-x <n>", "X方向の張り出し量", Number, 0)
    .option("--overhang-z <n>", "Z方向の張り出し量", Number, 0)
    .option("--shrink-x <n>", "各段での X方向縮小量", Number, 1)
    .option("--shrink-z <n>", "各段での Z方向縮小量", Number, 1)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          x1: number;
          z1: number;
          x2: number;
          z2: number;
          y: number;
          layers: number;
          color: string;
          overhangX: number;
          overhangZ: number;
          shrinkX: number;
          shrinkZ: number;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (!/^#[0-9A-Fa-f]{6}$/.test(opts.color)) {
          printError(`Invalid color: "${opts.color}". Must be #RRGGBB format.`, outputOpts);
        }

        if (opts.layer !== "structure" && opts.layer !== "scaffold") {
          printError(`Invalid layer: "${opts.layer}". Must be "structure" or "scaffold".`, outputOpts);
        }

        if (!Number.isInteger(opts.layers) || opts.layers < 1) {
          printError(`layers must be an integer >= 1. Got: ${opts.layers}`, outputOpts);
        }

        if (opts.overhangX < 0 || opts.overhangZ < 0 || opts.shrinkX < 0 || opts.shrinkZ < 0) {
          printError("overhang/shrink values must be >= 0.", outputOpts);
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as "structure" | "scaffold";
        const existingBlocks = [...blueprint[layer]];
        const prevKeys = new Set(existingBlocks.map((block) => positionKey(block)));
        const posMap = new Map<string, Block>();
        for (const block of existingBlocks) {
          posMap.set(positionKey(block), block);
        }

        const blocks = generateRoofBlocks({
          x1: opts.x1,
          z1: opts.z1,
          x2: opts.x2,
          z2: opts.z2,
          y: opts.y,
          layers: opts.layers,
          color: opts.color,
          overhangX: opts.overhangX,
          overhangZ: opts.overhangZ,
          shrinkX: opts.shrinkX,
          shrinkZ: opts.shrinkZ,
        });

        let added = 0;
        let updated = 0;
        for (const block of blocks) {
          const key = positionKey(block);
          if (!posMap.has(key)) added++;
          else updated++;
          posMap.set(key, block);
        }

        if (layer === "structure") warnNegativeCoords(posMap, prevKeys, layer);

        const newBlocks = Array.from(posMap.values());
        const updatedLayer = layer === "structure"
          ? { structure: newBlocks, scaffold: blueprint.scaffold }
          : { structure: blueprint.structure, scaffold: newBlocks };

        const allUpdated = [...updatedLayer.structure, ...updatedLayer.scaffold];
        const newBounds = computeBounds(allUpdated) ?? blueprint.bounds;

        const updatedBlueprint: Blueprint = {
          ...blueprint,
          ...updatedLayer,
          bounds: newBounds,
        };

        try {
          writeBlueprint(file, updatedBlueprint);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        printData(
          {
            layer,
            added,
            updated,
            y: opts.y,
            layers: opts.layers,
            overhang: { x: opts.overhangX, z: opts.overhangZ },
            shrink: { x: opts.shrinkX, z: opts.shrinkZ },
            base: {
              min: { x: Math.min(opts.x1, opts.x2), z: Math.min(opts.z1, opts.z2) },
              max: { x: Math.max(opts.x1, opts.x2), z: Math.max(opts.z1, opts.z2) },
            },
          },
          outputOpts,
          () =>
            `Added roof: ${added} new + ${updated} updated block(s), layers=${opts.layers}, base=(${opts.x1},${opts.z1})→(${opts.x2},${opts.z2}).`
        );
      }
    );
}
