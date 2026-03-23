import { type Blueprint, type Block } from "@boxel-planner/schema";
import { type Command } from "commander";
import { summarizeBounds, type BoundsSummary } from "../lib/blueprint.js";
import { readBlueprint } from "../lib/file.js";
import { printError, type OutputOptions } from "../lib/output.js";

export type CheckTarget = "structure" | "scaffold" | "all";

export interface SizeLimits {
  x?: number;
  y?: number;
  z?: number;
}

export interface SizeCheck {
  axis: "x" | "y" | "z";
  size: number;
  limit: number;
  ok: boolean;
}

export interface SizeCheckResult {
  target: CheckTarget;
  bounds: BoundsSummary | null;
  limits: SizeLimits;
  checks: SizeCheck[];
  passed: boolean;
}

function getBlocksForTarget(blueprint: Blueprint, target: CheckTarget): Block[] {
  switch (target) {
    case "structure":
      return blueprint.structure;
    case "scaffold":
      return blueprint.scaffold;
    case "all":
      return [...blueprint.structure, ...blueprint.scaffold];
  }
}

export function evaluateSizeLimits(
  blueprint: Blueprint,
  target: CheckTarget,
  limits: SizeLimits
): SizeCheckResult {
  const bounds = summarizeBounds(getBlocksForTarget(blueprint, target));
  const size = bounds?.size ?? { x: 0, y: 0, z: 0 };
  const checks: SizeCheck[] = [];

  for (const axis of ["x", "y", "z"] as const) {
    const limit = limits[axis];
    if (limit === undefined) continue;
    checks.push({
      axis,
      size: size[axis],
      limit,
      ok: size[axis] <= limit,
    });
  }

  return {
    target,
    bounds,
    limits,
    checks,
    passed: checks.every((check) => check.ok),
  };
}

function printCheckResult(
  result: SizeCheckResult,
  outputOpts: OutputOptions
): never {
  if (outputOpts.json) {
    const payload = { ok: result.passed, data: result };
    if (result.passed) {
      console.log(JSON.stringify(payload));
    } else {
      console.error(JSON.stringify(payload));
    }
  } else {
    const lines = [
      result.passed ? "PASS: size constraints satisfied" : "FAIL: size constraints violated",
      `Target: ${result.target}`,
    ];

    if (result.bounds) {
      lines.push(
        `Bounds: (${result.bounds.min.x}, ${result.bounds.min.y}, ${result.bounds.min.z}) -> (${result.bounds.max.x}, ${result.bounds.max.y}, ${result.bounds.max.z})`,
        `Size:   ${result.bounds.size.x} x ${result.bounds.size.y} x ${result.bounds.size.z}`
      );
    } else {
      lines.push("Bounds: (empty)", "Size:   0 x 0 x 0");
    }

    for (const check of result.checks) {
      lines.push(
        `${check.axis.toUpperCase()}: ${check.size} <= ${check.limit}  ${check.ok ? "OK" : "NG"}`
      );
    }

    const stream = result.passed ? process.stdout : process.stderr;
    stream.write(`${lines.join("\n")}\n`);
  }

  process.exit(result.passed ? 0 : 1);
}

export function registerCheck(program: Command): void {
  program
    .command("check <file>")
    .description("設計図がサイズ制約を満たすか検証する")
    .option("--target <layer>", "判定対象: structure | scaffold | all", "structure")
    .option("--max-x <n>", "X方向サイズの上限", Number)
    .option("--max-y <n>", "Y方向サイズの上限", Number)
    .option("--max-z <n>", "Z方向サイズの上限", Number)
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: {
      target?: string;
      maxX?: number;
      maxY?: number;
      maxZ?: number;
      json?: boolean;
    }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      const target = (opts.target ?? "structure") as CheckTarget;
      if (!["structure", "scaffold", "all"].includes(target)) {
        printError(`Invalid target: "${opts.target}". Must be "structure", "scaffold", or "all".`, outputOpts);
      }

      const limits: SizeLimits = {
        ...(opts.maxX !== undefined ? { x: opts.maxX } : {}),
        ...(opts.maxY !== undefined ? { y: opts.maxY } : {}),
        ...(opts.maxZ !== undefined ? { z: opts.maxZ } : {}),
      };
      if (Object.keys(limits).length === 0) {
        printError("At least one of --max-x, --max-y, or --max-z is required.", outputOpts);
      }

      for (const [axis, limit] of Object.entries(limits)) {
        if (!Number.isInteger(limit) || limit < 0) {
          printError(`Invalid --max-${axis} value: "${limit}". Must be an integer >= 0.`, outputOpts);
        }
      }

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const result = evaluateSizeLimits(blueprint, target, limits);
      printCheckResult(result, outputOpts);
    });
}
