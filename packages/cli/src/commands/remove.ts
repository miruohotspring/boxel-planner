import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerRemove(program: Command): void {
  program
    .command("remove <file>")
    .description("ブロックを削除する")
    .option("--x <n>", "X座標（単一座標指定）", Number)
    .option("--y <n>", "Y座標（単一座標指定）", Number)
    .option("--z <n>", "Z座標（単一座標指定）", Number)
    .option("--x1 <n>", "開始X座標（範囲指定）", Number)
    .option("--y1 <n>", "開始Y座標（範囲指定）", Number)
    .option("--z1 <n>", "開始Z座標（範囲指定）", Number)
    .option("--x2 <n>", "終了X座標（範囲指定）", Number)
    .option("--y2 <n>", "終了Y座標（範囲指定）", Number)
    .option("--z2 <n>", "終了Z座標（範囲指定）", Number)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold または all)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          x?: number;
          y?: number;
          z?: number;
          x1?: number;
          y1?: number;
          z1?: number;
          x2?: number;
          y2?: number;
          z2?: number;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (opts.layer !== "structure" && opts.layer !== "scaffold" && opts.layer !== "all") {
          printError(`Invalid layer: "${opts.layer}". Must be "structure", "scaffold", or "all".`, outputOpts);
        }

        // 単一座標指定の判定
        const hasSingle =
          opts.x !== undefined || opts.y !== undefined || opts.z !== undefined;
        // 範囲指定の判定
        const hasRange =
          opts.x1 !== undefined || opts.y1 !== undefined || opts.z1 !== undefined ||
          opts.x2 !== undefined || opts.y2 !== undefined || opts.z2 !== undefined;

        if (hasSingle && hasRange) {
          printError(
            "Cannot use both single-coordinate (--x/--y/--z) and range (--x1/--y1/--z1/--x2/--y2/--z2) options at the same time.",
            outputOpts
          );
        }

        if (!hasSingle && !hasRange) {
          printError(
            "Must specify either single-coordinate (--x --y --z) or range (--x1 --y1 --z1 --x2 --y2 --z2) options.",
            outputOpts
          );
        }

        if (hasSingle) {
          if (opts.x === undefined || opts.y === undefined || opts.z === undefined) {
            printError("Single-coordinate removal requires --x, --y, and --z.", outputOpts);
          }
        }

        if (hasRange) {
          if (
            opts.x1 === undefined || opts.y1 === undefined || opts.z1 === undefined ||
            opts.x2 === undefined || opts.y2 === undefined || opts.z2 === undefined
          ) {
            printError("Range removal requires all of --x1, --y1, --z1, --x2, --y2, --z2.", outputOpts);
          }
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        if (hasSingle) {
          // 単一座標削除（既存の動作を維持）
          const x = opts.x as number;
          const y = opts.y as number;
          const z = opts.z as number;
          const layer = opts.layer as "structure" | "scaffold";
          const target = { x, y, z };
          const key = positionKey(target);
          const original = blueprint[layer];
          const filtered = original.filter((b) => positionKey(b) !== key);

          if (filtered.length === original.length) {
            printError(
              `Block not found at (${x}, ${y}, ${z}) in layer "${layer}".`,
              outputOpts
            );
          }

          const updatedLayer = layer === "structure"
            ? { structure: filtered, scaffold: blueprint.scaffold }
            : { structure: blueprint.structure, scaffold: filtered };

          const newBounds = computeBounds([
            ...updatedLayer.structure,
            ...updatedLayer.scaffold,
          ]) ?? blueprint.bounds;

          const updated: Blueprint = {
            ...blueprint,
            ...updatedLayer,
            bounds: newBounds,
          };

          try {
            writeBlueprint(file, updated);
          } catch (e) {
            printError(e instanceof Error ? e.message : String(e), outputOpts);
          }

          printData(
            { removed: target, layer, count: 1 },
            outputOpts,
            () => `Removed 1 block(s) from ${layer}.`
          );
        } else {
          // 範囲削除
          const x1 = opts.x1 as number;
          const y1 = opts.y1 as number;
          const z1 = opts.z1 as number;
          const x2 = opts.x2 as number;
          const y2 = opts.y2 as number;
          const z2 = opts.z2 as number;

          const minX = Math.min(x1, x2);
          const maxX = Math.max(x1, x2);
          const minY = Math.min(y1, y2);
          const maxY = Math.max(y1, y2);
          const minZ = Math.min(z1, z2);
          const maxZ = Math.max(z1, z2);

          const inRange = (bx: number, by: number, bz: number): boolean =>
            bx >= minX && bx <= maxX &&
            by >= minY && by <= maxY &&
            bz >= minZ && bz <= maxZ;

          const layer = opts.layer as "structure" | "scaffold" | "all";

          let removedCount = 0;
          let newStructure = blueprint.structure;
          let newScaffold = blueprint.scaffold;

          if (layer === "structure" || layer === "all") {
            const before = newStructure.length;
            newStructure = newStructure.filter((b) => !inRange(b.x, b.y, b.z));
            removedCount += before - newStructure.length;
          }

          if (layer === "scaffold" || layer === "all") {
            const before = newScaffold.length;
            newScaffold = newScaffold.filter((b) => !inRange(b.x, b.y, b.z));
            removedCount += before - newScaffold.length;
          }

          const newBounds = computeBounds([
            ...newStructure,
            ...newScaffold,
          ]) ?? blueprint.bounds;

          const updated: Blueprint = {
            ...blueprint,
            structure: newStructure,
            scaffold: newScaffold,
            bounds: newBounds,
          };

          try {
            writeBlueprint(file, updated);
          } catch (e) {
            printError(e instanceof Error ? e.message : String(e), outputOpts);
          }

          const layerLabel = layer === "all" ? "structure + scaffold" : layer;
          printData(
            {
              range: { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } },
              layer,
              count: removedCount,
            },
            outputOpts,
            () => `Removed ${removedCount} block(s) from ${layerLabel}.`
          );
        }
      }
    );
}
