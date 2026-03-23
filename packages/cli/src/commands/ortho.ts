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
const HIGHLIGHT_CHAR = "◆";
const HIGHLIGHT_SCAFFOLD_CHAR = "◇";
const SYMBOLS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CENTER_VERTICAL_CHAR = "│";
const CENTER_HORIZONTAL_CHAR = "─";
const CENTER_CROSS_CHAR = "┼";
const GRID_VERTICAL_CHAR = "┆";
const GRID_HORIZONTAL_CHAR = "┄";
const GRID_CROSS_CHAR = "┼";

export type OrthoMode = "solid" | "coord";
export type OrthoCell = string | number | null;
export type OrthoView = "top" | "front" | "side" | "all";
export type OrthoCoordStyle = "raw" | "braille";

const BRAILLE_LEVELS = ["⠀", "⠁", "⠃", "⠇", "⠧", "⠷", "⠿", "⣷", "⣿"] as const;

interface ColorEntry {
  symbol: string;
  isScaffold: boolean;
  count: number;
  paletteName?: string;
  paletteDescription?: string;
}

interface ViewState {
  structure: Set<string>;
  scaffold: Set<string>;
}

export interface OrthoRenderOptions {
  crop?: "all" | "structure";
  center?: boolean;
  gridStep?: number;
  highlightColor?: string;
}

function buildColorMap(
  blueprint: Blueprint,
  showScaffold: boolean
): Map<string, ColorEntry> {
  const colorInfo = new Map<string, ColorEntry>();
  const paletteByColor = new Map(
    (blueprint.palette ?? []).map((entry) => [entry.color.toUpperCase(), entry] as const)
  );
  let symbolIndex = 0;

  const register = (block: Block, isScaffold: boolean) => {
    const color = block.color.toUpperCase();
    if (!colorInfo.has(color)) {
      const symbol = symbolIndex < SYMBOLS.length ? SYMBOLS.charAt(symbolIndex) : "?";
      symbolIndex++;
      const paletteEntry = paletteByColor.get(color);
      colorInfo.set(color, {
        symbol,
        isScaffold,
        count: 0,
        ...(paletteEntry
          ? {
              paletteName: paletteEntry.name,
              paletteDescription: paletteEntry.description,
            }
          : {}),
      });
    }
    colorInfo.get(color)!.count++;
  };

  for (const b of blueprint.structure) register(b, false);
  if (showScaffold) {
    for (const b of blueprint.scaffold) register(b, true);
  }

  return colorInfo;
}

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

  if (showScaffold) process(blueprint.scaffold);
  process(blueprint.structure);

  return result;
}

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

function computeAllBounds(blueprint: Blueprint): Bounds | null {
  return computeBounds([...blueprint.structure, ...blueprint.scaffold]);
}

function computeDisplayBounds(
  blueprint: Blueprint,
  crop: "all" | "structure"
): Bounds | null {
  if (crop === "structure") {
    const structureBounds = computeBounds(blueprint.structure);
    if (structureBounds) return structureBounds;
  }
  return computeAllBounds(blueprint);
}

function buildTopState(blueprint: Blueprint): ViewState {
  const structure = new Set<string>();
  const scaffold = new Set<string>();
  for (const b of blueprint.structure) structure.add(`${b.x},${b.z}`);
  for (const b of blueprint.scaffold) scaffold.add(`${b.x},${b.z}`);
  return { structure, scaffold };
}

function buildFrontState(blueprint: Blueprint): ViewState {
  const structure = new Set<string>();
  const scaffold = new Set<string>();
  for (const b of blueprint.structure) structure.add(`${b.x},${b.y}`);
  for (const b of blueprint.scaffold) scaffold.add(`${b.x},${b.y}`);
  return { structure, scaffold };
}

function buildSideState(blueprint: Blueprint): ViewState {
  const structure = new Set<string>();
  const scaffold = new Set<string>();
  for (const b of blueprint.structure) structure.add(`${b.z},${b.y}`);
  for (const b of blueprint.scaffold) scaffold.add(`${b.z},${b.y}`);
  return { structure, scaffold };
}

function buildSolidGrid(
  rows: number[],
  cols: number[],
  state: ViewState,
  showScaffold: boolean,
  colorInfo?: Map<string, ColorEntry>,
  colorMap?: Map<string, string>,
  opts: {
    highlightColor?: string;
  } = {}
): string[][] {
  const grid: string[][] = [];
  const highlightColor = opts.highlightColor?.toUpperCase();

  for (const row of rows) {
    const outRow: string[] = [];
    for (const col of cols) {
      const key = `${col},${row}`;
      const hasStructure = state.structure.has(key);
      const hasScaffold = showScaffold && state.scaffold.has(key);
      if (colorMap && (hasStructure || hasScaffold)) {
        const color = colorMap.get(key);
        if (highlightColor && color === highlightColor) {
          outRow.push(hasStructure ? HIGHLIGHT_CHAR : HIGHLIGHT_SCAFFOLD_CHAR);
        } else if (colorInfo && color) {
          outRow.push(colorInfo.get(color)?.symbol ?? BLOCK_CHAR);
        } else {
          outRow.push(hasStructure ? BLOCK_CHAR : SCAFFOLD_CHAR);
        }
      } else if (hasStructure) {
        outRow.push(BLOCK_CHAR);
      } else if (hasScaffold) {
        outRow.push(SCAFFOLD_CHAR);
      } else {
        outRow.push(EMPTY_CHAR);
      }
    }
    grid.push(outRow);
  }

  return grid;
}

function applyGuidesToGrid(
  grid: string[][],
  rows: number[],
  cols: number[],
  opts: {
    center?: boolean;
    gridStep?: number;
  }
): string[][] {
  return grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (cell !== EMPTY_CHAR) return cell;

      const rowValue = rows[rowIndex]!;
      const colValue = cols[colIndex]!;
      const isCenterVertical = opts.center === true && colValue === 0;
      const isCenterHorizontal = opts.center === true && rowValue === 0;
      const isGridVertical =
        opts.gridStep !== undefined && opts.gridStep > 0 && colValue % opts.gridStep === 0;
      const isGridHorizontal =
        opts.gridStep !== undefined && opts.gridStep > 0 && rowValue % opts.gridStep === 0;

      if (isCenterVertical && isCenterHorizontal) return CENTER_CROSS_CHAR;
      if (isCenterVertical) return CENTER_VERTICAL_CHAR;
      if (isCenterHorizontal) return CENTER_HORIZONTAL_CHAR;
      if (isGridVertical && isGridHorizontal) return GRID_CROSS_CHAR;
      if (isGridVertical) return GRID_VERTICAL_CHAR;
      if (isGridHorizontal) return GRID_HORIZONTAL_CHAR;
      return cell;
    })
  );
}

function buildVisibleValueMap(
  blocks: Block[],
  keyFn: (block: Block) => string,
  valueFn: (block: Block) => number,
  prefer: (next: number, current: number) => boolean
): Map<string, number> {
  const values = new Map<string, number>();

  for (const block of blocks) {
    const key = keyFn(block);
    const value = valueFn(block);
    const current = values.get(key);
    if (current === undefined || prefer(value, current)) {
      values.set(key, value);
    }
  }

  return values;
}

function buildTopCoordMap(blueprint: Blueprint, showScaffold: boolean): Map<string, number> {
  const blocks = showScaffold
    ? [...blueprint.scaffold, ...blueprint.structure]
    : blueprint.structure;
  return buildVisibleValueMap(blocks, (b) => `${b.x},${b.z}`, (b) => b.y, (next, current) => next > current);
}

function buildFrontCoordMap(blueprint: Blueprint, showScaffold: boolean): Map<string, number> {
  const blocks = showScaffold
    ? [...blueprint.scaffold, ...blueprint.structure]
    : blueprint.structure;
  return buildVisibleValueMap(blocks, (b) => `${b.x},${b.y}`, (b) => b.z, (next, current) => next < current);
}

function buildSideCoordMap(blueprint: Blueprint, showScaffold: boolean): Map<string, number> {
  const blocks = showScaffold
    ? [...blueprint.scaffold, ...blueprint.structure]
    : blueprint.structure;
  return buildVisibleValueMap(blocks, (b) => `${b.z},${b.y}`, (b) => b.x, (next, current) => next < current);
}

function buildCoordGrid(
  rows: number[],
  cols: number[],
  values: Map<string, number>
): Array<Array<number | null>> {
  const grid: Array<Array<number | null>> = [];

  for (const row of rows) {
    const outRow: Array<number | null> = [];
    for (const col of cols) {
      const key = `${col},${row}`;
      outRow.push(values.get(key) ?? null);
    }
    grid.push(outRow);
  }

  return grid;
}

function makeAxisLabel(
  min: number,
  max: number,
  cellWidth: number,
  separator: string
): string {
  const parts: string[] = [];
  for (let v = min; v <= max; v++) {
    const label = v % 5 === 0 ? String(v) : "";
    parts.push(label.padStart(cellWidth));
  }
  return parts.join(separator);
}

function formatCell(cell: OrthoCell, cellWidth: number): string {
  if (cell === null) return " ".repeat(cellWidth);
  return String(cell).padStart(cellWidth);
}

function normalizeCoordGridToBraille(
  grid: OrthoCell[][],
  opts: { invert?: boolean } = {}
): string[][] {
  const values = grid
    .flat()
    .filter((cell): cell is number => typeof cell === "number");

  if (values.length === 0) {
    return grid.map((row) => row.map(() => " "));
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return grid.map((row) =>
    row.map((cell) => {
      if (cell === null) return " ";
      if (typeof cell !== "number") return cell;
      if (range === 0) return BRAILLE_LEVELS[BRAILLE_LEVELS.length - 1]!;
      const ratio = (cell - min) / range;
      const normalized = Math.round(
        (opts.invert ? 1 - ratio : ratio) * (BRAILLE_LEVELS.length - 1)
      );
      return BRAILLE_LEVELS[normalized]!;
    })
  );
}

function buildViewLines(
  title: string,
  colMin: number,
  colMax: number,
  rowValues: number[],
  grid: OrthoCell[][],
  cellWidth: number,
  separator: string
): string[] {
  const rowLabelWidth = Math.max(
    3,
    ...rowValues.map((value) => String(value).length)
  );
  const rowTextWidth = cellWidth * (colMax - colMin + 1) + separator.length * (colMax - colMin);
  const totalWidth = rowLabelWidth + 1 + rowTextWidth;
  const titleStr = `── ${title} `;
  const header = titleStr + "─".repeat(Math.max(0, totalWidth - titleStr.length));
  const axisLine = " ".repeat(rowLabelWidth + 1) + makeAxisLabel(colMin, colMax, cellWidth, separator);

  const lines = [header, axisLine];
  for (let i = 0; i < rowValues.length; i++) {
    const label = String(rowValues[i]).padStart(rowLabelWidth);
    const row = (grid[i] ?? []).map((cell) => formatCell(cell, cellWidth)).join(separator);
    lines.push(`${label} ${row}`);
  }
  return lines;
}

export function buildOrthoViews(
  blueprint: Blueprint,
  showScaffold: boolean,
  verbose = false,
  mode: OrthoMode = "solid",
  opts: OrthoRenderOptions = {}
): {
  topGrid: OrthoCell[][];
  frontGrid: OrthoCell[][];
  sideGrid: OrthoCell[][];
  bounds: Bounds;
  legend?: string;
  mode: OrthoMode;
} | null {
  const bounds = computeDisplayBounds(blueprint, opts.crop ?? "all");
  if (!bounds) return null;

  const topRows = Array.from({ length: bounds.max.z - bounds.min.z + 1 }, (_, i) => bounds.min.z + i);
  const frontRows = Array.from({ length: bounds.max.y - bounds.min.y + 1 }, (_, i) => bounds.max.y - i);
  const sideRows = Array.from({ length: bounds.max.y - bounds.min.y + 1 }, (_, i) => bounds.max.y - i);
  const xCols = Array.from({ length: bounds.max.x - bounds.min.x + 1 }, (_, i) => bounds.min.x + i);
  const zCols = Array.from({ length: bounds.max.z - bounds.min.z + 1 }, (_, i) => bounds.min.z + i);

  if (mode === "coord") {
    return {
      topGrid: buildCoordGrid(topRows, xCols, buildTopCoordMap(blueprint, showScaffold)),
      frontGrid: buildCoordGrid(frontRows, xCols, buildFrontCoordMap(blueprint, showScaffold)),
      sideGrid: buildCoordGrid(sideRows, zCols, buildSideCoordMap(blueprint, showScaffold)),
      bounds,
      mode,
    };
  }

  if (verbose) {
    const colorInfo = buildColorMap(blueprint, showScaffold);
    if (colorInfo.size > 1) {
      const topGrid = applyGuidesToGrid(buildSolidGrid(
        topRows,
        xCols,
        buildTopState(blueprint),
        showScaffold,
        colorInfo,
        buildTopColorMap(blueprint, showScaffold),
        { highlightColor: opts.highlightColor }
      ), topRows, xCols, opts);
      const frontGrid = applyGuidesToGrid(buildSolidGrid(
        frontRows,
        xCols,
        buildFrontState(blueprint),
        showScaffold,
        colorInfo,
        buildFrontColorMap(blueprint, showScaffold),
        { highlightColor: opts.highlightColor }
      ), frontRows, xCols, opts);
      const sideGrid = applyGuidesToGrid(buildSolidGrid(
        sideRows,
        zCols,
        buildSideState(blueprint),
        showScaffold,
        colorInfo,
        buildSideColorMap(blueprint, showScaffold),
        { highlightColor: opts.highlightColor }
      ), sideRows, zCols, opts);

      const legendLines = ["Legend:"];
      for (const [color, info] of colorInfo.entries()) {
        const palettePart = info.paletteName
          ? ` ${info.paletteName}${info.paletteDescription ? ` — ${info.paletteDescription}` : ""}`
          : "";
        legendLines.push(
          `  ${info.symbol} = ${color}${palettePart}  ×${info.count}${info.isScaffold ? " (scaffold)" : " (structure)"}`
        );
      }

      return {
        topGrid,
        frontGrid,
        sideGrid,
        bounds,
        legend: legendLines.join("\n"),
        mode,
      };
    }
  }

  return {
    topGrid: applyGuidesToGrid(
      buildSolidGrid(
        topRows,
        xCols,
        buildTopState(blueprint),
        showScaffold,
        undefined,
        opts.highlightColor ? buildTopColorMap(blueprint, showScaffold) : undefined,
        { highlightColor: opts.highlightColor }
      ),
      topRows,
      xCols,
      opts
    ),
    frontGrid: applyGuidesToGrid(
      buildSolidGrid(
        frontRows,
        xCols,
        buildFrontState(blueprint),
        showScaffold,
        undefined,
        opts.highlightColor ? buildFrontColorMap(blueprint, showScaffold) : undefined,
        { highlightColor: opts.highlightColor }
      ),
      frontRows,
      xCols,
      opts
    ),
    sideGrid: applyGuidesToGrid(
      buildSolidGrid(
        sideRows,
        zCols,
        buildSideState(blueprint),
        showScaffold,
        undefined,
        opts.highlightColor ? buildSideColorMap(blueprint, showScaffold) : undefined,
        { highlightColor: opts.highlightColor }
      ),
      sideRows,
      zCols,
      opts
    ),
    bounds,
    mode,
  };
}

export function renderOrtho(
  blueprint: Blueprint,
  showScaffold: boolean,
  verbose = false,
  mode: OrthoMode = "solid",
  view: OrthoView = "all",
  coordStyle: OrthoCoordStyle = "raw",
  opts: OrthoRenderOptions = {}
): string {
  const result = buildOrthoViews(blueprint, showScaffold, verbose, mode, opts);
  if (!result) return "(empty)";

  let { topGrid, frontGrid, sideGrid, bounds, legend } = result;
  const topRowValues = Array.from({ length: bounds.max.z - bounds.min.z + 1 }, (_, i) => bounds.min.z + i);
  const frontRowValues = Array.from({ length: bounds.max.y - bounds.min.y + 1 }, (_, i) => bounds.max.y - i);
  const sideRowValues = Array.from({ length: bounds.max.y - bounds.min.y + 1 }, (_, i) => bounds.max.y - i);

  if (mode === "coord" && coordStyle === "braille") {
    topGrid = normalizeCoordGridToBraille(topGrid);
    frontGrid = normalizeCoordGridToBraille(frontGrid, { invert: true });
    sideGrid = normalizeCoordGridToBraille(sideGrid, { invert: true });
  }

  const allCells = [...topGrid.flat(), ...frontGrid.flat(), ...sideGrid.flat()];
  const cellWidth = mode === "coord" && coordStyle === "raw"
    ? Math.max(1, ...allCells.filter((cell): cell is number => typeof cell === "number").map((cell) => String(cell).length))
    : 1;
  const separator = mode === "coord" && coordStyle === "raw" ? " " : "";

  const topLines = buildViewLines(
    mode === "coord"
      ? coordStyle === "braille" ? "TOP (visible Y, braille)" : "TOP (visible Y)"
      : "TOP (Y↓)",
    bounds.min.x,
    bounds.max.x,
    topRowValues,
    topGrid,
    cellWidth,
    separator
  );
  const frontLines = buildViewLines(
    mode === "coord"
      ? coordStyle === "braille" ? "FRONT (visible Z, braille)" : "FRONT (visible Z)"
      : "FRONT (Z↑)",
    bounds.min.x,
    bounds.max.x,
    frontRowValues,
    frontGrid,
    cellWidth,
    separator
  );
  const sideLines = buildViewLines(
    mode === "coord"
      ? coordStyle === "braille" ? "SIDE (visible X, braille)" : "SIDE (visible X)"
      : "SIDE (X→)",
    bounds.min.z,
    bounds.max.z,
    sideRowValues,
    sideGrid,
    cellWidth,
    separator
  );

  const output: string[] = [];
  if (view === "top") {
    output.push(...topLines);
  } else if (view === "front") {
    output.push(...frontLines);
  } else if (view === "side") {
    output.push(...sideLines);
  } else {
    const topWidth = Math.max(...topLines.map((line) => line.length));
    const frontWidth = Math.max(...frontLines.map((line) => line.length));
    const maxRows = Math.max(topLines.length, frontLines.length, sideLines.length);

    for (let i = 0; i < maxRows; i++) {
      const topPart = (topLines[i] ?? "").padEnd(topWidth);
      const frontPart = (frontLines[i] ?? "").padEnd(frontWidth);
      const sidePart = sideLines[i] ?? "";
      output.push(`${topPart}   ${frontPart}   ${sidePart}`);
    }
  }

  if (legend) {
    output.push(legend);
  }
  if (opts.highlightColor) {
    output.push(`Highlight: ${opts.highlightColor.toUpperCase()} => ${HIGHLIGHT_CHAR}`);
  }
  if (mode === "coord" && coordStyle === "braille") {
    output.push("Braille scale: low -> high = " + BRAILLE_LEVELS.join(""));
  }

  return output.join("\n");
}

export function registerOrtho(program: Command): void {
  program
    .command("ortho <file>")
    .description("3方向正射影ビュー（TOP/FRONT/SIDE）を横並びで出力する（LLM確認用）")
    .option("--scaffold", "足場も表示する（solid モードでは ░ で区別）")
    .option("--verbose", "solid モードで色ごとに記号を割り当ててレジェンドを表示する")
    .option("--mode <mode>", "表示モード: solid | coord", "solid")
    .option("--view <view>", "表示する面: top | front | side | all", "all")
    .option("--style <style>", "coord モードの表示スタイル: raw | braille", "raw")
    .option("--y-min <n>", "表示するY座標の下限（床など低層を除外するときに使用）", Number)
    .option("--y-max <n>", "表示するY座標の上限", Number)
    .option("--crop <target>", "表示範囲: all | structure", "all")
    .option("--center", "原点の中心線を補助表示する")
    .option("--grid <n>", "n 間隔の補助グリッドを表示する", Number)
    .option("--highlight-color <#RRGGBB>", "指定色だけを強調表示する")
    .option("--json", "グリッドデータを JSON で出力する")
    .action((file: string, opts: {
      scaffold?: boolean;
      verbose?: boolean;
      mode?: string;
      view?: string;
      style?: string;
      yMin?: number;
      yMax?: number;
      crop?: string;
      center?: boolean;
      grid?: number;
      highlightColor?: string;
      json?: boolean;
    }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      const mode = (opts.mode ?? "solid") as OrthoMode;
      const view = (opts.view ?? "all") as OrthoView;
      const style = (opts.style ?? "raw") as OrthoCoordStyle;
      const crop = (opts.crop ?? "all") as "all" | "structure";
      if (!["solid", "coord"].includes(mode)) {
        printError(`Invalid mode: "${opts.mode}". Must be "solid" or "coord".`, outputOpts);
      }
      if (!["top", "front", "side", "all"].includes(view)) {
        printError(`Invalid view: "${opts.view}". Must be "top", "front", "side", or "all".`, outputOpts);
      }
      if (!["raw", "braille"].includes(style)) {
        printError(`Invalid style: "${opts.style}". Must be "raw" or "braille".`, outputOpts);
      }
      if (!["all", "structure"].includes(crop)) {
        printError(`Invalid crop: "${opts.crop}". Must be "all" or "structure".`, outputOpts);
      }
      if ((opts.verbose ?? false) && mode === "coord") {
        printError("--verbose is only available with --mode solid.", outputOpts);
      }
      if (mode !== "coord" && style !== "raw") {
        printError("--style is only available with --mode coord.", outputOpts);
      }
      if (opts.highlightColor !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(opts.highlightColor)) {
        printError(`Invalid highlight-color: "${opts.highlightColor}". Must be #RRGGBB format.`, outputOpts);
      }
      if (opts.highlightColor !== undefined && mode === "coord") {
        printError("--highlight-color is only available with --mode solid.", outputOpts);
      }
      if (opts.grid !== undefined && (!Number.isInteger(opts.grid) || opts.grid < 1)) {
        printError("--grid must be an integer >= 1.", outputOpts);
      }

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const showScaffold = opts.scaffold ?? false;
      const verbose = opts.verbose ?? false;
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

      const renderOpts: OrthoRenderOptions = {
        crop,
        center: opts.center ?? false,
        ...(opts.grid !== undefined ? { gridStep: opts.grid } : {}),
        ...(opts.highlightColor !== undefined ? { highlightColor: opts.highlightColor } : {}),
      };

      const orthoResult = buildOrthoViews(displayBlueprint, showScaffold, verbose, mode, renderOpts);
      if (!orthoResult) {
        printData(
          { mode, view, style, crop, top: [], front: [], side: [], bounds: null },
          outputOpts,
          () => "(empty)"
        );
        return;
      }

      const { topGrid, frontGrid, sideGrid, bounds, legend } = orthoResult;
      printData(
        {
          mode,
          view,
          style,
          crop,
          bounds,
          top: topGrid,
          front: frontGrid,
          side: sideGrid,
          ...(legend ? { legend } : {}),
        },
        outputOpts,
        () => renderOrtho(displayBlueprint, showScaffold, verbose, mode, view, style, renderOpts)
      );
    });
}
