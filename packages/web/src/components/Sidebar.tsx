import React from "react";
import { type Blueprint } from "@boxel-planner/schema";
import { ColorPalette } from "./ColorPalette.tsx";

interface SidebarProps {
  blueprint: Blueprint | null;
  currentY: number;
  colors: string[];
  selectedColor: string;
  viewMode: "3d" | "2d";
  onYChange: (y: number) => void;
  onSelectColor: (color: string) => void;
  onAddColor: (color: string) => void;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "11px",
        fontWeight: 600,
        color: "#6e7681",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "8px",
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        borderBottom: "1px solid #21262d",
        margin: "16px 0",
      }}
    />
  );
}

export function Sidebar({
  blueprint,
  currentY,
  colors,
  selectedColor,
  viewMode,
  onYChange,
  onSelectColor,
  onAddColor,
}: SidebarProps) {
  const minY = blueprint?.bounds.min.y ?? 0;
  const maxY = blueprint?.bounds.max.y ?? 0;

  return (
    <div
      style={{
        width: "200px",
        flexShrink: 0,
        borderLeft: "1px solid #30363d",
        background: "#161b22",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "12px" }}>
        {/* カラーパレット */}
        <SectionLabel>Color Palette</SectionLabel>
        <ColorPalette
          colors={colors}
          selectedColor={selectedColor}
          onSelectColor={onSelectColor}
          onAddColor={onAddColor}
        />

        <Divider />

        {/* Y スライダー（2D モードのみ） */}
        {viewMode === "2d" && (
          <>
            <SectionLabel>Layer</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "12px", color: "#8b949e" }}>Y =</span>
                <span
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "13px",
                    color: "#388bfd",
                    fontWeight: 600,
                  }}
                >
                  {currentY}
                </span>
              </div>

              <input
                type="range"
                min={minY}
                max={maxY}
                value={currentY}
                onChange={(e) => onYChange(Number(e.target.value))}
                disabled={!blueprint}
                style={{
                  width: "100%",
                  accentColor: "#388bfd",
                  cursor: blueprint ? "pointer" : "not-allowed",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  color: "#6e7681",
                }}
              >
                <button
                  style={{
                    background: "none",
                    border: "1px solid #30363d",
                    borderRadius: "4px",
                    color: "#8b949e",
                    cursor: blueprint && currentY > minY ? "pointer" : "not-allowed",
                    padding: "2px 8px",
                    fontSize: "11px",
                    opacity: blueprint && currentY > minY ? 1 : 0.4,
                  }}
                  onClick={() => blueprint && onYChange(Math.max(minY, currentY - 1))}
                  disabled={!blueprint || currentY <= minY}
                >
                  ← 1
                </button>
                <button
                  style={{
                    background: "none",
                    border: "1px solid #30363d",
                    borderRadius: "4px",
                    color: "#8b949e",
                    cursor: blueprint && currentY < maxY ? "pointer" : "not-allowed",
                    padding: "2px 8px",
                    fontSize: "11px",
                    opacity: blueprint && currentY < maxY ? 1 : 0.4,
                  }}
                  onClick={() => blueprint && onYChange(Math.min(maxY, currentY + 1))}
                  disabled={!blueprint || currentY >= maxY}
                >
                  1 →
                </button>
              </div>
            </div>

            <Divider />
          </>
        )}

        {/* Info */}
        <SectionLabel>Info</SectionLabel>
        {blueprint ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <InfoRow label="建築名" value={blueprint.name} />
            {blueprint.description && (
              <InfoRow
                label="説明"
                value={blueprint.description}
                mono={false}
              />
            )}
            <InfoRow
              label="Structure"
              value={blueprint.structure.length.toLocaleString()}
            />
            <InfoRow
              label="Scaffold"
              value={blueprint.scaffold.length.toLocaleString()}
            />
            <InfoRow
              label="Total"
              value={(
                blueprint.structure.length + blueprint.scaffold.length
              ).toLocaleString()}
            />
            <InfoRow
              label="Bounds"
              value={`(${blueprint.bounds.min.x},${blueprint.bounds.min.y},${blueprint.bounds.min.z}) - (${blueprint.bounds.max.x},${blueprint.bounds.max.y},${blueprint.bounds.max.z})`}
              mono={true}
              small
            />
          </div>
        ) : (
          <div style={{ fontSize: "12px", color: "#6e7681" }}>
            ファイルを Import してください
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = true,
  small = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "#6e7681" }}>{label}</div>
      <div
        style={{
          fontFamily: mono
            ? "ui-monospace, SFMono-Regular, monospace"
            : "inherit",
          fontSize: small ? "11px" : "12px",
          color: "#e6edf3",
          wordBreak: "break-all",
          lineHeight: "1.4",
        }}
      >
        {value}
      </div>
    </div>
  );
}
