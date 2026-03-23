import { type Command } from "commander";
import {
  positionKey,
  type Blueprint,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, warnNegativeCoords, type OutputOptions } from "../lib/output.js";
import {
  placeBlueprintIntoTarget,
  placeBlueprintRepeatedly,
  PlacementCollisionError,
  type PlacementCollisionMode,
  type PlacementInclude,
  type PlacementMirrorAxis,
  type RotationY,
} from "../lib/blueprint.js";

export function registerPlace(program: Command): void {
  program
    .command("place <file>")
    .description("別の設計図をローカル原点 (0,0,0) 基準で配置する")
    .requiredOption("--source <file>", "配置元の .boxel.json")
    .requiredOption("--x <n>", "source の原点を置く target 側 X座標", Number)
    .requiredOption("--y <n>", "source の原点を置く target 側 Y座標", Number)
    .requiredOption("--z <n>", "source の原点を置く target 側 Z座標", Number)
    .option("--repeat <n>", "配置回数（開始位置を含む）", Number, 1)
    .option("--step-x <n>", "反復時の X 間隔", Number, 0)
    .option("--step-y <n>", "反復時の Y 間隔", Number, 0)
    .option("--step-z <n>", "反復時の Z 間隔", Number, 0)
    .option("--include <include>", "配置対象 (structure / scaffold / all)", "all")
    .option("--collision <mode>", "衝突時の解決 (ours / theirs / error)", "error")
    .option("--rotate-y <deg>", "Y軸回転 (0 / 90 / 180 / 270)", Number, 0)
    .option("--mirror <axis>", "ローカル原点基準で反転 (x / z)")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: {
          source: string;
          x: number;
          y: number;
          z: number;
          repeat: number;
          stepX: number;
          stepY: number;
          stepZ: number;
          include: string;
          collision: string;
          rotateY: number;
          mirror?: string;
          json?: boolean;
        }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        if (!Number.isInteger(opts.repeat) || opts.repeat < 1) {
          printError(`Invalid repeat: "${opts.repeat}". Must be an integer >= 1.`, outputOpts);
        }

        if (
          opts.repeat > 1 &&
          opts.stepX === 0 &&
          opts.stepY === 0 &&
          opts.stepZ === 0
        ) {
          printError(
            "repeat > 1 requires at least one of --step-x, --step-y, or --step-z to be non-zero.",
            outputOpts
          );
        }

        if (
          opts.include !== "structure" &&
          opts.include !== "scaffold" &&
          opts.include !== "all"
        ) {
          printError(
            `Invalid include: "${opts.include}". Must be "structure", "scaffold", or "all".`,
            outputOpts
          );
        }

        if (
          opts.collision !== "ours" &&
          opts.collision !== "theirs" &&
          opts.collision !== "error"
        ) {
          printError(
            `Invalid collision mode: "${opts.collision}". Must be "ours", "theirs", or "error".`,
            outputOpts
          );
        }

        if (opts.rotateY !== 0 && opts.rotateY !== 90 && opts.rotateY !== 180 && opts.rotateY !== 270) {
          printError(
            `Invalid rotate-y: "${opts.rotateY}". Must be 0, 90, 180, or 270.`,
            outputOpts
          );
        }

        if (opts.mirror !== undefined && opts.mirror !== "x" && opts.mirror !== "z") {
          printError(
            `Invalid mirror axis: "${opts.mirror}". Must be "x" or "z".`,
            outputOpts
          );
        }

        let target: Blueprint;
        let source: Blueprint;
        try {
          target = readBlueprint(file);
          source = readBlueprint(opts.source);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const prevStructureKeys = new Set(target.structure.map((block) => positionKey(block)));

        let result;
        try {
          result = opts.repeat === 1
            ? placeBlueprintIntoTarget(target, source, {
              at: { x: opts.x, y: opts.y, z: opts.z },
              include: opts.include as PlacementInclude,
              collision: opts.collision as PlacementCollisionMode,
              rotateY: opts.rotateY as RotationY,
              ...(opts.mirror !== undefined
                ? { mirror: opts.mirror as PlacementMirrorAxis }
                : {}),
            })
            : placeBlueprintRepeatedly(target, source, {
              at: { x: opts.x, y: opts.y, z: opts.z },
              step: { x: opts.stepX, y: opts.stepY, z: opts.stepZ },
              repeat: opts.repeat,
              include: opts.include as PlacementInclude,
              collision: opts.collision as PlacementCollisionMode,
              rotateY: opts.rotateY as RotationY,
              ...(opts.mirror !== undefined
                ? { mirror: opts.mirror as PlacementMirrorAxis }
                : {}),
            });
        } catch (e) {
          if (e instanceof PlacementCollisionError) {
            if (outputOpts.json) {
              console.error(
                JSON.stringify({
                  ok: false,
                  error: e.message,
                  collisionCount: e.totalCollisions,
                  collisions: e.collisions,
                })
              );
              process.exit(1);
            }
            printError(e.message, outputOpts);
          }
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        warnNegativeCoords(
          new Map(result.blueprint.structure.map((block) => [positionKey(block), block])),
          prevStructureKeys,
          "structure"
        );

        try {
          writeBlueprint(file, result.blueprint);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        printData(
          {
            source: opts.source,
            target: file,
            at: { x: opts.x, y: opts.y, z: opts.z },
            repeat: opts.repeat,
            ...(opts.repeat > 1
              ? { step: { x: opts.stepX, y: opts.stepY, z: opts.stepZ } }
              : {}),
            include: opts.include,
            collision: opts.collision,
            rotateY: opts.rotateY,
            ...(opts.mirror !== undefined ? { mirror: opts.mirror } : {}),
            ...result.stats,
          },
          outputOpts,
          () =>
            `Placed "${opts.source}" into "${file}" at (${opts.x}, ${opts.y}, ${opts.z}) repeat=${opts.repeat} include=${opts.include} collision=${opts.collision} rotateY=${opts.rotateY}${opts.mirror ? ` mirror=${opts.mirror}` : ""}${opts.repeat > 1 ? ` step=(${opts.stepX}, ${opts.stepY}, ${opts.stepZ})` : ""}.`
        );
      }
    );
}
