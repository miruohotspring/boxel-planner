import { useState, useCallback } from "react";
import {
  type Blueprint,
  type Block,
  computeBounds,
  buildPositionMap,
  positionKey,
} from "@boxel-planner/schema";

export interface UseBlueprintReturn {
  blueprint: Blueprint | null;
  setBlueprint: (bp: Blueprint | null) => void;
  addBlock: (x: number, y: number, z: number, color: string) => void;
  removeBlock: (x: number, y: number, z: number) => void;
}

function rebuildBlueprint(bp: Blueprint, structure: Block[]): Blueprint {
  const bounds = computeBounds(structure) ?? bp.bounds;
  return { ...bp, structure, bounds };
}

export function useBlueprint(): UseBlueprintReturn {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  const addBlock = useCallback(
    (x: number, y: number, z: number, color: string) => {
      setBlueprint((prev) => {
        if (!prev) return prev;

        const posMap = buildPositionMap(prev.structure);
        const key = positionKey({ x, y, z });
        const newBlock: Block = { x, y, z, color };

        let newStructure: Block[];
        if (posMap.has(key)) {
          // 既存ブロックを色更新
          newStructure = prev.structure.map((b) =>
            positionKey(b) === key ? newBlock : b
          );
        } else {
          newStructure = [...prev.structure, newBlock];
        }

        return rebuildBlueprint(prev, newStructure);
      });
    },
    []
  );

  const removeBlock = useCallback(
    (x: number, y: number, z: number) => {
      setBlueprint((prev) => {
        if (!prev) return prev;

        const key = positionKey({ x, y, z });
        const newStructure = prev.structure.filter(
          (b) => positionKey(b) !== key
        );

        return rebuildBlueprint(prev, newStructure);
      });
    },
    []
  );

  return {
    blueprint,
    setBlueprint,
    addBlock,
    removeBlock,
  };
}
