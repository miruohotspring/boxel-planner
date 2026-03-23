import { ZodError } from "zod";
import { BlueprintSchema } from "./schemas.js";
import type { Blueprint } from "./types.js";

export type ValidationSuccess = { ok: true; data: Blueprint };
export type ValidationFailure = {
  ok: false;
  errors: Array<{ path: string; message: string }>;
};
export type ValidationResult = ValidationSuccess | ValidationFailure;

function formatZodError(err: ZodError): ValidationFailure["errors"] {
  return err.errors.map((issue) => ({
    path: issue.path
      .map((segment) =>
        typeof segment === "number" ? `[${segment}]` : segment
      )
      .join(".")
      .replace(/\.\[/g, "["),
    message: issue.message,
  }));
}

/** CLI 向け: 例外を投げず Result 型で返す */
export function validateBlueprint(raw: unknown): ValidationResult {
  const result = BlueprintSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: formatZodError(result.error) };
}

/** Web UI 向け: 失敗時に例外を投げる */
export function parseBlueprint(raw: unknown): Blueprint {
  return BlueprintSchema.parse(raw);
}

/** JSON 文字列から直接パース（CLI のファイル読み込みルート） */
export function parseBlueprintJson(json: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [{ path: "", message: `JSON parse error: ${message}` }],
    };
  }
  return validateBlueprint(raw);
}
