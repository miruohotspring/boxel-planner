import { type Command } from "commander";
import {
  type Blueprint,
  type PaletteEntry,
} from "@boxel-planner/schema";
import { readBlueprint, writeBlueprint } from "../lib/file.js";
import { printData, printError, type OutputOptions } from "../lib/output.js";

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function validatePaletteName(name: string, outputOpts: OutputOptions): void {
  if (name.trim().length === 0) {
    printError("Palette name must not be empty.", outputOpts);
  }
}

function validatePaletteColor(color: string, outputOpts: OutputOptions): void {
  if (!COLOR_PATTERN.test(color)) {
    printError(`Invalid color: "${color}". Must be #RRGGBB format.`, outputOpts);
  }
}

function validatePaletteDescription(description: string, outputOpts: OutputOptions): void {
  if (description.trim().length === 0) {
    printError("Palette description must not be empty.", outputOpts);
  }
}

function getPalette(blueprint: Blueprint): PaletteEntry[] {
  return blueprint.palette ?? [];
}

export function addPaletteEntry(
  blueprint: Blueprint,
  entry: PaletteEntry
): Blueprint {
  const palette = getPalette(blueprint);
  if (palette.some((item) => item.name === entry.name)) {
    throw new Error(`Palette entry already exists: "${entry.name}".`);
  }

  return {
    ...blueprint,
    palette: [...palette, entry],
  };
}

export function updatePaletteEntry(
  blueprint: Blueprint,
  name: string,
  changes: {
    newName?: string;
    color?: string;
    description?: string;
  }
): Blueprint {
  const palette = getPalette(blueprint);
  const index = palette.findIndex((entry) => entry.name === name);
  if (index < 0) {
    throw new Error(`Palette entry not found: "${name}".`);
  }

  const current = palette[index]!;
  const nextName = changes.newName ?? current.name;
  if (nextName !== name && palette.some((entry) => entry.name === nextName)) {
    throw new Error(`Palette entry already exists: "${nextName}".`);
  }

  const updated: PaletteEntry = {
    name: nextName,
    color: changes.color ?? current.color,
    description: changes.description ?? current.description,
  };

  return {
    ...blueprint,
    palette: palette.map((entry, entryIndex) => (entryIndex === index ? updated : entry)),
  };
}

export function removePaletteEntry(
  blueprint: Blueprint,
  name: string
): Blueprint {
  const palette = getPalette(blueprint);
  if (!palette.some((entry) => entry.name === name)) {
    throw new Error(`Palette entry not found: "${name}".`);
  }

  return {
    ...blueprint,
    palette: palette.filter((entry) => entry.name !== name),
  };
}

export function registerPalette(program: Command): void {
  const palette = program
    .command("palette")
    .description("カラーパレットの操作");

  palette
    .command("list <file>")
    .description("パレット定義を一覧表示する")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      const entries = getPalette(blueprint);
      printData(
        { count: entries.length, entries },
        outputOpts,
        () => {
          if (entries.length === 0) return "Palette: 0 entry(s)";
          return [
            `Palette: ${entries.length} entry(s)`,
            ...entries.map((entry) => `- ${entry.name}: ${entry.color} — ${entry.description}`),
          ].join("\n");
        }
      );
    });

  palette
    .command("add <file>")
    .description("パレット定義を追加する")
    .requiredOption("--name <name>", "識別名")
    .requiredOption("--color <#RRGGBB>", "色コード")
    .requiredOption("--description <text>", "用途説明")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: {
      name: string;
      color: string;
      description: string;
      json?: boolean;
    }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      validatePaletteName(opts.name, outputOpts);
      validatePaletteColor(opts.color, outputOpts);
      validatePaletteDescription(opts.description, outputOpts);

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      let updated: Blueprint;
      try {
        updated = addPaletteEntry(blueprint, {
          name: opts.name,
          color: opts.color.toUpperCase(),
          description: opts.description,
        });
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      try {
        writeBlueprint(file, updated);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      printData(
        { added: opts.name, paletteCount: updated.palette?.length ?? 0 },
        outputOpts,
        () => `Added palette entry "${opts.name}".`
      );
    });

  palette
    .command("update <file>")
    .description("パレット定義を更新する")
    .requiredOption("--name <name>", "更新対象の識別名")
    .option("--new-name <name>", "新しい識別名")
    .option("--color <#RRGGBB>", "新しい色コード")
    .option("--description <text>", "新しい用途説明")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: {
      name: string;
      newName?: string;
      color?: string;
      description?: string;
      json?: boolean;
    }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      validatePaletteName(opts.name, outputOpts);
      if (
        opts.newName === undefined &&
        opts.color === undefined &&
        opts.description === undefined
      ) {
        printError("At least one of --new-name, --color, or --description is required.", outputOpts);
      }
      if (opts.newName !== undefined) validatePaletteName(opts.newName, outputOpts);
      if (opts.color !== undefined) validatePaletteColor(opts.color, outputOpts);
      if (opts.description !== undefined) validatePaletteDescription(opts.description, outputOpts);

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      let updated: Blueprint;
      try {
        updated = updatePaletteEntry(blueprint, opts.name, {
          ...(opts.newName !== undefined ? { newName: opts.newName } : {}),
          ...(opts.color !== undefined ? { color: opts.color.toUpperCase() } : {}),
          ...(opts.description !== undefined ? { description: opts.description } : {}),
        });
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      try {
        writeBlueprint(file, updated);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      printData(
        {
          updated: opts.name,
          name: opts.newName ?? opts.name,
          paletteCount: updated.palette?.length ?? 0,
        },
        outputOpts,
        () => `Updated palette entry "${opts.name}".`
      );
    });

  palette
    .command("remove <file>")
    .description("パレット定義を削除する")
    .requiredOption("--name <name>", "削除対象の識別名")
    .option("--json", "JSON形式で結果を出力する")
    .action((file: string, opts: { name: string; json?: boolean }) => {
      const outputOpts: OutputOptions = { json: opts.json };
      validatePaletteName(opts.name, outputOpts);

      let blueprint: Blueprint;
      try {
        blueprint = readBlueprint(file);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      let updated: Blueprint;
      try {
        updated = removePaletteEntry(blueprint, opts.name);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      try {
        writeBlueprint(file, updated);
      } catch (e) {
        printError(e instanceof Error ? e.message : String(e), outputOpts);
      }

      printData(
        { removed: opts.name, paletteCount: updated.palette?.length ?? 0 },
        outputOpts,
        () => `Removed palette entry "${opts.name}".`
      );
    });
}
