import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";

type SurfaceType = "torus" | "paraboloid" | "wave" | "gaussian" | "saddle";

export function registerSurface(program: Command): void {
  program
    .command("surface <file>")
    .description("パラメトリック曲面をボクセル座標列に変換して書き込む")
    .requiredOption("--type <type>", "曲面タイプ (torus | paraboloid | wave | gaussian | saddle)")
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--cx <n>", "中心X座標", Number, 0)
    .option("--cy <n>", "中心Y座標", Number, 0)
    .option("--cz <n>", "中心Z座標", Number, 0)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--samples <n>", "サンプル数 N（N×N でサンプリング）", Number, 80)
    // torus options
    .option("--R <n>", "トーラス大半径", Number)
    .option("--r <n>", "トーラス小半径", Number)
    // paraboloid / saddle options
    .option("--a <n>", "放物面/鞍面 a 係数", Number)
    .option("--b <n>", "放物面/鞍面 b 係数", Number)
    // wave / gaussian / range options
    .option("--range <n>", "u/v の範囲（デフォルトは曲面タイプ依存）", Number)
    .option("--amplitude <n>", "波面/ガウシアン 振幅", Number)
    .option("--kx <n>", "波面 x 周波数", Number)
    .option("--kz <n>", "波面 z 周波数", Number)
    .option("--sigma-x <n>", "ガウシアン x 広がり", Number)
    .option("--sigma-z <n>", "ガウシアン z 広がり", Number)
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          type: string;
          color: string;
          cx: number;
          cy: number;
          cz: number;
          layer: string;
          samples: number;
          R?: number;
          r?: number;
          a?: number;
          b?: number;
          range?: number;
          amplitude?: number;
          kx?: number;
          kz?: number;
          sigmaX?: number;
          sigmaZ?: number;
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

        const validTypes: SurfaceType[] = ["torus", "paraboloid", "wave", "gaussian", "saddle"];
        if (!validTypes.includes(opts.type as SurfaceType)) {
          printError(
            `Invalid --type: "${opts.type}". Must be one of: ${validTypes.join(", ")}.`,
            outputOpts
          );
        }

        const surfaceType = opts.type as SurfaceType;

        // Validate required options per surface type
        if (surfaceType === "torus") {
          if (opts.R === undefined) printError("--R (大半径) is required for torus.", outputOpts);
          if (opts.r === undefined) printError("--r (小半径) is required for torus.", outputOpts);
        } else if (surfaceType === "paraboloid") {
          if (opts.a === undefined) printError("--a is required for paraboloid.", outputOpts);
          if (opts.b === undefined) printError("--b is required for paraboloid.", outputOpts);
        } else if (surfaceType === "wave") {
          if (opts.amplitude === undefined) printError("--amplitude is required for wave.", outputOpts);
          if (opts.kx === undefined) printError("--kx is required for wave.", outputOpts);
          if (opts.kz === undefined) printError("--kz is required for wave.", outputOpts);
        } else if (surfaceType === "gaussian") {
          if (opts.amplitude === undefined) printError("--amplitude is required for gaussian.", outputOpts);
          if (opts.sigmaX === undefined) printError("--sigma-x is required for gaussian.", outputOpts);
          if (opts.sigmaZ === undefined) printError("--sigma-z is required for gaussian.", outputOpts);
        } else if (surfaceType === "saddle") {
          if (opts.a === undefined) printError("--a is required for saddle.", outputOpts);
          if (opts.b === undefined) printError("--b is required for saddle.", outputOpts);
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
        const cy = opts.cy;
        const cz = opts.cz;
        const N = opts.samples;

        // Generate surface points
        const TWO_PI = 2 * Math.PI;

        if (surfaceType === "torus") {
          const bigR = opts.R!;
          const smallR = opts.r!;
          for (let i = 0; i <= N; i++) {
            const u = (i / N) * TWO_PI;
            for (let j = 0; j <= N; j++) {
              const v = (j / N) * TWO_PI;
              const fx = (bigR + smallR * Math.cos(u)) * Math.cos(v);
              const fy = smallR * Math.sin(u);
              const fz = (bigR + smallR * Math.cos(u)) * Math.sin(v);
              const x = Math.round(fx) + cx;
              const y = Math.round(fy) + cy;
              const z = Math.round(fz) + cz;
              const block: Block = { x, y, z, color: opts.color };
              posMap.set(positionKey(block), block);
            }
          }
        } else if (surfaceType === "paraboloid") {
          const range = opts.range ?? 5;
          const a = opts.a!;
          const b = opts.b!;
          for (let i = 0; i <= N; i++) {
            const u = -range + (i / N) * 2 * range;
            for (let j = 0; j <= N; j++) {
              const v = -range + (j / N) * 2 * range;
              const fx = u;
              const fy = a * u * u + b * v * v;
              const fz = v;
              const x = Math.round(fx) + cx;
              const y = Math.round(fy) + cy;
              const z = Math.round(fz) + cz;
              const block: Block = { x, y, z, color: opts.color };
              posMap.set(positionKey(block), block);
            }
          }
        } else if (surfaceType === "wave") {
          const range = opts.range ?? 10;
          const amplitude = opts.amplitude!;
          const kx = opts.kx!;
          const kz = opts.kz!;
          for (let i = 0; i <= N; i++) {
            const u = -range + (i / N) * 2 * range;
            for (let j = 0; j <= N; j++) {
              const v = -range + (j / N) * 2 * range;
              const fx = u;
              const fy = amplitude * Math.sin(kx * u) * Math.sin(kz * v);
              const fz = v;
              const x = Math.round(fx) + cx;
              const y = Math.round(fy) + cy;
              const z = Math.round(fz) + cz;
              const block: Block = { x, y, z, color: opts.color };
              posMap.set(positionKey(block), block);
            }
          }
        } else if (surfaceType === "gaussian") {
          const range = opts.range ?? 8;
          const amplitude = opts.amplitude!;
          const sigmaX = opts.sigmaX!;
          const sigmaZ = opts.sigmaZ!;
          for (let i = 0; i <= N; i++) {
            const u = -range + (i / N) * 2 * range;
            for (let j = 0; j <= N; j++) {
              const v = -range + (j / N) * 2 * range;
              const fx = u;
              const fy = amplitude * Math.exp(
                -(u * u / (2 * sigmaX * sigmaX) + v * v / (2 * sigmaZ * sigmaZ))
              );
              const fz = v;
              const x = Math.round(fx) + cx;
              const y = Math.round(fy) + cy;
              const z = Math.round(fz) + cz;
              const block: Block = { x, y, z, color: opts.color };
              posMap.set(positionKey(block), block);
            }
          }
        } else if (surfaceType === "saddle") {
          const range = opts.range ?? 5;
          const a = opts.a!;
          const b = opts.b!;
          for (let i = 0; i <= N; i++) {
            const u = -range + (i / N) * 2 * range;
            for (let j = 0; j <= N; j++) {
              const v = -range + (j / N) * 2 * range;
              const fx = u;
              const fy = a * u * u - b * v * v;
              const fz = v;
              const x = Math.round(fx) + cx;
              const y = Math.round(fy) + cy;
              const z = Math.round(fz) + cz;
              const block: Block = { x, y, z, color: opts.color };
              posMap.set(positionKey(block), block);
            }
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

        // Report the total unique surface block count (posMap size reflects all unique blocks)
        const surfaceBlockCount = posMap.size;

        printData(
          {
            layer,
            type: surfaceType,
            added: surfaceBlockCount,
            center: { x: cx, y: cy, z: cz },
          },
          outputOpts,
          () =>
            `Added surface (${surfaceType}): ${surfaceBlockCount} block(s) at center=(${cx},${cy},${cz}).`
        );
      }
    );
}
