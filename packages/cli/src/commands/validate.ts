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
import { lintBlueprint } from "../lib/lint.js";

export function registerValidate(program: Command): void {
  program
    .command("validate <file>")
    .description("スキーマ検証と重複チェックを実行する")
    .option("--lint", "推奨規約の lint を実行する")
    .option("--strict-lint", "lint 指摘がある場合はエラー終了する")
    .option("--max-wall-thickness <n>", "lint: 推奨する壁厚の上限", Number, 2)
    .option("--min-colors <n>", "lint: 推奨する色数の下限", Number, 10)
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: {
      lint?: boolean;
      strictLint?: boolean;
      maxWallThickness: number;
      minColors: number;
      json?: boolean;
    }) => {
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

      if (!Number.isInteger(opts.maxWallThickness) || opts.maxWallThickness < 1) {
        printError("--max-wall-thickness must be an integer >= 1.", outputOpts);
      }

      if (!Number.isInteger(opts.minColors) || opts.minColors < 1) {
        printError("--min-colors must be an integer >= 1.", outputOpts);
      }

      const runLint = opts.lint ?? opts.strictLint ?? false;
      const strictLint = opts.strictLint ?? false;
      const lintResult = runLint
        ? lintBlueprint(blueprint, {
            maxWallThickness: opts.maxWallThickness,
            minColors: opts.minColors,
          })
        : { issues: [] };

      if (strictLint && lintResult.issues.length > 0) {
        if (outputOpts.json) {
          console.error(JSON.stringify({
            ok: false,
            errors: [],
            lint: lintResult,
          }));
        } else {
          console.error(`Lint issues in "${absPath}":`);
          for (const issue of lintResult.issues) {
            console.error(`  [${issue.rule}] ${issue.message}`);
          }
        }
        process.exit(1);
      }

      printData(
        { valid: true, ...(runLint ? { lint: lintResult } : {}) },
        outputOpts,
        () => {
          const lines = [`OK: "${absPath}" is valid.`];
          if (runLint) {
            lines.push(`Lint: ${lintResult.issues.length} issue(s)`);
            for (const issue of lintResult.issues) {
              lines.push(`  [${issue.rule}] ${issue.message}`);
            }
          }
          return lines.join("\n");
        }
      );
    });
}
