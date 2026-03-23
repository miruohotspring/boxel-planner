import fs from "fs";
import path from "path";
import { type Command } from "commander";
import {
  parseBlueprintJson,
  findDuplicatePositions,
} from "@boxel-planner/schema";
import {
  printData,
  printError,
  printValidationErrors,
  type OutputOptions,
} from "../lib/output.js";

export function registerValidate(program: Command): void {
  program
    .command("validate <file>")
    .description("スキーマ検証と重複チェックを実行する")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      const absPath = path.resolve(file);

      let raw: string;
      try {
        raw = fs.readFileSync(absPath, "utf-8");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        printError(`Failed to read file "${absPath}": ${message}`, outputOpts);
      }

      const result = parseBlueprintJson(raw);
      if (!result.ok) {
        printValidationErrors(result.errors, outputOpts);
      }

      const { blueprint } = { blueprint: result.data };
      const structureDuplicates = findDuplicatePositions(blueprint.structure);
      const scaffoldDuplicates = findDuplicatePositions(blueprint.scaffold);

      if (structureDuplicates.length > 0 || scaffoldDuplicates.length > 0) {
        const errors: Array<{ path: string; message: string }> = [];
        for (const key of structureDuplicates) {
          errors.push({ path: "structure", message: `Duplicate position: ${key}` });
        }
        for (const key of scaffoldDuplicates) {
          errors.push({ path: "scaffold", message: `Duplicate position: ${key}` });
        }
        printValidationErrors(errors, outputOpts);
      }

      printData(
        { valid: true },
        outputOpts,
        () => `OK: "${absPath}" is valid.`
      );
    });
}
