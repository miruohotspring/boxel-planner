import type { Block, Bounds, Vec3 } from "./types.js";

/** 座標を "x,y,z" 形式のキーに変換 */
export function positionKey(pos: Vec3): string {
  return `${pos.x},${pos.y},${pos.z}`;
}

/** blocks の実座標から bounds を計算。空配列のときは null */
export function computeBounds(blocks: Block[]): Bounds | null {
  if (blocks.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const b of blocks) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.z < minZ) minZ = b.z;
    if (b.x > maxX) maxX = b.x;
    if (b.y > maxY) maxY = b.y;
    if (b.z > maxZ) maxZ = b.z;
  }

  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
  };
}

/** 重複座標を検出する。返値は重複している座標キーの配列 */
export function findDuplicatePositions(blocks: Block[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const b of blocks) {
    const key = positionKey(b);
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  }

  return Array.from(duplicates);
}

/** 指定 Y 層のブロックだけを返す（2D ビュー・slice コマンド用） */
export function getSlice(blocks: Block[], y: number): Block[] {
  return blocks.filter((b) => b.y === y);
}

/** blocks を座標キー → Block の Map に変換（O(1) 探索用） */
export function buildPositionMap(blocks: Block[]): Map<string, Block> {
  const map = new Map<string, Block>();
  for (const b of blocks) {
    map.set(positionKey(b), b);
  }
  return map;
}
