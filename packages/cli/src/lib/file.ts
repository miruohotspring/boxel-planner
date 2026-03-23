import fs from "fs";
import path from "path";
import {
  parseBlueprintJson,
  type Blueprint,
} from "@boxel-planner/schema";

/**
 * ファイルから Blueprint を読み込む。
 * 失敗時は例外を投げる。
 */
export function readBlueprint(filePath: string): Blueprint {
  const absPath = path.resolve(filePath);
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, "utf-8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to read file "${absPath}": ${message}`);
  }

  const result = parseBlueprintJson(raw);
  if (!result.ok) {
    const errText = result.errors
      .map((e) => (e.path ? `  ${e.path}: ${e.message}` : `  ${e.message}`))
      .join("\n");
    throw new Error(`Invalid blueprint file "${absPath}":\n${errText}`);
  }
  return result.data;
}

/**
 * Blueprint をファイルに書き込む。
 */
export function writeBlueprint(filePath: string, blueprint: Blueprint): void {
  const absPath = path.resolve(filePath);
  try {
    fs.writeFileSync(absPath, JSON.stringify(blueprint, null, 2) + "\n", "utf-8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to write file "${absPath}": ${message}`);
  }
}
