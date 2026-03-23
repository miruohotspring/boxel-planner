import React, { useRef } from "react";
import { type Blueprint } from "@boxel-planner/schema";
import { importFromFile, exportBlueprint } from "../lib/importExport.ts";

interface ToolbarProps {
  viewMode: "3d" | "2d";
  showScaffold: boolean;
  blueprint: Blueprint | null;
  onViewModeChange: (mode: "3d" | "2d") => void;
  onToggleScaffold: () => void;
  onImport: (bp: Blueprint) => void;
  onImportError: (err: string) => void;
  importError: string | null;
}

export function Toolbar({
  viewMode,
  showScaffold,
  blueprint,
  onViewModeChange,
  onToggleScaffold,
  onImport,
  onImportError,
  importError,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importFromFile(file);
    if (result.ok) {
      onImport(result.data);
      onImportError("");
    } else {
      onImportError(result.error);
    }
    e.target.value = "";
  }

  function handleExport() {
    if (!blueprint) return;
    exportBlueprint(blueprint);
  }

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    fontSize: "13px",
    border: "1px solid #30363d",
    borderRadius: "6px",
    cursor: "pointer",
    background: "#21262d",
    color: "#e6edf3",
    lineHeight: "1.5",
    transition: "border-color 0.1s, background 0.1s",
    whiteSpace: "nowrap",
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    background: "#1f6feb",
    borderColor: "#388bfd",
    color: "#ffffff",
  };

  const btnActive: React.CSSProperties = {
    ...btnBase,
    background: "#388bfd",
    borderColor: "#58a6ff",
    color: "#ffffff",
  };

  const btnDisabled: React.CSSProperties = {
    ...btnBase,
    opacity: 0.5,
    cursor: "not-allowed",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        borderBottom: "1px solid #30363d",
        background: "#161b22",
        flexWrap: "wrap",
        minHeight: "40px",
      }}
    >
      {/* ブランド */}
      <span
        style={{
          fontWeight: 600,
          fontSize: "13px",
          color: "#e6edf3",
          marginRight: "4px",
          letterSpacing: "-0.01em",
        }}
      >
        Boxel Planner
      </span>

      <div
        style={{
          width: "1px",
          height: "16px",
          background: "#30363d",
          margin: "0 4px",
        }}
      />

      {/* Import */}
      <button
        style={btnBase}
        onClick={() => fileInputRef.current?.click()}
        title="Import .boxel.json"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.boxel.json"
        style={{ display: "none" }}
        onChange={handleFileSelect}
      />

      {/* Export */}
      <button
        style={blueprint ? btnPrimary : btnDisabled}
        onClick={handleExport}
        disabled={!blueprint}
        title="Export .boxel.json"
      >
        Export
      </button>

      <div
        style={{
          width: "1px",
          height: "16px",
          background: "#30363d",
          margin: "0 4px",
        }}
      />

      {/* View mode */}
      <div style={{ display: "flex", border: "1px solid #30363d", borderRadius: "6px", overflow: "hidden" }}>
        <button
          style={{
            ...btnBase,
            border: "none",
            borderRadius: 0,
            background: viewMode === "3d" ? "#2d333b" : "transparent",
            borderRight: "1px solid #30363d",
          }}
          onClick={() => onViewModeChange("3d")}
        >
          3D
        </button>
        <button
          style={{
            ...btnBase,
            border: "none",
            borderRadius: 0,
            background: viewMode === "2d" ? "#2d333b" : "transparent",
          }}
          onClick={() => onViewModeChange("2d")}
        >
          2D
        </button>
      </div>

      {/* Scaffold toggle */}
      <button
        style={showScaffold ? btnActive : btnBase}
        onClick={onToggleScaffold}
        title="足場の表示切替"
      >
        足場: {showScaffold ? "ON" : "OFF"}
      </button>

      {/* Error message */}
      {importError && (
        <span
          style={{
            fontSize: "12px",
            color: "#f85149",
            background: "#2d1a1a",
            border: "1px solid #4a1a1a",
            borderRadius: "4px",
            padding: "2px 8px",
            maxWidth: "300px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={importError}
        >
          {importError.split("\n")[0]}
        </span>
      )}
    </div>
  );
}
