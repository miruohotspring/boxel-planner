import { type Command } from "commander";
import { type Blueprint } from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";
import { recenterBlueprint } from "../lib/blueprint.js";

export function registerRecenter(program: Command): void {
  program
    .command("recenter <file>")
    .description("structure を基準に XZ 中心を原点付近へ、底面 Y を 0 へ揃える")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const result = recenterBlueprint(blueprint);

      try {
        writeBlueprint(file, result.blueprint);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      printData(
        {
          offset: result.offset,
          bounds: result.blueprint.bounds,
        },
        outputOpts,
        () =>
          `Recentered "${file}" by (${result.offset.x}, ${result.offset.y}, ${result.offset.z}).`
      );
    });
}
