import { type Command } from "commander";
import {
  computeBounds,
  buildPositionMap,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerAdd(program: Command): void {
  program
    .command("add <file>")
    .description("ブロックを追加する")
    .requiredOption("--x <n>", "X座標", Number)
    .requiredOption("--y <n>", "Y座標", Number)
    .requiredOption("--z <n>", "Z座標", Number)
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          x: number;
          y: number;
          z: number;
          color: string;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (!Number.isInteger(opts.x) || !Number.isInteger(opts.y) || !Number.isInteger(opts.z)) {
          printError("x, y, z must be integers", outputOpts);
        }

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

        const layer = opts.layer as "structure" | "scaffold";
        const blocks = [...blueprint[layer]];
        const posMap = buildPositionMap(blocks);
        const block: Block = { x: opts.x, y: opts.y, z: opts.z, color: opts.color };
        const key = positionKey(block);

        // 既存ブロックを上書き
        const existingIdx = blocks.findIndex((b) => positionKey(b) === key);
        if (existingIdx >= 0) {
          blocks[existingIdx] = block;
        } else {
          blocks.push(block);
        }

        const allBlocks = [...blueprint.structure, ...blueprint.scaffold];
        // bounds は structure + scaffold の全ブロックを元に再計算
        const updatedLayer = layer === "structure"
          ? { structure: blocks, scaffold: blueprint.scaffold }
          : { structure: blueprint.structure, scaffold: blocks };

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
          { block, layer },
          outputOpts,
          () =>
            `Added block at (${block.x}, ${block.y}, ${block.z}) color=${block.color} to ${layer}.`
        );
      }
    );
}
