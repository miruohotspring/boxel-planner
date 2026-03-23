import { type Command } from "commander";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

export function registerInfo(program: Command): void {
  program
    .command("info <file>")
    .description("設計図の概要を表示する")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const { name, version, description, bounds, structure, scaffold } = blueprint;
      const sizeX = bounds.max.x - bounds.min.x + 1;
      const sizeY = bounds.max.y - bounds.min.y + 1;
      const sizeZ = bounds.max.z - bounds.min.z + 1;

      const info = {
        name,
        version,
        ...(description !== undefined ? { description } : {}),
        structureBlocks: structure.length,
        scaffoldBlocks: scaffold.length,
        bounds: {
          min: bounds.min,
          max: bounds.max,
          size: { x: sizeX, y: sizeY, z: sizeZ },
        },
      };

      printData(info, outputOpts, () => {
        const lines = [
          `Name:      ${name}`,
          `Version:   ${version}`,
        ];
        if (description !== undefined) {
          lines.push(`Description: ${description}`);
        }
        lines.push(
          `Structure: ${structure.length} block(s)`,
          `Scaffold:  ${scaffold.length} block(s)`,
          `Bounds:    (${bounds.min.x}, ${bounds.min.y}, ${bounds.min.z}) → (${bounds.max.x}, ${bounds.max.y}, ${bounds.max.z})`,
          `Size:      ${sizeX} x ${sizeY} x ${sizeZ}`
        );
        return lines.join("\n");
      });
    });
}
