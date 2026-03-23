import { type Command } from "commander";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";
import { summarizeBounds } from "../lib/blueprint.js";

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

      const { name, version, description, palette, bounds, structure, scaffold } = blueprint;
      const allBounds = summarizeBounds([...structure, ...scaffold]) ?? {
        min: bounds.min,
        max: bounds.max,
        size: {
          x: bounds.max.x - bounds.min.x + 1,
          y: bounds.max.y - bounds.min.y + 1,
          z: bounds.max.z - bounds.min.z + 1,
        },
      };
      const structureBounds = summarizeBounds(structure);
      const scaffoldBounds = summarizeBounds(scaffold);

      const info = {
        name,
        version,
        ...(description !== undefined ? { description } : {}),
        paletteCount: palette?.length ?? 0,
        ...(palette !== undefined ? { palette } : {}),
        structureBlocks: structure.length,
        scaffoldBlocks: scaffold.length,
        bounds: allBounds,
        structureBounds,
        scaffoldBounds,
      };

      printData(info, outputOpts, () => {
        const lines = [
          `Name:      ${name}`,
          `Version:   ${version}`,
        ];
        if (description !== undefined) {
          lines.push(`Description: ${description}`);
        }
        lines.push(`Palette:   ${palette?.length ?? 0} color(s)`);
        lines.push(
          `Structure: ${structure.length} block(s)`,
          `Scaffold:  ${scaffold.length} block(s)`,
          `Bounds:    (${allBounds.min.x}, ${allBounds.min.y}, ${allBounds.min.z}) → (${allBounds.max.x}, ${allBounds.max.y}, ${allBounds.max.z})`,
          `Size:      ${allBounds.size.x} x ${allBounds.size.y} x ${allBounds.size.z}`
        );
        if (structureBounds) {
          lines.push(
            `Structure Bounds: (${structureBounds.min.x}, ${structureBounds.min.y}, ${structureBounds.min.z}) → (${structureBounds.max.x}, ${structureBounds.max.y}, ${structureBounds.max.z})`,
            `Structure Size:   ${structureBounds.size.x} x ${structureBounds.size.y} x ${structureBounds.size.z}`
          );
        }
        if (scaffoldBounds) {
          lines.push(
            `Scaffold Bounds:  (${scaffoldBounds.min.x}, ${scaffoldBounds.min.y}, ${scaffoldBounds.min.z}) → (${scaffoldBounds.max.x}, ${scaffoldBounds.max.y}, ${scaffoldBounds.max.z})`,
            `Scaffold Size:    ${scaffoldBounds.size.x} x ${scaffoldBounds.size.y} x ${scaffoldBounds.size.z}`
          );
        }
        return lines.join("\n");
      });
    });
}
