import { type Command } from "commander";
import {
  buildPositionMap,
  positionKey,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerGet(program: Command): void {
  program
    .command("get <file>")
    .description("指定座標のブロック情報を表示する")
    .requiredOption("--x <n>", "X座標", Number)
    .requiredOption("--y <n>", "Y座標", Number)
    .requiredOption("--z <n>", "Z座標", Number)
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: { x: number; y: number; z: number; json?: boolean }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const pos = { x: opts.x, y: opts.y, z: opts.z };
        const key = positionKey(pos);
        const structureMap = buildPositionMap(blueprint.structure);
        const scaffoldMap = buildPositionMap(blueprint.scaffold);

        const structureBlock = structureMap.get(key);
        const scaffoldBlock = scaffoldMap.get(key);

        if (!structureBlock && !scaffoldBlock) {
          printError(
            `No block at (${opts.x}, ${opts.y}, ${opts.z}).`,
            outputOpts
          );
        }

        const result: {
          structure?: { x: number; y: number; z: number; color: string };
          scaffold?: { x: number; y: number; z: number; color: string };
        } = {};
        if (structureBlock) result.structure = structureBlock;
        if (scaffoldBlock) result.scaffold = scaffoldBlock;

        printData(result, outputOpts, () => {
          const lines: string[] = [];
          if (structureBlock) {
            lines.push(`structure: color=${structureBlock.color}`);
          }
          if (scaffoldBlock) {
            lines.push(`scaffold:  color=${scaffoldBlock.color}`);
          }
          return lines.join("\n");
        });
      }
    );
}
