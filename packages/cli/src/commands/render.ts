import { type Command } from "commander";
import {
  getSlice,
  buildPositionMap,
  positionKey,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

const BLOCK_CHAR = "■";
const EMPTY_CHAR = "·";

/**
 * Y 断面のテキストアートを生成する。
 * X 軸が横、Z 軸が縦のグリッドを描画する。
 */
export function renderSlice(
  blueprint: Blueprint,
  y: number
): { grid: string; structureCount: number; scaffoldCount: number } {
  const structureSlice = getSlice(blueprint.structure, y);
  const scaffoldSlice = getSlice(blueprint.scaffold, y);

  const allBlocks = [...blueprint.structure, ...blueprint.scaffold];
  if (allBlocks.length === 0) {
    return { grid: "(empty)", structureCount: 0, scaffoldCount: 0 };
  }

  // XZ の全範囲を計算（structure + scaffold の全ブロックを参照して範囲を決める）
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const b of allBlocks) {
    if (b.x < minX) minX = b.x;
    if (b.x > maxX) maxX = b.x;
    if (b.z < minZ) minZ = b.z;
    if (b.z > maxZ) maxZ = b.z;
  }

  const structureMap = buildPositionMap(structureSlice);
  const scaffoldMap = buildPositionMap(scaffoldSlice);

  const rows: string[] = [];
  // Z を行方向、X を列方向に描画
  for (let z = minZ; z <= maxZ; z++) {
    const row: string[] = [];
    for (let x = minX; x <= maxX; x++) {
      const key = positionKey({ x, y, z });
      if (structureMap.has(key) || scaffoldMap.has(key)) {
        row.push(BLOCK_CHAR);
      } else {
        row.push(EMPTY_CHAR);
      }
    }
    // Z ラベル
    rows.push(`${String(z).padStart(4)} ${row.join("")}`);
  }

  // X 軸ラベル
  const xRange = maxX - minX + 1;
  const xLabel = Array.from({ length: xRange }, (_, i) => {
    const v = minX + i;
    return v % 5 === 0 ? String(Math.abs(v) % 10) : " ";
  }).join("");
  rows.push(`     ${xLabel}`);

  return {
    grid: rows.join("\n"),
    structureCount: structureSlice.length,
    scaffoldCount: scaffoldSlice.length,
  };
}

export function registerRender(program: Command): void {
  program
    .command("render <file>")
    .description("Y断面をテキストアートで出力する（LLM確認用）")
    .requiredOption("--y <n>", "Y座標", Number)
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { y: number; json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const { grid, structureCount, scaffoldCount } = renderSlice(blueprint, opts.y);

      printData(
        { y: opts.y, structureCount, scaffoldCount, grid },
        outputOpts,
        () => {
          const lines = [
            `Y=${opts.y} (structure: ${structureCount}, scaffold: ${scaffoldCount})`,
            grid,
          ];
          return lines.join("\n");
        }
      );
    });
}
