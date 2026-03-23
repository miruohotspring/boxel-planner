import { useRef } from "react";

interface ColorPaletteProps {
  colors: string[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  onAddColor: (color: string) => void;
}

export function ColorPalette({
  colors,
  selectedColor,
  onSelectColor,
  onAddColor,
}: ColorPaletteProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "4px",
        }}
      >
        {colors.map((color) => (
          <button
            key={color}
            title={color}
            onClick={() => onSelectColor(color)}
            style={{
              width: "100%",
              aspectRatio: "1",
              backgroundColor: color,
              border:
                selectedColor === color
                  ? "2px solid #e6edf3"
                  : "2px solid transparent",
              borderRadius: "4px",
              cursor: "pointer",
              padding: 0,
              outline:
                selectedColor === color ? "1px solid #30363d" : "none",
              outlineOffset: "2px",
            }}
          />
        ))}

        {/* カスタムカラー追加ボタン */}
        <button
          title="カスタムカラーを追加"
          onClick={() => colorInputRef.current?.click()}
          style={{
            width: "100%",
            aspectRatio: "1",
            backgroundColor: "#21262d",
            border: "1px dashed #30363d",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8b949e",
            fontSize: "16px",
            padding: 0,
          }}
        >
          +
        </button>
      </div>

      {/* hidden color input */}
      <input
        ref={colorInputRef}
        type="color"
        defaultValue={selectedColor}
        style={{ display: "none" }}
        onChange={(e) => onAddColor(e.target.value)}
      />

      {/* 選択中のカラー表示 */}
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            backgroundColor: selectedColor,
            borderRadius: "3px",
            border: "1px solid #30363d",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: "12px",
            color: "#8b949e",
          }}
        >
          {selectedColor}
        </span>
      </div>
    </div>
  );
}
