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
  collectTranslatedPlacements,
  isBlockInRange,
  normalizeRange,
} from "../lib/blueprint.js";

export function registerCopy(program: Command): void {
  program
    .command("copy <file>")
    .description("指定範囲のブロックを平行移動コピーする")
    .requiredOption("--x1 <n>", "開始X座標", Number)
    .requiredOption("--y1 <n>", "開始Y座標", Number)
    .requiredOption("--z1 <n>", "開始Z座標", Number)
    .requiredOption("--x2 <n>", "終了X座標", Number)
    .requiredOption("--y2 <n>", "終了Y座標", Number)
    .requiredOption("--z2 <n>", "終了Z座標", Number)
    .requiredOption("--dx <n>", "X方向の移動量", Number)
    .requiredOption("--dy <n>", "Y方向の移動量", Number)
    .requiredOption("--dz <n>", "Z方向の移動量", Number)
    .option("--repeat <n>", "同じ移動量で何回繰り返すか", Number, 1)
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
          dx: number;
          dy: number;
          dz: number;
          repeat: number;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (opts.layer !== "structure" && opts.layer !== "scaffold") {
          printError(`Invalid layer: "${opts.layer}". Must be "structure" or "scaffold".`, outputOpts);
        }

        if (!Number.isInteger(opts.repeat) || opts.repeat < 1) {
          printError(`repeat must be an integer >= 1. Got: ${opts.repeat}`, outputOpts);
        }

        if (opts.dx === 0 && opts.dy === 0 && opts.dz === 0) {
          printError("At least one of --dx, --dy, --dz must be non-zero.", outputOpts);
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as "structure" | "scaffold";
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

        const placements = collectTranslatedPlacements(
          selected,
          { dx: opts.dx, dy: opts.dy, dz: opts.dz },
          opts.repeat
        );

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
            copies: placements.size,
            added,
            updated,
            repeat: opts.repeat,
            delta: { x: opts.dx, y: opts.dy, z: opts.dz },
            range,
          },
          outputOpts,
          () =>
            `Copied ${selected.length} block(s) in ${layer} by (${opts.dx}, ${opts.dy}, ${opts.dz}) x${opts.repeat}: ${added} new, ${updated} updated.`
        );
      }
    );
}
