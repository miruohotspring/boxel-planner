import React, { useRef, useEffect, useCallback } from "react";
import { type Blueprint, getSlice, buildPositionMap } from "@boxel-planner/schema";

interface View2DProps {
  blueprint: Blueprint | null;
  currentY: number;
  showScaffold: boolean;
  selectedColor: string;
  onAddBlock: (x: number, y: number, z: number, color: string) => void;
  onRemoveBlock: (x: number, y: number, z: number) => void;
}

const CELL_SIZE = 24;
const GRID_PADDING = 40;

function getGridRange(blueprint: Blueprint) {
  const { bounds } = blueprint;
  // +1 の余白を持たせる
  const minX = bounds.min.x - 1;
  const maxX = bounds.max.x + 1;
  const minZ = bounds.min.z - 1;
  const maxZ = bounds.max.z + 1;
  return { minX, maxX, minZ, maxZ };
}

export function View2D({
  blueprint,
  currentY,
  showScaffold,
  selectedColor,
  onAddBlock,
  onRemoveBlock,
}: View2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // 背景クリア
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    if (!blueprint) {
      ctx.fillStyle = "#8b949e";
      ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        ".boxel.json を Import して表示",
        W / 2,
        H / 2
      );
      return;
    }

    const { minX, maxX, minZ, maxZ } = getGridRange(blueprint);
    const cols = maxX - minX + 1;
    const rows = maxZ - minZ + 1;

    // セルサイズを動的に算出（キャンバスに収まるよう）
    const availW = W - GRID_PADDING * 2;
    const availH = H - GRID_PADDING * 2;
    const cellSize = Math.min(
      CELL_SIZE,
      Math.floor(availW / cols),
      Math.floor(availH / rows)
    );

    const offsetX = GRID_PADDING;
    const offsetY = GRID_PADDING;

    // 現在のY層のブロック
    const sliceBlocks = getSlice(blueprint.structure, currentY);
    const posMap = buildPositionMap(sliceBlocks);
    const scaffoldSlice = showScaffold ? getSlice(blueprint.scaffold, currentY) : [];
    const scaffoldMap = buildPositionMap(scaffoldSlice);

    // グリッド線
    ctx.strokeStyle = "#21262d";
    ctx.lineWidth = 1;
    for (let col = 0; col <= cols; col++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + col * cellSize, offsetY);
      ctx.lineTo(offsetX + col * cellSize, offsetY + rows * cellSize);
      ctx.stroke();
    }
    for (let row = 0; row <= rows; row++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + row * cellSize);
      ctx.lineTo(offsetX + cols * cellSize, offsetY + row * cellSize);
      ctx.stroke();
    }

    // ブロック
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const x = minX + col;
        const z = minZ + row;
        const key = `${x},${currentY},${z}`;
        const block = posMap.get(key);
        const scaffoldBlock = scaffoldMap.get(key);

        if (block) {
          // 本体ブロック
          ctx.fillStyle = block.color;
          ctx.fillRect(
            offsetX + col * cellSize + 1,
            offsetY + row * cellSize + 1,
            cellSize - 2,
            cellSize - 2
          );
        } else if (scaffoldBlock) {
          // 足場ブロック：色 + 黄色枠線
          ctx.fillStyle = scaffoldBlock.color;
          ctx.fillRect(
            offsetX + col * cellSize + 1,
            offsetY + row * cellSize + 1,
            cellSize - 2,
            cellSize - 2
          );
          ctx.strokeStyle = "#FFD700";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            offsetX + col * cellSize + 1,
            offsetY + row * cellSize + 1,
            cellSize - 2,
            cellSize - 2
          );
        }
      }
    }

    // 座標ラベル（X軸）
    ctx.fillStyle = "#6e7681";
    ctx.font = `${Math.max(9, Math.min(11, cellSize - 6))}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    for (let col = 0; col < cols; col += Math.max(1, Math.floor(cols / 10))) {
      const x = minX + col;
      ctx.fillText(
        String(x),
        offsetX + col * cellSize + cellSize / 2,
        offsetY - 6
      );
    }

    // 座標ラベル（Z軸）
    ctx.textAlign = "right";
    for (let row = 0; row < rows; row += Math.max(1, Math.floor(rows / 10))) {
      const z = minZ + row;
      ctx.fillText(
        String(z),
        offsetX - 6,
        offsetY + row * cellSize + cellSize / 2 + 4
      );
    }

    // Y層インジケータ
    ctx.fillStyle = "#388bfd";
    ctx.textAlign = "left";
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Y = ${currentY}`, 8, 16);
    ctx.fillStyle = "#6e7681";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`blocks: ${sliceBlocks.length}`, 8, 30);
  }, [blueprint, currentY, showScaffold]);

  // リサイズ時にキャンバスサイズを更新
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        draw();
      }
    });
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    // 初期描画
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    draw();

    return () => observer.disconnect();
  }, [draw]);

  // データ変化時に再描画
  useEffect(() => {
    draw();
  }, [draw]);

  function canvasToGrid(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!blueprint) return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const { minX, maxX, minZ, maxZ } = getGridRange(blueprint);
    const cols = maxX - minX + 1;
    const rows = maxZ - minZ + 1;
    const availW = canvas.width - GRID_PADDING * 2;
    const availH = canvas.height - GRID_PADDING * 2;
    const cellSize = Math.min(
      CELL_SIZE,
      Math.floor(availW / cols),
      Math.floor(availH / rows)
    );

    const col = Math.floor((px - GRID_PADDING) / cellSize);
    const row = Math.floor((py - GRID_PADDING) / cellSize);

    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;

    return {
      x: minX + col,
      y: currentY,
      z: minZ + row,
    };
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button !== 0) return;
    const pos = canvasToGrid(e);
    if (!pos) return;
    onAddBlock(pos.x, pos.y, pos.z, selectedColor);
  }

  function handleContextMenu(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const pos = canvasToGrid(e);
    if (!pos) return;
    onRemoveBlock(pos.x, pos.y, pos.z);
  }

  // 空の状態のデフォルト表示
  if (!blueprint) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0d1117",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%" }}
          onClick={handleClick}
          onContextMenu={handleContextMenu}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0d1117",
        position: "relative",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair" }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
      {/* 操作ヒント */}
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          right: "8px",
          background: "rgba(22, 27, 34, 0.85)",
          border: "1px solid #30363d",
          borderRadius: "4px",
          padding: "4px 10px",
          fontSize: "11px",
          color: "#6e7681",
          pointerEvents: "none",
          lineHeight: "1.6",
        }}
      >
        <div>左クリック: ブロック配置</div>
        <div>右クリック: ブロック削除</div>
      </div>
    </div>
  );
}
