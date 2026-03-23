import fs from "fs";
import path from "path";
import { type Command } from "commander";
import { CURRENT_VERSION, type Blueprint } from "@boxel-planner/schema";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerInit(program: Command): void {
  program
    .command("init <name>")
    .description("新規設計図ファイルを作成する")
    .option("--out <file>", "出力ファイルパス（省略時は <name>.boxel.json）")
    .option("--json", "JSON形式で結果を出力する")
    .action((name: string, opts: { out?: string; json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      const outFile = opts.out ?? `${name}.boxel.json`;
      const absPath = path.resolve(outFile);

      if (fs.existsSync(absPath)) {
        printError(`File already exists: "${absPath}"`, outputOpts);
      }

      const blueprint: Blueprint = {
        version: CURRENT_VERSION,
        name,
        bounds: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
        },
        structure: [],
        scaffold: [],
      };

      try {
        fs.writeFileSync(absPath, JSON.stringify(blueprint, null, 2) + "\n", "utf-8");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        printError(`Failed to write file: ${message}`, outputOpts);
      }

      printData(
        { file: absPath, blueprint },
        outputOpts,
        () => `Created blueprint "${name}" at ${absPath}`
      );
    });
}
