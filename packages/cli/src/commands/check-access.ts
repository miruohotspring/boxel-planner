import { positionKey, type Blueprint, type Vec3 } from "@boxel-planner/schema";
import { type Command } from "commander";
import { summarizeBounds, type BoundsSummary } from "../lib/blueprint.js";
import { readBlueprint } from "../lib/file.js";
import { printError, type OutputOptions } from "../lib/output.js";

export interface AccessCheckResult {
  from: Vec3;
  to: Vec3;
  includeScaffold: boolean;
  margin: number;
  bounds: BoundsSummary;
  pathFound: boolean;
  distance: number | null;
  visited: number;
  reason?: string;
}

function parseVec3(input: string, label: string): Vec3 {
  const parts = input.split(",").map((value) => Number.parseInt(value.trim(), 10));
  if (parts.length !== 3 || parts.some((value) => !Number.isInteger(value))) {
    throw new Error(`Invalid ${label}: "${input}". Use x,y,z with integers.`);
  }

  return { x: parts[0]!, y: parts[1]!, z: parts[2]! };
}

function buildSearchBounds(
  blueprint: Blueprint,
  includeScaffold: boolean,
  from: Vec3,
  to: Vec3,
  margin: number
): BoundsSummary {
  const blocks = includeScaffold
    ? [...blueprint.structure, ...blueprint.scaffold]
    : blueprint.structure;
  const base = summarizeBounds(blocks);

  const minX = Math.min(base?.min.x ?? from.x, from.x, to.x) - margin;
  const minY = Math.min(base?.min.y ?? from.y, from.y, to.y) - margin;
  const minZ = Math.min(base?.min.z ?? from.z, from.z, to.z) - margin;
  const maxX = Math.max(base?.max.x ?? from.x, from.x, to.x) + margin;
  const maxY = Math.max(base?.max.y ?? from.y, from.y, to.y) + margin;
  const maxZ = Math.max(base?.max.z ?? from.z, from.z, to.z) + margin;

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    size: {
      x: maxX - minX + 1,
      y: maxY - minY + 1,
      z: maxZ - minZ + 1,
    },
  };
}

function isWithinBounds(pos: Vec3, bounds: BoundsSummary): boolean {
  return (
    pos.x >= bounds.min.x && pos.x <= bounds.max.x &&
    pos.y >= bounds.min.y && pos.y <= bounds.max.y &&
    pos.z >= bounds.min.z && pos.z <= bounds.max.z
  );
}

export function evaluateAccessPath(
  blueprint: Blueprint,
  from: Vec3,
  to: Vec3,
  opts: {
    includeScaffold?: boolean;
    margin?: number;
  } = {}
): AccessCheckResult {
  const includeScaffold = opts.includeScaffold ?? false;
  const margin = opts.margin ?? 1;
  const occupiedBlocks = includeScaffold
    ? [...blueprint.structure, ...blueprint.scaffold]
    : blueprint.structure;
  const occupied = new Set(occupiedBlocks.map((block) => positionKey(block)));
  const bounds = buildSearchBounds(blueprint, includeScaffold, from, to, margin);

  if (occupied.has(positionKey(from))) {
    return {
      from,
      to,
      includeScaffold,
      margin,
      bounds,
      pathFound: false,
      distance: null,
      visited: 0,
      reason: "start is occupied",
    };
  }

  if (occupied.has(positionKey(to))) {
    return {
      from,
      to,
      includeScaffold,
      margin,
      bounds,
      pathFound: false,
      distance: null,
      visited: 0,
      reason: "goal is occupied",
    };
  }

  const queue: Array<{ pos: Vec3; distance: number }> = [{ pos: from, distance: 0 }];
  const visited = new Set([positionKey(from)]);
  const deltas = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (
      current.pos.x === to.x &&
      current.pos.y === to.y &&
      current.pos.z === to.z
    ) {
      return {
        from,
        to,
        includeScaffold,
        margin,
        bounds,
        pathFound: true,
        distance: current.distance,
        visited: visited.size,
      };
    }

    for (const delta of deltas) {
      const next = {
        x: current.pos.x + delta.x,
        y: current.pos.y + delta.y,
        z: current.pos.z + delta.z,
      };
      const key = positionKey(next);
      if (!isWithinBounds(next, bounds) || occupied.has(key) || visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({ pos: next, distance: current.distance + 1 });
    }
  }

  return {
    from,
    to,
    includeScaffold,
    margin,
    bounds,
    pathFound: false,
    distance: null,
    visited: visited.size,
    reason: "no path found within search bounds",
  };
}

function printAccessResult(result: AccessCheckResult, outputOpts: OutputOptions): never {
  if (outputOpts.json) {
    const payload = { ok: result.pathFound, data: result };
    if (result.pathFound) {
      console.log(JSON.stringify(payload));
    } else {
      console.error(JSON.stringify(payload));
    }
  } else {
    const lines = [
      result.pathFound ? "PASS: path exists" : "FAIL: path blocked",
      `From: (${result.from.x}, ${result.from.y}, ${result.from.z})`,
      `To:   (${result.to.x}, ${result.to.y}, ${result.to.z})`,
      `Bounds: (${result.bounds.min.x}, ${result.bounds.min.y}, ${result.bounds.min.z}) -> (${result.bounds.max.x}, ${result.bounds.max.y}, ${result.bounds.max.z})`,
      `Visited: ${result.visited}`,
      `Distance: ${result.distance ?? "-"}`,
    ];
    if (result.reason) {
      lines.push(`Reason: ${result.reason}`);
    }

    const stream = result.pathFound ? process.stdout : process.stderr;
    stream.write(`${lines.join("\n")}\n`);
  }

  process.exit(result.pathFound ? 0 : 1);
}

export function registerCheckAccess(program: Command): void {
  program
    .command("check-access <file>")
    .description("空間内で指定2点の間に通路があるか検証する")
    .requiredOption("--from <x,y,z>", "開始座標")
    .requiredOption("--to <x,y,z>", "終了座標")
    .option("--margin <n>", "探索範囲の余白", Number, 1)
    .option("--include-scaffold", "足場も通行不可として扱う")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: {
      from: string;
      to: string;
      margin: number;
      includeScaffold?: boolean;
      json?: boolean;
    }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      if (!Number.isInteger(opts.margin) || opts.margin < 0) {
        printError(`Invalid --margin value: "${opts.margin}". Must be an integer >= 0.`, outputOpts);
      }

      let from: Vec3;
      let to: Vec3;
      try {
        from = parseVec3(opts.from, "--from");
        to = parseVec3(opts.to, "--to");
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const result = evaluateAccessPath(blueprint, from, to, {
        includeScaffold: opts.includeScaffold ?? false,
        margin: opts.margin,
      });
      printAccessResult(result, outputOpts);
    });
}
