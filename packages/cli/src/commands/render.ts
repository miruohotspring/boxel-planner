import { type Command } from "commander";
import {
  getSlice,
  buildPositionMap,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

const BLOCK_CHAR = "■";
const EMPTY_CHAR = "·";

// 記号割り当て用のアルファベット列
const SYMBOLS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Y 断面のテキストアートを生成する。
 * X 軸が横、Z 軸が縦のグリッドを描画する。
 */
export function renderSlice(
  blueprint: Blueprint,
  y: number,
  colorMode?: boolean
): { grid: string; structureCount: number; scaffoldCount: number; legend?: string } {
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

  if (colorMode) {
    // カラーモード: 各色に記号を割り当てる
    // 色→{symbol, isScaffold, count} のマップを構築
    const colorInfo = new Map<string, { symbol: string; isScaffold: boolean; count: number }>();
    let symbolIndex = 0;

    const registerColor = (block: Block, isScaffold: boolean) => {
      const color = block.color.toUpperCase();
      if (!colorInfo.has(color)) {
        const symbol = symbolIndex < SYMBOLS.length ? SYMBOLS[symbolIndex] : "?";
        symbolIndex++;
        colorInfo.set(color, { symbol, isScaffold, count: 0 });
      }
      const info = colorInfo.get(color)!;
      info.count++;
    };

    // scaffold を先に登録（記号の割り当て順）
    for (const b of scaffoldSlice) registerColor(b, true);
    for (const b of structureSlice) registerColor(b, false);

    // 色が1種類だけなら通常の ■/· 表示
    if (colorInfo.size <= 1) {
      return renderSlice(blueprint, y, false);
    }

    // グリッド生成
    const rows: string[] = [];
    for (let z = minZ; z <= maxZ; z++) {
      const row: string[] = [];
      for (let x = minX; x <= maxX; x++) {
        const key = positionKey({ x, y, z });
        const scaffoldBlock = scaffoldMap.get(key);
        const structureBlock = structureMap.get(key);
        if (scaffoldBlock) {
          const color = scaffoldBlock.color.toUpperCase();
          row.push(colorInfo.get(color)?.symbol ?? BLOCK_CHAR);
        } else if (structureBlock) {
          const color = structureBlock.color.toUpperCase();
          row.push(colorInfo.get(color)?.symbol ?? BLOCK_CHAR);
        } else {
          row.push(EMPTY_CHAR);
        }
      }
      rows.push(`${String(z).padStart(4)} ${row.join("")}`);
    }

    // X 軸ラベル
    const xRange = maxX - minX + 1;
    const xLabel = Array.from({ length: xRange }, (_, i) => {
      const v = minX + i;
      return v % 5 === 0 ? String(Math.abs(v) % 10) : " ";
    }).join("");
    rows.push(`     ${xLabel}`);

    // レジェンド生成
    const legendLines = ["Legend:"];
    for (const [color, info] of colorInfo.entries()) {
      const scaffoldNote = info.isScaffold ? " (scaffold)" : "";
      legendLines.push(`  ${info.symbol} = ${color}${scaffoldNote} ×${info.count}`);
    }

    return {
      grid: rows.join("\n"),
      structureCount: structureSlice.length,
      scaffoldCount: scaffoldSlice.length,
      legend: legendLines.join("\n"),
    };
  }

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
    .option("--color", "色ごとに記号を割り当ててレジェンドを表示する")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { y: number; color?: boolean; json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const { grid, structureCount, scaffoldCount, legend } = renderSlice(blueprint, opts.y, opts.color);

      printData(
        { y: opts.y, structureCount, scaffoldCount, grid, ...(legend ? { legend } : {}) },
        outputOpts,
        () => {
          const lines = [
            `Y=${opts.y} (structure: ${structureCount}, scaffold: ${scaffoldCount})`,
            grid,
          ];
          if (legend) {
            lines.push(legend);
          }
          return lines.join("\n");
        }
      );
    });
}
