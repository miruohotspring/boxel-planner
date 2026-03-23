import React, { useState, useCallback, useRef, useEffect } from "react";
import { type Blueprint } from "@boxel-planner/schema";
import { Toolbar } from "./components/Toolbar.tsx";
import { View3D } from "./components/View3D.tsx";
import { View2D } from "./components/View2D.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { useBlueprint } from "./hooks/useBlueprint.ts";
import { useColorPalette } from "./hooks/useColorPalette.ts";
import { importFromText } from "./lib/importExport.ts";

export default function App() {
  const { blueprint, setBlueprint, addBlock, removeBlock } = useBlueprint();
  const { colors, selectedColor, selectColor, addColor, replaceColors } = useColorPalette();

  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [showScaffold, setShowScaffold] = useState(true);
  const [showOutline, setShowOutline] = useState(false);
  const [firstPersonMode, setFirstPersonMode] = useState(false);
  const [currentY, setCurrentY] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleImport(bp: Blueprint) {
    setBlueprint(bp);
    setCurrentY(bp.bounds.min.y);
    setImportError(null);
  }

  useEffect(() => {
    replaceColors(blueprint?.palette?.map((entry) => entry.color) ?? []);
  }, [blueprint, replaceColors]);

  function handleImportError(err: string) {
    setImportError(err);
  }

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((_e: React.DragEvent<HTMLDivElement>) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const file = files.find(
        (f) => f.name.endsWith(".json") || f.name.endsWith(".boxel.json")
      );

      if (!file) {
        setImportError(".json または .boxel.json ファイルをドロップしてください");
        return;
      }

      const text = await file.text();
      const result = importFromText(text);
      if (result.ok) {
        handleImport(result.data);
      } else {
        setImportError(result.error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#0d1117",
        position: "relative",
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ツールバー */}
      <Toolbar
        viewMode={viewMode}
        showScaffold={showScaffold}
        showOutline={showOutline}
        firstPersonMode={firstPersonMode}
        blueprint={blueprint}
        onViewModeChange={setViewMode}
        onToggleScaffold={() => setShowScaffold((v) => !v)}
        onToggleOutline={() => setShowOutline((v) => !v)}
        onToggleFirstPerson={() => setFirstPersonMode((v) => !v)}
        onImport={handleImport}
        onImportError={handleImportError}
        importError={importError}
      />

      {/* メインエリア */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* ビューエリア */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {viewMode === "3d" ? (
            <View3D
              blueprint={blueprint}
              showScaffold={showScaffold}
              showOutline={showOutline}
              firstPersonMode={firstPersonMode}
            />
          ) : (
            <View2D
              blueprint={blueprint}
              currentY={currentY}
              showScaffold={showScaffold}
              selectedColor={selectedColor}
              onAddBlock={addBlock}
              onRemoveBlock={removeBlock}
            />
          )}
        </div>

        {/* サイドバー */}
        <Sidebar
          blueprint={blueprint}
          currentY={currentY}
          colors={colors}
          selectedColor={selectedColor}
          viewMode={viewMode}
          onYChange={setCurrentY}
          onSelectColor={selectColor}
          onAddColor={addColor}
        />
      </div>

      {/* ドラッグ＆ドロップオーバーレイ */}
      {isDragging && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(56, 139, 253, 0.08)",
            border: "2px dashed #388bfd",
            borderRadius: "0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(22, 27, 34, 0.92)",
              border: "1px solid #388bfd",
              borderRadius: "8px",
              padding: "24px 40px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                marginBottom: "8px",
                color: "#388bfd",
              }}
            >
              ⬇
            </div>
            <div style={{ fontSize: "14px", color: "#e6edf3" }}>
              .boxel.json をドロップして開く
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
