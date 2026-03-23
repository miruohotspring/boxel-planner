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
    .requiredOption("--x <n>", "X座標", Number)
    .requiredOption("--y <n>", "Y座標", Number)
    .requiredOption("--z <n>", "Z座標", Number)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          x: number;
          y: number;
          z: number;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

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
        const target = { x: opts.x, y: opts.y, z: opts.z };
        const key = positionKey(target);
        const original = blueprint[layer];
        const filtered = original.filter((b) => positionKey(b) !== key);

        if (filtered.length === original.length) {
          printError(
            `Block not found at (${opts.x}, ${opts.y}, ${opts.z}) in layer "${layer}".`,
            outputOpts
          );
        }

        const updatedLayer = layer === "structure"
          ? { structure: filtered, scaffold: blueprint.scaffold }
          : { structure: blueprint.structure, scaffold: filtered };

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
          { removed: target, layer },
          outputOpts,
          () => `Removed block at (${opts.x}, ${opts.y}, ${opts.z}) from ${layer}.`
        );
      }
    );
}
