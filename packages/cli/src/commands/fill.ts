import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerFill(program: Command): void {
  program
    .command("fill <file>")
    .description("指定範囲をブロックで埋める")
    .requiredOption("--x1 <n>", "開始X座標", Number)
    .requiredOption("--y1 <n>", "開始Y座標", Number)
    .requiredOption("--z1 <n>", "開始Z座標", Number)
    .requiredOption("--x2 <n>", "終了X座標", Number)
    .requiredOption("--y2 <n>", "終了Y座標", Number)
    .requiredOption("--z2 <n>", "終了Z座標", Number)
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--hollow", "外周のみ埋める（中空）")
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
          color: string;
          hollow?: boolean;
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

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const minX = Math.min(opts.x1, opts.x2);
        const maxX = Math.max(opts.x1, opts.x2);
        const minY = Math.min(opts.y1, opts.y2);
        const maxY = Math.max(opts.y1, opts.y2);
        const minZ = Math.min(opts.z1, opts.z2);
        const maxZ = Math.max(opts.z1, opts.z2);

        const layer = opts.layer as "structure" | "scaffold";
        const existingBlocks = [...blueprint[layer]];
        // 位置マップを構築（既存ブロックを上書き可能にする）
        const posMap = new Map<string, Block>();
        for (const b of existingBlocks) {
          posMap.set(positionKey(b), b);
        }

        let added = 0;
        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
              if (opts.hollow) {
                // 外周判定: 少なくとも1軸が境界上
                const onBorder =
                  x === minX || x === maxX ||
                  y === minY || y === maxY ||
                  z === minZ || z === maxZ;
                if (!onBorder) continue;
              }
              const block: Block = { x, y, z, color: opts.color };
              const key = positionKey(block);
              if (!posMap.has(key)) added++;
              posMap.set(key, block);
            }
          }
        }

        const newBlocks = Array.from(posMap.values());

        const updatedLayer = layer === "structure"
          ? { structure: newBlocks, scaffold: blueprint.scaffold }
          : { structure: blueprint.structure, scaffold: newBlocks };

        const allUpdated = [...updatedLayer.structure, ...updatedLayer.scaffold];
        const newBounds = computeBounds(allUpdated) ?? blueprint.bounds;

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
          {
            layer,
            range: { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } },
            hollow: opts.hollow ?? false,
            added,
          },
          outputOpts,
          () =>
            `Filled ${added} block(s) in ${layer} from (${minX},${minY},${minZ}) to (${maxX},${maxY},${maxZ})${opts.hollow ? " [hollow]" : ""}.`
        );
      }
    );
}
