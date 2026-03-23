import { type Command } from "commander";
import {
  computeBounds,
  positionKey,
  type Block,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";
import { generateGableBlocks } from "../lib/primitives.js";

export function registerGable(program: Command): void {
  program
    .command("gable <file>")
    .description("中央が盛り上がる段状の破風・向拝を生成する")
    .requiredOption("--face <face>", "向き (north / south / east / west)")
    .requiredOption("--center <n>", "幅方向の中心座標。偶数幅は .5 を使える", Number)
    .requiredOption("--base <n>", "取り付ける面の基準座標", Number)
    .requiredOption("--y <n>", "開始Y座標", Number)
    .requiredOption("--width <n>", "最下段の幅", Number)
    .requiredOption("--height <n>", "高さ（段数）", Number)
    .requiredOption("--depth <n>", "最下段の張り出し量", Number)
    .requiredOption("--color <#RRGGBB>", "ブロックカラー (#RRGGBB)")
    .option("--shrink <n>", "各段で左右に縮める量", Number, 1)
    .option("--inset <n>", "各段で張り出しを減らす量", Number, 1)
    .option("--layer <layer>", "対象レイヤー (structure または scaffold)", "structure")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          face: string;
          center: number;
          base: number;
          y: number;
          width: number;
          height: number;
          depth: number;
          color: string;
          shrink: number;
          inset: number;
          layer: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (!/^#[0-9A-Fa-f]{6}$/.test(opts.color)) {
          printError(`Invalid color: "${opts.color}". Must be #RRGGBB format.`, outputOpts);
        }

        if (
          opts.face !== "north" &&
          opts.face !== "south" &&
          opts.face !== "east" &&
          opts.face !== "west"
        ) {
          printError(`Invalid face: "${opts.face}". Must be "north", "south", "east", or "west".`, outputOpts);
        }

        if (opts.layer !== "structure" && opts.layer !== "scaffold") {
          printError(`Invalid layer: "${opts.layer}". Must be "structure" or "scaffold".`, outputOpts);
        }

        if (!Number.isInteger(opts.width) || opts.width < 1) {
          printError(`width must be an integer >= 1. Got: ${opts.width}`, outputOpts);
        }

        if (!Number.isInteger(opts.height) || opts.height < 1) {
          printError(`height must be an integer >= 1. Got: ${opts.height}`, outputOpts);
        }

        if (!Number.isInteger(opts.depth) || opts.depth < 1) {
          printError(`depth must be an integer >= 1. Got: ${opts.depth}`, outputOpts);
        }

        if (opts.shrink < 0 || opts.inset < 0) {
          printError("shrink/inset values must be >= 0.", outputOpts);
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

        let blocks: Block[];
        try {
          blocks = generateGableBlocks({
            face: opts.face as "north" | "south" | "east" | "west",
            center: opts.center,
            base: opts.base,
            y: opts.y,
            width: opts.width,
            height: opts.height,
            depth: opts.depth,
            color: opts.color,
            shrink: opts.shrink,
            inset: opts.inset,
          });
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        let added = 0;
        let updated = 0;
        for (const block of blocks) {
          const key = positionKey(block);
          if (!posMap.has(key)) added++;
          else updated++;
          posMap.set(key, block);
        }

        if (layer === "structure") warnNegativeCoords(posMap, prevKeys, layer);

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
            face: opts.face,
            center: opts.center,
            base: opts.base,
            y: opts.y,
            width: opts.width,
            height: opts.height,
            depth: opts.depth,
            shrink: opts.shrink,
            inset: opts.inset,
            added,
            updated,
          },
          outputOpts,
          () =>
            `Added gable: ${added} new + ${updated} updated block(s), face=${opts.face}, width=${opts.width}, height=${opts.height}, depth=${opts.depth}.`
        );
      }
    );
}
