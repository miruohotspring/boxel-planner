import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";

export function registerCircle(program: Command): void {
  program
    .command("circle <file>")
    .description("Y平面上に円（リングまたは塗りつぶし）を描く")
    .requiredOption("--cx <n>", "中心X座標", Number)
    .requiredOption("--cz <n>", "中心Z座標", Number)
    .requiredOption("--r <n>", "半径（1以上の整数）", Number)
    .requiredOption("--y <n>", "Y座標", Number)
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--filled", "塗りつぶし（デフォルト: リング）")
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          cx: number;
          cz: number;
          r: number;
          y: number;
          color: string;
          filled?: boolean;
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

        if (opts.r < 1) {
          printError(`Radius must be >= 1. Got: ${opts.r}`, outputOpts);
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as "structure" | "scaffold";
        const existingBlocks = [...blueprint[layer]];
        const prevKeys = new Set(existingBlocks.map((b) => positionKey(b)));
        const posMap = new Map<string, Block>();
        for (const b of existingBlocks) {
          posMap.set(positionKey(b), b);
        }

        const cx = opts.cx;
        const cz = opts.cz;
        const r = opts.r;
        const y = opts.y;

        let added = 0;
        for (let x = cx - r; x <= cx + r; x++) {
          for (let z = cz - r; z <= cz + r; z++) {
            const dx = x - cx;
            const dz = z - cz;
            const dist2 = dx * dx + dz * dz;

            let place: boolean;
            if (opts.filled) {
              place = dist2 <= r * r;
            } else {
              const rInner = r - 0.5;
              const rOuter = r + 0.5;
              place = dist2 >= rInner * rInner && dist2 <= rOuter * rOuter;
            }

            if (!place) continue;

            const block: Block = { x, y, z, color: opts.color };
            const key = positionKey(block);
            if (!posMap.has(key)) added++;
            posMap.set(key, block);
          }
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
            y,
            radius: r,
            center: { x: cx, z: cz },
            filled: opts.filled ?? false,
          },
          outputOpts,
          () =>
            `Added circle: ${added} block(s) at Y=${y}, radius=${r}, center=(${cx},${y},${cz}).`
        );
      }
    );
}
