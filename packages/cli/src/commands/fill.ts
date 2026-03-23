import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";


export function registerFill(program: Command): void {
  program
    .command("fill <file>")
    .description("指定範囲をブロックで埋める")
    .requiredOption("--x1 <n>", "開始X座標", Number)
    .requiredOption("--y1 <n>", "開始Y座標", Number)
    .requiredOption("--z1 <n>", "開始Z座標", Number)
    .requiredOption("--x2 <n>", "終了X座標", Number)
    .requiredOption("--y2 <n>", "終了Y座標", Number)
    .requiredOption("--z2 <n>", "終了Z座標", Number)
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--hollow", "外周のみ埋める（中空）")
    .option("--no-cap", "--hollow 使用時にY方向の上下面を塞がない（壁のみ生成）")
    .option("--step-x <n>", "X方向ストライプ: 配置するブロック数", Number)
    .option("--gap-x <n>", "X方向ストライプ: 空けるブロック数（--step-x と併用）", Number)
    .option("--step-z <n>", "Z方向ストライプ: 配置するブロック数", Number)
    .option("--gap-z <n>", "Z方向ストライプ: 空けるブロック数（--step-z と併用）", Number)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--dry-run", "ファイルを変更せず、追加されるブロック数を出力する")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          x1: number;
          y1: number;
          z1: number;
          x2: number;
          y2: number;
          z2: number;
          color: string;
          hollow?: boolean;
          cap?: boolean; // commander: --no-cap → cap=false, デフォルト true
          stepX?: number;
          gapX?: number;
          stepZ?: number;
          gapZ?: number;
          layer: string;
          dryRun?: boolean;
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

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const minX = Math.min(opts.x1, opts.x2);
        const maxX = Math.max(opts.x1, opts.x2);
        const minY = Math.min(opts.y1, opts.y2);
        const maxY = Math.max(opts.y1, opts.y2);
        const minZ = Math.min(opts.z1, opts.z2);
        const maxZ = Math.max(opts.z1, opts.z2);

        const layer = opts.layer as "structure" | "scaffold";
        const existingBlocks = [...blueprint[layer]];
        // 位置マップを構築（既存ブロックを上書き可能にする）
        const posMap = new Map<string, Block>();
        for (const b of existingBlocks) {
          posMap.set(positionKey(b), b);
        }

        let added = 0;
        let updated = 0;
        for (let x = minX; x <= maxX; x++) {
          // X方向ストライプフィルター
          if (opts.stepX !== undefined && opts.gapX !== undefined) {
            const period = opts.stepX + opts.gapX;
            if (period > 0 && (x - minX) % period >= opts.stepX) continue;
          }
          for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
              // Z方向ストライプフィルター
              if (opts.stepZ !== undefined && opts.gapZ !== undefined) {
                const period = opts.stepZ + opts.gapZ;
                if (period > 0 && (z - minZ) % period >= opts.stepZ) continue;
              }
              if (opts.hollow) {
                const onSide = x === minX || x === maxX || z === minZ || z === maxZ;
                const onCap = y === minY || y === maxY;
                // --no-cap: opts.cap===false のとき側面のみ（Y上下面を除外）
                const noCap = opts.cap === false;
                if (noCap ? !onSide : (!onSide && !onCap)) continue;
              }
              const block: Block = { x, y, z, color: opts.color };
              const key = positionKey(block);
              if (!posMap.has(key)) added++;
              else updated++;
              posMap.set(key, block);
            }
          }
        }

        const hollowLabel = opts.hollow
          ? opts.cap === false ? " [hollow, no-cap]" : " [hollow]"
          : "";
        const rangeLabel = `(${minX},${minY},${minZ})→(${maxX},${maxY},${maxZ})`;

        if (opts.dryRun) {
          // dry-run: ファイルへの書き込みをしない
          printData(
            {
              ok: true,
              dryRun: true,
              added,
              updated,
              layer,
              range: { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } },
              hollow: opts.hollow ?? false,
              noCap: opts.cap === false,
            },
            outputOpts,
            () =>
              `[dry-run] Would add ${added} new + update ${updated} existing block(s) in ${layer} ${rangeLabel}${hollowLabel}.`
          );
          return;
        }

        const newBlocks = Array.from(posMap.values());

        const updatedLayer = layer === "structure"
          ? { structure: newBlocks, scaffold: blueprint.scaffold }
          : { structure: blueprint.structure, scaffold: newBlocks };

        const allUpdated = [...updatedLayer.structure, ...updatedLayer.scaffold];
        const newBounds = computeBounds(allUpdated) ?? blueprint.bounds;

        const updatedBlueprint: Blueprint = {
          ...blueprint,
          ...updatedLayer,
          bounds: newBounds,
        };

        try {
          writeBlueprint(file, updatedBlueprint);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        printData(
          {
            layer,
            range: { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } },
            hollow: opts.hollow ?? false,
            noCap: opts.cap === false,
            added,
            updated,
          },
          outputOpts,
          () =>
            `Filled ${added} new + ${updated} updated block(s) in ${layer} from (${minX},${minY},${minZ}) to (${maxX},${maxY},${maxZ})${hollowLabel}.`
        );
      }
    );
}
