import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

const DEFAULT_SCAFFOLD_COLOR = "#FF8C00";

/**
 * structure の bounds を margin 分広げた外周フレーム + 縦柱を生成する。
 *
 * アルゴリズム:
 *   1. structure の bounds を求める
 *   2. bounds を margin 分広げた新 bounds (outer) を作る
 *   3. outer の XZ 外周ループ(辺)を全 Y 層に対して追加する
 *   4. outer の 4 コーナー柱を minY〜maxY まで追加する
 */
export function generateScaffoldBlocks(
  blueprint: Blueprint,
  margin: number
): Block[] {
  const bounds = computeBounds(blueprint.structure);
  if (!bounds) return [];

  const { min, max } = bounds;
  const ox1 = min.x - margin;
  const ox2 = max.x + margin;
  const oy1 = min.y - margin;
  const oy2 = max.y + margin;
  const oz1 = min.z - margin;
  const oz2 = max.z + margin;

  const posMap = new Map<string, Block>();

  const add = (x: number, y: number, z: number) => {
    const block: Block = { x, y, z, color: DEFAULT_SCAFFOLD_COLOR };
    posMap.set(positionKey(block), block);
  };

  // 外周フレーム: 各 Y 層の XZ 外周
  for (let y = oy1; y <= oy2; y++) {
    for (let x = ox1; x <= ox2; x++) {
      add(x, y, oz1);
      add(x, y, oz2);
    }
    for (let z = oz1 + 1; z <= oz2 - 1; z++) {
      add(ox1, y, z);
      add(ox2, y, z);
    }
  }

  // 4 コーナー縦柱 (oy1 〜 oy2 は既に上で追加済みだが冪等)
  for (let y = oy1; y <= oy2; y++) {
    add(ox1, y, oz1);
    add(ox1, y, oz2);
    add(ox2, y, oz1);
    add(ox2, y, oz2);
  }

  return Array.from(posMap.values());
}

export function registerScaffold(program: Command): void {
  const scaffold = program
    .command("scaffold")
    .description("足場の操作");

  scaffold
    .command("generate <file>")
    .description("足場を自動生成する（外周フレーム + 縦柱）")
    .option("--margin <n>", "structure bounds からの余白", (v) => parseInt(v, 10), 1)
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { margin: number; json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      if (!Number.isInteger(opts.margin) || opts.margin < 0) {
        printError("--margin must be a non-negative integer", outputOpts);
      }

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      if (blueprint.structure.length === 0) {
        printError("Cannot generate scaffold: structure is empty.", outputOpts);
      }

      const newScaffold = generateScaffoldBlocks(blueprint, opts.margin);

      const allUpdated = [...blueprint.structure, ...newScaffold];
      const newBounds = computeBounds(allUpdated) ?? blueprint.bounds;

      const updated: Blueprint = {
        ...blueprint,
        scaffold: newScaffold,
        bounds: newBounds,
      };

      try {
        writeBlueprint(file, updated);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      printData(
        { scaffoldBlocks: newScaffold.length, margin: opts.margin },
        outputOpts,
        () => `Generated ${newScaffold.length} scaffold block(s) with margin=${opts.margin}.`
      );
    });

  scaffold
    .command("clear <file>")
    .description("足場をすべて削除する")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const removed = blueprint.scaffold.length;

      const allUpdated = blueprint.structure;
      const newBounds = computeBounds(allUpdated) ?? blueprint.bounds;

      const updated: Blueprint = {
        ...blueprint,
        scaffold: [],
        bounds: newBounds,
      };

      try {
        writeBlueprint(file, updated);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      printData(
        { removed },
        outputOpts,
        () => `Cleared ${removed} scaffold block(s).`
      );
    });
}
