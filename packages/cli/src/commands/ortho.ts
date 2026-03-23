import { type Command } from "commander";
import {
  computeBounds,
  type Block,
  type Blueprint,
  type Bounds,
} from "@boxel-planner/schema";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

const BLOCK_CHAR = "■";
const EMPTY_CHAR = "·";
const SCAFFOLD_CHAR = "░";

// 記号割り当て用のアルファベット列
const SYMBOLS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 色情報エントリ */
interface ColorEntry {
  symbol: string;
  isScaffold: boolean;
  count: number;
}

/**
 * --verbose 用の色マップを構築する。
 * structure のブロックを先に登録し（a, b, c...）、scaffold を後に登録する。
 * 返値: color（大文字） → ColorEntry のマップ
 */
function buildColorMap(
  blueprint: Blueprint,
  showScaffold: boolean
): Map<string, ColorEntry> {
  const colorInfo = new Map<string, ColorEntry>();
  let symbolIndex = 0;

  const register = (block: Block, isScaffold: boolean) => {
    const color = block.color.toUpperCase();
    if (!colorInfo.has(color)) {
      const symbol = symbolIndex < SYMBOLS.length ? SYMBOLS.charAt(symbolIndex) : "?";
      symbolIndex++;
      colorInfo.set(color, { symbol, isScaffold, count: 0 });
    }
    colorInfo.get(color)!.count++;
  };

  for (const b of blueprint.structure) register(b, false);
  if (showScaffold) {
    for (const b of blueprint.scaffold) register(b, true);
  }

  return colorInfo;
}

/**
 * TOP ビュー用の代表色マップを返す。
 * キー: "x,z"  値: color（大文字）
 * 代表色: その (x,z) セルで最も Y が大きいブロックの色
 */
function buildTopColorMap(
  blueprint: Blueprint,
  showScaffold: boolean
): Map<string, string> {
  const result = new Map<string, string>();
  const bestY = new Map<string, number>();

  const process = (blocks: Block[]) => {
    for (const b of blocks) {
      const key = `${b.x},${b.z}`;
      const prev = bestY.get(key);
      if (prev === undefined || b.y > prev) {
        bestY.set(key, b.y);
        result.set(key, b.color.toUpperCase());
      }
    }
  };

  // structure が scaffold より優先されるよう structure を後に処理
  if (showScaffold) process(blueprint.scaffold);
  process(blueprint.structure);

  return result;
}

/**
 * FRONT ビュー用の代表色マップを返す。
 * キー: "x,y"  値: color（大文字）
 * 代表色: その (x,y) セルで最も Z が小さいブロックの色
 */
function buildFrontColorMap(
  blueprint: Blueprint,
  showScaffold: boolean
): Map<string, string> {
  const result = new Map<string, string>();
  const bestZ = new Map<string, number>();

  const process = (blocks: Block[]) => {
    for (const b of blocks) {
      const key = `${b.x},${b.y}`;
      const prev = bestZ.get(key);
      if (prev === undefined || b.z < prev) {
        bestZ.set(key, b.z);
        result.set(key, b.color.toUpperCase());
      }
    }
  };

  if (showScaffold) process(blueprint.scaffold);
  process(blueprint.structure);

  return result;
}

/**
 * SIDE ビュー用の代表色マップを返す。
 * キー: "z,y"  値: color（大文字）
 * 代表色: その (z,y) セルで最も X が小さいブロックの色
 */
function buildSideColorMap(
  blueprint: Blueprint,
  showScaffold: boolean
): Map<string, string> {
  const result = new Map<string, string>();
  const bestX = new Map<string, number>();

  const process = (blocks: Block[]) => {
    for (const b of blocks) {
      const key = `${b.z},${b.y}`;
      const prev = bestX.get(key);
      if (prev === undefined || b.x < prev) {
        bestX.set(key, b.x);
        result.set(key, b.color.toUpperCase());
      }
    }
  };

  if (showScaffold) process(blueprint.scaffold);
  process(blueprint.structure);

  return result;
}

/** bounds を structure と scaffold の全ブロックから計算する。空なら null */
function computeAllBounds(blueprint: Blueprint): Bounds | null {
  const all = [...blueprint.structure, ...blueprint.scaffold];
  return computeBounds(all);
}

/**
 * TOP ビュー（Y軸方向から見下ろす）のグリッドを生成する。
 * 行 = Z 座標（min.z から max.z）
 * 列 = X 座標（min.x から max.x）
 * colorInfo が渡された場合は記号グリッドを生成する（verbose モード）
 */
function buildTopGrid(
  blueprint: Blueprint,
  bounds: Bounds,
  showScaffold: boolean,
  colorInfo?: Map<string, ColorEntry>,
  viewColorMap?: Map<string, string>
): string[][] {
  const structureSet = new Set<string>();
  const scaffoldSet = new Set<string>();

  for (const b of blueprint.structure) {
    structureSet.add(`${b.x},${b.z}`);
  }
  for (const b of blueprint.scaffold) {
    scaffoldSet.add(`${b.x},${b.z}`);
  }

  const rows: string[][] = [];
  for (let z = bounds.min.z; z <= bounds.max.z; z++) {
    const row: string[] = [];
    for (let x = bounds.min.x; x <= bounds.max.x; x++) {
      const key = `${x},${z}`;
      const hasStructure = structureSet.has(key);
      const hasScaffold = showScaffold && scaffoldSet.has(key);
      if (colorInfo && viewColorMap && (hasStructure || hasScaffold)) {
        const color = viewColorMap.get(key);
        const symbol = color ? (colorInfo.get(color)?.symbol ?? BLOCK_CHAR) : BLOCK_CHAR;
        row.push(symbol);
      } else if (hasStructure) {
        row.push(BLOCK_CHAR);
      } else if (hasScaffold) {
        row.push(SCAFFOLD_CHAR);
      } else {
        row.push(EMPTY_CHAR);
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * FRONT ビュー（Z軸方向から見る）のグリッドを生成する。
 * 行 = Y 座標（max.y から min.y、上が大きい）
 * 列 = X 座標（min.x から max.x）
 * colorInfo が渡された場合は記号グリッドを生成する（verbose モード）
 */
function buildFrontGrid(
  blueprint: Blueprint,
  bounds: Bounds,
  showScaffold: boolean,
  colorInfo?: Map<string, ColorEntry>,
  viewColorMap?: Map<string, string>
): string[][] {
  const structureSet = new Set<string>();
  const scaffoldSet = new Set<string>();

  for (const b of blueprint.structure) {
    structureSet.add(`${b.x},${b.y}`);
  }
  for (const b of blueprint.scaffold) {
    scaffoldSet.add(`${b.x},${b.y}`);
  }

  const rows: string[][] = [];
  for (let y = bounds.max.y; y >= bounds.min.y; y--) {
    const row: string[] = [];
    for (let x = bounds.min.x; x <= bounds.max.x; x++) {
      const key = `${x},${y}`;
      const hasStructure = structureSet.has(key);
      const hasScaffold = showScaffold && scaffoldSet.has(key);
      if (colorInfo && viewColorMap && (hasStructure || hasScaffold)) {
        const color = viewColorMap.get(key);
        const symbol = color ? (colorInfo.get(color)?.symbol ?? BLOCK_CHAR) : BLOCK_CHAR;
        row.push(symbol);
      } else if (hasStructure) {
        row.push(BLOCK_CHAR);
      } else if (hasScaffold) {
        row.push(SCAFFOLD_CHAR);
      } else {
        row.push(EMPTY_CHAR);
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * SIDE ビュー（X軸方向から見る）のグリッドを生成する。
 * 行 = Y 座標（max.y から min.y、上が大きい）
 * 列 = Z 座標（min.z から max.z）
 * colorInfo が渡された場合は記号グリッドを生成する（verbose モード）
 */
function buildSideGrid(
  blueprint: Blueprint,
  bounds: Bounds,
  showScaffold: boolean,
  colorInfo?: Map<string, ColorEntry>,
  viewColorMap?: Map<string, string>
): string[][] {
  const structureSet = new Set<string>();
  const scaffoldSet = new Set<string>();

  for (const b of blueprint.structure) {
    structureSet.add(`${b.z},${b.y}`);
  }
  for (const b of blueprint.scaffold) {
    scaffoldSet.add(`${b.z},${b.y}`);
  }

  const rows: string[][] = [];
  for (let y = bounds.max.y; y >= bounds.min.y; y--) {
    const row: string[] = [];
    for (let z = bounds.min.z; z <= bounds.max.z; z++) {
      const key = `${z},${y}`;
      const hasStructure = structureSet.has(key);
      const hasScaffold = showScaffold && scaffoldSet.has(key);
      if (colorInfo && viewColorMap && (hasStructure || hasScaffold)) {
        const color = viewColorMap.get(key);
        const symbol = color ? (colorInfo.get(color)?.symbol ?? BLOCK_CHAR) : BLOCK_CHAR;
        row.push(symbol);
      } else if (hasStructure) {
        row.push(BLOCK_CHAR);
      } else if (hasScaffold) {
        row.push(SCAFFOLD_CHAR);
      } else {
        row.push(EMPTY_CHAR);
      }
    }
    rows.push(row);
  }
  return rows;
}

/** 座標ラベルを間引きして生成する（5の倍数のみ表示） */
function makeAxisLabel(min: number, max: number): string {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const v = min + i;
    return v % 5 === 0 ? String(Math.abs(v) % 10) : " ";
  }).join("");
}

/**
 * 1つのビューを行の文字列配列として組み立てる。
 * 返値の各要素が1行分の文字列。
 *
 * @param title  ヘッダータイトル（例: "TOP (Y↓)"）
 * @param colMin 列方向の最小座標
 * @param colMax 列方向の最大座標
 * @param rowMin 行方向の最小座標（TOP では Z min、FRONT/SIDE では Y min）
 * @param rowMax 行方向の最大座標
 * @param rowValues 実際の行座標の配列（上から順）
 * @param grid   グリッドデータ（rows x cols の文字配列）
 * @param viewWidth 列数
 */
function buildViewLines(
  title: string,
  colMin: number,
  colMax: number,
  rowValues: number[],
  grid: string[][]
): string[] {
  const colCount = colMax - colMin + 1;
  const rowLabelWidth = 3; // 行ラベルの幅 ("  0" など)
  const totalWidth = rowLabelWidth + 1 + colCount; // ラベル + スペース + グリッド

  // ヘッダー行（タイトルを "── TITLE ──────" 形式にする）
  const titleStr = `── ${title} `;
  const headerPad = Math.max(0, totalWidth - titleStr.length);
  const header = titleStr + "─".repeat(headerPad);

  // 列軸ラベル行
  const axisLabel = makeAxisLabel(colMin, colMax);
  const axisLine = " ".repeat(rowLabelWidth + 1) + axisLabel;

  const lines: string[] = [header, axisLine];

  for (let i = 0; i < rowValues.length; i++) {
    const rowLabel = String(rowValues[i]).padStart(rowLabelWidth);
    const rowChars = grid[i] ?? [];
    lines.push(`${rowLabel} ${rowChars.join("")}`);
  }

  return lines;
}

/** 3方向正射影ビューのデータを生成する */
export function buildOrthoViews(
  blueprint: Blueprint,
  showScaffold: boolean,
  verbose?: boolean
): {
  topGrid: string[][];
  frontGrid: string[][];
  sideGrid: string[][];
  bounds: Bounds;
  legend?: string;
} | null {
  const bounds = computeAllBounds(blueprint);
  if (!bounds) return null;

  if (verbose) {
    const colorInfo = buildColorMap(blueprint, showScaffold);

    // 色が1種類以下ならフォールバック（通常の ■/· 表示）
    if (colorInfo.size <= 1) {
      const topGrid = buildTopGrid(blueprint, bounds, showScaffold);
      const frontGrid = buildFrontGrid(blueprint, bounds, showScaffold);
      const sideGrid = buildSideGrid(blueprint, bounds, showScaffold);
      return { topGrid, frontGrid, sideGrid, bounds };
    }

    const topColorMap = buildTopColorMap(blueprint, showScaffold);
    const frontColorMap = buildFrontColorMap(blueprint, showScaffold);
    const sideColorMap = buildSideColorMap(blueprint, showScaffold);

    const topGrid = buildTopGrid(blueprint, bounds, showScaffold, colorInfo, topColorMap);
    const frontGrid = buildFrontGrid(blueprint, bounds, showScaffold, colorInfo, frontColorMap);
    const sideGrid = buildSideGrid(blueprint, bounds, showScaffold, colorInfo, sideColorMap);

    // レジェンド生成
    const legendLines = ["Legend:"];
    for (const [color, info] of colorInfo.entries()) {
      const scaffoldNote = info.isScaffold ? " (scaffold)" : " (structure)";
      legendLines.push(`  ${info.symbol} = ${color}  ×${info.count}${scaffoldNote}`);
    }
    const legend = legendLines.join("\n");

    return { topGrid, frontGrid, sideGrid, bounds, legend };
  }

  const topGrid = buildTopGrid(blueprint, bounds, showScaffold);
  const frontGrid = buildFrontGrid(blueprint, bounds, showScaffold);
  const sideGrid = buildSideGrid(blueprint, bounds, showScaffold);

  return { topGrid, frontGrid, sideGrid, bounds };
}

/** 3つのビューを横並びに並べたテキストを生成する */
export function renderOrtho(
  blueprint: Blueprint,
  showScaffold: boolean,
  verbose?: boolean
): string {
  const result = buildOrthoViews(blueprint, showScaffold, verbose);
  if (!result) return "(empty)";

  const { topGrid, frontGrid, sideGrid, bounds, legend } = result;

  // TOP: 行ラベルは Z 座標（min.z から max.z）
  const topRowValues: number[] = [];
  for (let z = bounds.min.z; z <= bounds.max.z; z++) topRowValues.push(z);

  // FRONT: 行ラベルは Y 座標（max.y から min.y）
  const frontRowValues: number[] = [];
  for (let y = bounds.max.y; y >= bounds.min.y; y--) frontRowValues.push(y);

  // SIDE: 行ラベルは Y 座標（max.y から min.y）
  const sideRowValues: number[] = [];
  for (let y = bounds.max.y; y >= bounds.min.y; y--) sideRowValues.push(y);

  const topLines = buildViewLines(
    "TOP (Y↓)",
    bounds.min.x,
    bounds.max.x,
    topRowValues,
    topGrid
  );

  const frontLines = buildViewLines(
    "FRONT (Z↑)",
    bounds.min.x,
    bounds.max.x,
    frontRowValues,
    frontGrid
  );

  const sideLines = buildViewLines(
    "SIDE (X→)",
    bounds.min.z,
    bounds.max.z,
    sideRowValues,
    sideGrid
  );

  // 3つのビューを横並びに結合する
  const maxRows = Math.max(topLines.length, frontLines.length, sideLines.length);
  const colSep = "   "; // ビュー間のセパレーター

  // 各ビューの最大幅を計算してパディング
  const topWidth = Math.max(...topLines.map((l) => l.length));
  const frontWidth = Math.max(...frontLines.map((l) => l.length));

  const combinedLines: string[] = [];
  for (let i = 0; i < maxRows; i++) {
    const topPart = (topLines[i] ?? "").padEnd(topWidth);
    const frontPart = (frontLines[i] ?? "").padEnd(frontWidth);
    const sidePart = sideLines[i] ?? "";
    combinedLines.push(`${topPart}${colSep}${frontPart}${colSep}${sidePart}`);
  }

  const output = combinedLines.join("\n");
  if (legend) {
    return `${output}\n${legend}`;
  }
  return output;
}

export function registerOrtho(program: Command): void {
  program
    .command("ortho <file>")
    .description("3方向正射影ビュー（TOP/FRONT/SIDE）を横並びで出力する（LLM確認用）")
    .option("--scaffold", "足場も表示する（░ で区別）")
    .option("--verbose", "色ごとに記号を割り当ててレジェンドを表示する")
    .option("--y-min <n>", "表示するY座標の下限（床など低層を除外するときに使用）", Number)
    .option("--y-max <n>", "表示するY座標の上限", Number)
    .option("--json", "グリッドデータを JSON で出力する")
    .action((file: string, opts: { scaffold?: boolean; verbose?: boolean; yMin?: number; yMax?: number; json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const showScaffold = opts.scaffold ?? false;
      const verbose = opts.verbose ?? false;

      // --y-min / --y-max でブロックをフィルターして一時的な表示用 blueprint を作る
      const displayBlueprint =
        opts.yMin !== undefined || opts.yMax !== undefined
          ? {
              ...blueprint,
              structure: blueprint.structure.filter(
                (b) =>
                  (opts.yMin === undefined || b.y >= opts.yMin) &&
                  (opts.yMax === undefined || b.y <= opts.yMax)
              ),
              scaffold: blueprint.scaffold.filter(
                (b) =>
                  (opts.yMin === undefined || b.y >= opts.yMin) &&
                  (opts.yMax === undefined || b.y <= opts.yMax)
              ),
            }
          : blueprint;

      const orthoResult = buildOrthoViews(displayBlueprint, showScaffold, verbose);

      if (!orthoResult) {
        printData(
          { top: [], front: [], side: [], bounds: null },
          outputOpts,
          () => "(empty)"
        );
        return;
      }

      const { topGrid, frontGrid, sideGrid, bounds, legend } = orthoResult;
      const text = renderOrtho(displayBlueprint, showScaffold, verbose);

      printData(
        { bounds, top: topGrid, front: frontGrid, side: sideGrid, ...(legend ? { legend } : {}) },
        outputOpts,
        () => text
      );
    });
}
