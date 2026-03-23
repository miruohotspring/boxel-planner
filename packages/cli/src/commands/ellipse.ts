import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerEllipse(program: Command): void {
  program
    .command("ellipse <file>")
    .description("Y平面上に楕円（リングまたは塗りつぶし）を描く")
    .requiredOption("--cx <n>", "中心X座標", Number)
    .requiredOption("--cz <n>", "中心Z座標", Number)
    .requiredOption("--rx <n>", "X方向半径（1以上の整数）", Number)
    .requiredOption("--rz <n>", "Z方向半径（1以上の整数）", Number)
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
          rx: number;
          rz: number;
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

        if (opts.rx < 1) {
          printError(`rx must be >= 1. Got: ${opts.rx}`, outputOpts);
        }

        if (opts.rz < 1) {
          printError(`rz must be >= 1. Got: ${opts.rz}`, outputOpts);
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as "structure" | "scaffold";
        const existingBlocks = [...blueprint[layer]];
        const posMap = new Map<string, Block>();
        for (const b of existingBlocks) {
          posMap.set(positionKey(b), b);
        }

        const cx = opts.cx;
        const cz = opts.cz;
        const rx = opts.rx;
        const rz = opts.rz;
        const y = opts.y;

        let added = 0;
        for (let x = cx - rx; x <= cx + rx; x++) {
          for (let z = cz - rz; z <= cz + rz; z++) {
            const dx = x - cx;
            const dz = z - cz;
            // 楕円方程式: (dx/rx)² + (dz/rz)²
            const ellipseVal = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);

            let place: boolean;
            if (opts.filled) {
              place = ellipseVal <= 1;
            } else {
              place = ellipseVal >= 0.7 && ellipseVal <= 1.3;
            }

            if (!place) continue;

            const block: Block = { x, y, z, color: opts.color };
            const key = positionKey(block);
            if (!posMap.has(key)) added++;
            posMap.set(key, block);
          }
        }

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
            rx,
            rz,
            center: { x: cx, z: cz },
            filled: opts.filled ?? false,
          },
          outputOpts,
          () =>
            `Added ellipse: ${added} block(s) at Y=${y}, rx=${rx}, rz=${rz}, center=(${cx},${y},${cz}).`
        );
      }
    );
}
