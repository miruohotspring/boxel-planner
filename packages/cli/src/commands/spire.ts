import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";

function parseRadii(list: string): number[] {
  const parts = list
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) return [];

  return parts.map((part) => Number(part));
}

export function registerSpire(program: Command): void {
  program
    .command("spire <file>")
    .description("半径列を段積みして尖塔や屋根を生成する")
    .requiredOption("--cx <n>", "中心X座標", Number)
    .requiredOption("--cz <n>", "中心Z座標", Number)
    .requiredOption("--y <n>", "開始Y座標", Number)
    .requiredOption("--radii <list>", "各層の半径をカンマ区切りで指定 (例: 4,3,3,2,2,1)")
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--cap-color <#RRGGBB>", "先端ブロックのカラー")
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          cx: number;
          cz: number;
          y: number;
          radii: string;
          color: string;
          capColor?: string;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (!/^#[0-9A-Fa-f]{6}$/.test(opts.color)) {
          printError(`Invalid color: "${opts.color}". Must be #RRGGBB format.`, outputOpts);
        }

        if (opts.capColor !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(opts.capColor)) {
          printError(`Invalid cap-color: "${opts.capColor}". Must be #RRGGBB format.`, outputOpts);
        }

        if (opts.layer !== "structure" && opts.layer !== "scaffold") {
          printError(`Invalid layer: "${opts.layer}". Must be "structure" or "scaffold".`, outputOpts);
        }

        const radii = parseRadii(opts.radii);
        if (radii.length === 0) {
          printError(`Invalid radii: "${opts.radii}". Provide one or more integers like 4,3,2,1.`, outputOpts);
        }

        if (radii.some((radius) => !Number.isInteger(radius) || radius < 1)) {
          printError(`Invalid radii: "${opts.radii}". Each radius must be an integer >= 1.`, outputOpts);
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as "structure" | "scaffold";
        const existingBlocks = [...blueprint[layer]];
        const prevKeys = new Set(existingBlocks.map((block) => positionKey(block)));
        const posMap = new Map<string, Block>();
        for (const block of existingBlocks) {
          posMap.set(positionKey(block), block);
        }

        let added = 0;
        for (const [index, radius] of radii.entries()) {
          const y = opts.y + index;
          for (let x = opts.cx - radius; x <= opts.cx + radius; x++) {
            for (let z = opts.cz - radius; z <= opts.cz + radius; z++) {
              const dx = x - opts.cx;
              const dz = z - opts.cz;
              if (dx * dx + dz * dz > radius * radius) continue;

              const block: Block = { x, y, z, color: opts.color };
              const key = positionKey(block);
              if (!posMap.has(key)) added++;
              posMap.set(key, block);
            }
          }
        }

        if (opts.capColor !== undefined) {
          const block: Block = {
            x: opts.cx,
            y: opts.y + radii.length,
            z: opts.cz,
            color: opts.capColor,
          };
          const key = positionKey(block);
          if (!posMap.has(key)) added++;
          posMap.set(key, block);
        }

        if (layer === "structure") warnNegativeCoords(posMap, prevKeys, layer);

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
            added,
            center: { x: opts.cx, y: opts.y, z: opts.cz },
            radii,
            cap: opts.capColor !== undefined,
            height: radii.length + (opts.capColor !== undefined ? 1 : 0),
          },
          outputOpts,
          () =>
            `Added spire: ${added} block(s), radii=[${radii.join(",")}], base=(${opts.cx},${opts.y},${opts.cz}).`
        );
      }
    );
}
