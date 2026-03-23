import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";
import {
  collectMirroredPlacements,
  isBlockInRange,
  normalizeRange,
  type MirrorAxis,
} from "../lib/blueprint.js";

export function registerMirror(program: Command): void {
  program
    .command("mirror <file>")
    .description("指定範囲のブロックを鏡映コピーする")
    .requiredOption("--x1 <n>", "開始X座標", Number)
    .requiredOption("--y1 <n>", "開始Y座標", Number)
    .requiredOption("--z1 <n>", "開始Z座標", Number)
    .requiredOption("--x2 <n>", "終了X座標", Number)
    .requiredOption("--y2 <n>", "終了Y座標", Number)
    .requiredOption("--z2 <n>", "終了Z座標", Number)
    .requiredOption("--axis <axis>", "鏡映軸 (x / y / z)")
    .requiredOption("--origin <n>", "鏡面位置（整数または .5）", Number)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          x1: number;
          y1: number;
          z1: number;
          x2: number;
          y2: number;
          z2: number;
          axis: string;
          origin: number;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (opts.axis !== "x" && opts.axis !== "y" && opts.axis !== "z") {
          printError(`Invalid axis: "${opts.axis}". Must be "x", "y", or "z".`, outputOpts);
        }

        if (opts.layer !== "structure" && opts.layer !== "scaffold") {
          printError(`Invalid layer: "${opts.layer}". Must be "structure" or "scaffold".`, outputOpts);
        }

        if (!Number.isInteger(opts.origin * 2)) {
          printError(`origin must be an integer or .5. Got: ${opts.origin}`, outputOpts);
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as "structure" | "scaffold";
        const axis = opts.axis as MirrorAxis;
        const range = normalizeRange(opts);
        const selected = blueprint[layer].filter((block) => isBlockInRange(block, range));

        if (selected.length === 0) {
          printError("No blocks found in the specified range.", outputOpts);
        }

        const existingBlocks = [...blueprint[layer]];
        const prevKeys = new Set(existingBlocks.map((b) => positionKey(b)));
        const posMap = new Map<string, Block>();
        for (const b of existingBlocks) {
          posMap.set(positionKey(b), b);
        }

        try {
          const placements = collectMirroredPlacements(selected, axis, opts.origin);

          let added = 0;
          let updated = 0;
          for (const [key, block] of placements) {
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
              selected: selected.length,
              mirrored: placements.size,
              added,
              updated,
              axis,
              origin: opts.origin,
              range,
            },
            outputOpts,
            () =>
              `Mirrored ${selected.length} block(s) in ${layer} across ${axis}=${opts.origin}: ${added} new, ${updated} updated.`
          );
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }
      }
    );
}
