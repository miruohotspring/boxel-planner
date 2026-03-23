import {
  positionKey,
  computeBounds,
  type Block,
  type Bounds,
  type Blueprint,
} from "@boxel-planner/schema";

export interface Range3D {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface BoundsSummary {
  min: Bounds["min"];
  max: Bounds["max"];
  size: { x: number; y: number; z: number };
}

export type MirrorAxis = "x" | "y" | "z";
export type PlacementInclude = "structure" | "scaffold" | "all";
export type PlacementCollisionMode = "ours" | "theirs" | "error";
export type PlacementMirrorAxis = "x" | "z";
export type RotationY = 0 | 90 | 180 | 270;

export interface PlacementStats {
  placedStructure: number;
  placedScaffold: number;
  collisions: number;
  skipped: number;
}

export interface PlacementResult {
  blueprint: Blueprint;
  stats: PlacementStats;
}

export function normalizeRange(range: {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
}): Range3D {
  return {
    min: {
      x: Math.min(range.x1, range.x2),
      y: Math.min(range.y1, range.y2),
      z: Math.min(range.z1, range.z2),
    },
    max: {
      x: Math.max(range.x1, range.x2),
      y: Math.max(range.y1, range.y2),
      z: Math.max(range.z1, range.z2),
    },
  };
}

export function isBlockInRange(block: Pick<Block, "x" | "y" | "z">, range: Range3D): boolean {
  return (
    block.x >= range.min.x && block.x <= range.max.x &&
    block.y >= range.min.y && block.y <= range.max.y &&
    block.z >= range.min.z && block.z <= range.max.z
  );
}

export function translateBlock(
  block: Block,
  delta: { dx: number; dy: number; dz: number }
): Block {
  return {
    ...block,
    x: block.x + delta.dx,
    y: block.y + delta.dy,
    z: block.z + delta.dz,
  };
}

export function collectTranslatedPlacements(
  blocks: Block[],
  delta: { dx: number; dy: number; dz: number },
  repeat: number
): Map<string, Block> {
  const placements = new Map<string, Block>();

  for (let i = 1; i <= repeat; i++) {
    const step = { dx: delta.dx * i, dy: delta.dy * i, dz: delta.dz * i };
    for (const block of blocks) {
      const translated = translateBlock(block, step);
      placements.set(`${translated.x},${translated.y},${translated.z}`, translated);
    }
  }

  return placements;
}

export function mirrorBlock(block: Block, axis: MirrorAxis, origin: number): Block {
  const mirrored = {
    ...block,
    x: block.x,
    y: block.y,
    z: block.z,
  };

  const reflected = origin * 2 - block[axis];
  if (!Number.isInteger(reflected)) {
    throw new Error(
      `Mirroring ${axis}=${block[axis]} around origin=${origin} produced non-integer coordinate ${reflected}.`
    );
  }

  mirrored[axis] = reflected;
  return mirrored;
}

export function collectMirroredPlacements(
  blocks: Block[],
  axis: MirrorAxis,
  origin: number
): Map<string, Block> {
  const placements = new Map<string, Block>();

  for (const block of blocks) {
    const mirrored = mirrorBlock(block, axis, origin);
    placements.set(`${mirrored.x},${mirrored.y},${mirrored.z}`, mirrored);
  }

  return placements;
}

export function summarizeBounds(blocks: Block[]): BoundsSummary | null {
  const bounds = computeBounds(blocks);
  if (!bounds) return null;

  return {
    min: bounds.min,
    max: bounds.max,
    size: {
      x: bounds.max.x - bounds.min.x + 1,
      y: bounds.max.y - bounds.min.y + 1,
      z: bounds.max.z - bounds.min.z + 1,
    },
  };
}

export function mirrorBlockForPlacement(
  block: Block,
  axis?: PlacementMirrorAxis
): Block {
  if (!axis) return { ...block };

  if (axis === "x") {
    return { ...block, x: -block.x };
  }

  return { ...block, z: -block.z };
}

export function rotateBlockY(
  block: Block,
  rotation: RotationY
): Block {
  switch (rotation) {
    case 0:
      return { ...block };
    case 90:
      return { ...block, x: -block.z, z: block.x };
    case 180:
      return { ...block, x: -block.x, z: -block.z };
    case 270:
      return { ...block, x: block.z, z: -block.x };
  }
}

export function transformBlockForPlacement(
  block: Block,
  opts: {
    mirror?: PlacementMirrorAxis;
    rotateY: RotationY;
    offset: { x: number; y: number; z: number };
  }
): Block {
  const mirrored = mirrorBlockForPlacement(block, opts.mirror);
  const rotated = rotateBlockY(mirrored, opts.rotateY);

  return {
    ...rotated,
    x: rotated.x + opts.offset.x,
    y: rotated.y + opts.offset.y,
    z: rotated.z + opts.offset.z,
  };
}

export function translateBlueprint(
  blueprint: Blueprint,
  offset: { x: number; y: number; z: number },
  include: PlacementInclude,
  transform?: {
    mirror?: PlacementMirrorAxis;
    rotateY?: RotationY;
  }
): { structure: Block[]; scaffold: Block[] } {
  const rotateY = transform?.rotateY ?? 0;
  const transformOpts = {
    rotateY,
    offset,
    ...(transform?.mirror !== undefined ? { mirror: transform.mirror } : {}),
  };
  const mapBlock = (block: Block): Block =>
    transformBlockForPlacement(block, transformOpts);

  return {
    structure: include === "structure" || include === "all"
      ? blueprint.structure.map(mapBlock)
      : [],
    scaffold: include === "scaffold" || include === "all"
      ? blueprint.scaffold.map(mapBlock)
      : [],
  };
}

function ensureNoCrossLayerOverlap(structure: Block[], scaffold: Block[]): void {
  const structureKeys = new Set(structure.map((block) => positionKey(block)));
  for (const block of scaffold) {
    const key = positionKey(block);
    if (structureKeys.has(key)) {
      throw new Error(`Source placement would overlap structure and scaffold at ${key}.`);
    }
  }
}

function cloneLayerMap(blocks: Block[]): Map<string, Block> {
  const map = new Map<string, Block>();
  for (const block of blocks) {
    map.set(positionKey(block), block);
  }
  return map;
}

function buildCombinedOccupancy(
  structure: Map<string, Block>,
  scaffold: Map<string, Block>
): Set<string> {
  const occupied = new Set<string>();
  for (const key of structure.keys()) occupied.add(key);
  for (const key of scaffold.keys()) occupied.add(key);
  return occupied;
}

export function placeBlueprintIntoTarget(
  target: Blueprint,
  source: Blueprint,
  opts: {
    at: { x: number; y: number; z: number };
    include: PlacementInclude;
    collision: PlacementCollisionMode;
    mirror?: PlacementMirrorAxis;
    rotateY?: RotationY;
  }
): PlacementResult {
  const translated = translateBlueprint(source, opts.at, opts.include, {
    rotateY: opts.rotateY ?? 0,
    ...(opts.mirror !== undefined ? { mirror: opts.mirror } : {}),
  });
  ensureNoCrossLayerOverlap(translated.structure, translated.scaffold);

  const targetStructure = cloneLayerMap(target.structure);
  const targetScaffold = cloneLayerMap(target.scaffold);
  const targetOccupied = buildCombinedOccupancy(targetStructure, targetScaffold);

  const placedStructure = cloneLayerMap(translated.structure);
  const placedScaffold = cloneLayerMap(translated.scaffold);
  const placedOccupied = buildCombinedOccupancy(placedStructure, placedScaffold);

  let collisions = 0;
  for (const key of placedOccupied) {
    if (targetOccupied.has(key)) collisions++;
  }

  if (collisions > 0 && opts.collision === "error") {
    throw new Error(`Placement collision detected at ${collisions} position(s).`);
  }

  let skipped = 0;

  if (opts.collision === "ours") {
    for (const key of placedOccupied) {
      if (!targetOccupied.has(key)) continue;
      if (placedStructure.delete(key)) skipped++;
      if (placedScaffold.delete(key)) skipped++;
    }
  }

  if (opts.collision === "theirs") {
    for (const key of placedOccupied) {
      if (!targetOccupied.has(key)) continue;
      targetStructure.delete(key);
      targetScaffold.delete(key);
    }
  }

  for (const [key, block] of placedStructure) {
    targetStructure.set(key, block);
  }
  for (const [key, block] of placedScaffold) {
    targetScaffold.set(key, block);
  }

  const structure = Array.from(targetStructure.values());
  const scaffold = Array.from(targetScaffold.values());
  const bounds = computeBounds([...structure, ...scaffold]) ?? target.bounds;

  return {
    blueprint: {
      ...target,
      structure,
      scaffold,
      bounds,
    },
    stats: {
      placedStructure: placedStructure.size,
      placedScaffold: placedScaffold.size,
      collisions,
      skipped,
    },
  };
}
