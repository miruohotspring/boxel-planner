import { useState, useCallback } from "react";
import { DEFAULT_COLORS, isValidColor } from "../lib/colors.ts";

export interface UseColorPaletteReturn {
  colors: string[];
  selectedColor: string;
  selectColor: (color: string) => void;
  addColor: (color: string) => void;
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

  return {
    colors,
    selectedColor,
    selectColor,
    addColor,
  };
}
