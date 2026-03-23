import { useState, useCallback } from "react";
import { DEFAULT_COLORS, isValidColor } from "../lib/colors.ts";

export interface UseColorPaletteReturn {
  colors: string[];
  selectedColor: string;
  selectColor: (color: string) => void;
  addColor: (color: string) => void;
  replaceColors: (colors: string[]) => void;
}

export function useColorPalette(): UseColorPaletteReturn {
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLORS[0]);

  const selectColor = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  const addColor = useCallback((color: string) => {
    if (!isValidColor(color)) return;
    setColors((prev) => {
      if (prev.includes(color)) return prev;
      return [...prev, color];
    });
    setSelectedColor(color);
  }, []);

  const replaceColors = useCallback((nextColors: string[]) => {
    const filtered = nextColors.filter(isValidColor);
    const unique = Array.from(new Set(filtered));
    if (unique.length === 0) {
      setColors(DEFAULT_COLORS);
      setSelectedColor(DEFAULT_COLORS[0]);
      return;
    }
    setColors(unique);
    setSelectedColor((prev) => (unique.includes(prev) ? prev : unique[0]!));
  }, []);

  return {
    colors,
    selectedColor,
    selectColor,
    addColor,
    replaceColors,
  };
}
