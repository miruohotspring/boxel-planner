import { buildPositionMap, positionKey, type Blueprint, type Block } from "@boxel-planner/schema";

export interface LintIssue {
  rule: "wall-thickness" | "color-count";
  severity: "warning";
  message: string;
}

export interface WallThicknessIssue extends LintIssue {
  rule: "wall-thickness";
  observed: number;
  limit: number;
  samples: Array<{
    x: number;
    y: number;
    z: number;
    face: "-x" | "+x" | "-z" | "+z";
    thickness: number;
  }>;
}

export interface ColorCountIssue extends LintIssue {
  rule: "color-count";
  observed: number;
  limit: number;
  source: "palette" | "structure";
}

export interface LintResult {
  issues: Array<WallThicknessIssue | ColorCountIssue>;
}

function countThicknessFromFace(
  occupied: ReadonlyMap<string, Block>,
  start: Block,
  face: "-x" | "+x" | "-z" | "+z"
): number {
  const delta =
    face === "-x" ? { x: 1, z: 0 } :
    face === "+x" ? { x: -1, z: 0 } :
    face === "-z" ? { x: 0, z: 1 } :
    { x: 0, z: -1 };

  let thickness = 0;
  let x = start.x;
  let z = start.z;
  while (occupied.has(positionKey({ x, y: start.y, z }))) {
    thickness++;
    x += delta.x;
    z += delta.z;
  }

  return thickness;
}

export function lintWallThickness(
  blueprint: Blueprint,
  maxWallThickness: number
): WallThicknessIssue | null {
  const occupied = buildPositionMap(blueprint.structure);
  const samples: WallThicknessIssue["samples"] = [];
  let maxObserved = 0;

  const faces: Array<{
    face: "-x" | "+x" | "-z" | "+z";
    neighbor: (block: Block) => { x: number; y: number; z: number };
  }> = [
    { face: "-x", neighbor: (block) => ({ x: block.x - 1, y: block.y, z: block.z }) },
    { face: "+x", neighbor: (block) => ({ x: block.x + 1, y: block.y, z: block.z }) },
    { face: "-z", neighbor: (block) => ({ x: block.x, y: block.y, z: block.z - 1 }) },
    { face: "+z", neighbor: (block) => ({ x: block.x, y: block.y, z: block.z + 1 }) },
  ];

  for (const block of blueprint.structure) {
    for (const { face, neighbor } of faces) {
      if (occupied.has(positionKey(neighbor(block)))) continue;
      const thickness = countThicknessFromFace(occupied, block, face);
      if (thickness <= maxWallThickness) continue;

      if (thickness > maxObserved) {
        maxObserved = thickness;
      }

      if (samples.length < 8) {
        samples.push({
          x: block.x,
          y: block.y,
          z: block.z,
          face,
          thickness,
        });
      }
    }
  }

  if (maxObserved === 0) return null;

  return {
    rule: "wall-thickness",
    severity: "warning",
    observed: maxObserved,
    limit: maxWallThickness,
    samples,
    message:
      `Potential wall thickness ${maxObserved} exceeds recommended max ${maxWallThickness}. ` +
      `Heuristic based on exposed faces; inspect the reported sample coordinates.`,
  };
}

export function lintColorCount(
  blueprint: Blueprint,
  minColors: number
): ColorCountIssue | null {
  const paletteCount = blueprint.palette?.length ?? 0;
  if (paletteCount > 0) {
    if (paletteCount >= minColors) return null;
    return {
      rule: "color-count",
      severity: "warning",
      observed: paletteCount,
      limit: minColors,
      source: "palette",
      message: `Palette has ${paletteCount} color(s); recommended minimum is ${minColors}.`,
    };
  }

  const usedColors = new Set(blueprint.structure.map((block) => block.color.toUpperCase()));
  if (usedColors.size >= minColors) return null;

  return {
    rule: "color-count",
    severity: "warning",
    observed: usedColors.size,
    limit: minColors,
    source: "structure",
    message: `Structure uses ${usedColors.size} color(s); recommended minimum is ${minColors}. Consider defining a palette.`,
  };
}

export function lintBlueprint(
  blueprint: Blueprint,
  opts: {
    maxWallThickness: number;
    minColors: number;
  }
): LintResult {
  const issues: LintResult["issues"] = [];

  const wallIssue = lintWallThickness(blueprint, opts.maxWallThickness);
  if (wallIssue) issues.push(wallIssue);

  const colorIssue = lintColorCount(blueprint, opts.minColors);
  if (colorIssue) issues.push(colorIssue);

  return { issues };
}
