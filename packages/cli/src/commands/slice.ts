import { type Command } from "commander";
import { getSlice, type Blueprint } from "@boxel-planner/schema";
import { readBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

type SliceLayer = "structure" | "scaffold" | "all";

export function registerSlice(program: Command): void {
  program
    .command("slice <file>")
    .description("指定Y断面のブロック一覧を表示する")
    .requiredOption("--y <n>", "Y座標", Number)
    .option("--layer <layer>", "対象レイヤー (structure, scaffold, all)", "all")
    .option("--json", "JSON形式で結果を出力する")
    .action(
      (
        file: string,
        opts: { y: number; layer: string; json?: boolean }
      ) => {
        const outputOpts: OutputOptions = { json: opts.json };

        const validLayers: SliceLayer[] = ["structure", "scaffold", "all"];
        if (!validLayers.includes(opts.layer as SliceLayer)) {
          printError(
            `Invalid layer: "${opts.layer}". Must be "structure", "scaffold", or "all".`,
            outputOpts
          );
        }

        let blueprint: Blueprint;
        try {
          blueprint = readBlueprint(file);
        } catch (e) {
          printError(e instanceof Error ? e.message : String(e), outputOpts);
        }

        const layer = opts.layer as SliceLayer;

        const structureSlice =
          layer === "scaffold" ? [] : getSlice(blueprint.structure, opts.y);
        const scaffoldSlice =
          layer === "structure" ? [] : getSlice(blueprint.scaffold, opts.y);

        const data = {
          y: opts.y,
          layer,
          structure: structureSlice,
          scaffold: scaffoldSlice,
        };

        printData(data, outputOpts, () => {
          const lines: string[] = [`Y=${opts.y} slice (layer: ${layer})`];
          if (layer !== "scaffold" && structureSlice.length > 0) {
            lines.push(`  structure (${structureSlice.length} block(s)):`);
            for (const b of structureSlice) {
              lines.push(`    (${b.x}, ${b.y}, ${b.z}) color=${b.color}`);
            }
          }
          if (layer !== "structure" && scaffoldSlice.length > 0) {
            lines.push(`  scaffold (${scaffoldSlice.length} block(s)):`);
            for (const b of scaffoldSlice) {
              lines.push(`    (${b.x}, ${b.y}, ${b.z}) color=${b.color}`);
            }
          }
          if (structureSlice.length === 0 && scaffoldSlice.length === 0) {
            lines.push("  (no blocks)");
          }
          return lines.join("\n");
        });
      }
    );
}
