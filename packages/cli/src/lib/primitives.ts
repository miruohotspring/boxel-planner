import { positionKey, type Block } from "@boxel-planner/schema";

export interface RoofOptions {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  y: number;
  layers: number;
  color: string;
  overhangX: number;
  overhangZ: number;
  shrinkX: number;
  shrinkZ: number;
}

export interface GableOptions {
  face: "north" | "south" | "east" | "west";
  center: number;
  base: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  shrink: number;
  inset: number;
}

function pushUnique(blocks: Map<string, Block>, block: Block): void {
  blocks.set(positionKey(block), block);
}

export function generateRoofBlocks(opts: RoofOptions): Block[] {
  const minX = Math.min(opts.x1, opts.x2);
  const maxX = Math.max(opts.x1, opts.x2);
  const minZ = Math.min(opts.z1, opts.z2);
  const maxZ = Math.max(opts.z1, opts.z2);
  const blocks = new Map<string, Block>();

  for (let layer = 0; layer < opts.layers; layer++) {
    const layerMinX = minX - opts.overhangX + opts.shrinkX * layer;
    const layerMaxX = maxX + opts.overhangX - opts.shrinkX * layer;
    const layerMinZ = minZ - opts.overhangZ + opts.shrinkZ * layer;
    const layerMaxZ = maxZ + opts.overhangZ - opts.shrinkZ * layer;

    if (layerMinX > layerMaxX || layerMinZ > layerMaxZ) break;

    for (let x = layerMinX; x <= layerMaxX; x++) {
      for (let z = layerMinZ; z <= layerMaxZ; z++) {
        pushUnique(blocks, { x, y: opts.y + layer, z, color: opts.color });
      }
    }
  }

  return Array.from(blocks.values());
}

function getCenteredRange(center: number, width: number): { start: number; end: number } {
  const start = center - (width - 1) / 2;
  const end = center + (width - 1) / 2;

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error(
      `center=${center} and width=${width} produced non-integer range (${start}, ${end}). Use a .5 center for even widths.`
    );
  }

  return { start, end };
}

export function generateGableBlocks(opts: GableOptions): Block[] {
  const blocks = new Map<string, Block>();

  for (let layer = 0; layer < opts.height; layer++) {
    const width = opts.width - opts.shrink * 2 * layer;
    if (width < 1) break;

    const depth = Math.max(1, opts.depth - opts.inset * layer);
    const horizontal = getCenteredRange(opts.center, width);
    const y = opts.y + layer;

    switch (opts.face) {
      case "north": {
        for (let x = horizontal.start; x <= horizontal.end; x++) {
          for (let z = opts.base - depth + 1; z <= opts.base; z++) {
            pushUnique(blocks, { x, y, z, color: opts.color });
          }
        }
        break;
      }
      case "south": {
        for (let x = horizontal.start; x <= horizontal.end; x++) {
          for (let z = opts.base; z < opts.base + depth; z++) {
            pushUnique(blocks, { x, y, z, color: opts.color });
          }
        }
        break;
      }
      case "west": {
        for (let z = horizontal.start; z <= horizontal.end; z++) {
          for (let x = opts.base - depth + 1; x <= opts.base; x++) {
            pushUnique(blocks, { x, y, z, color: opts.color });
          }
        }
        break;
      }
      case "east": {
        for (let z = horizontal.start; z <= horizontal.end; z++) {
          for (let x = opts.base; x < opts.base + depth; x++) {
            pushUnique(blocks, { x, y, z, color: opts.color });
          }
        }
        break;
      }
    }
  }

  return Array.from(blocks.values());
}
