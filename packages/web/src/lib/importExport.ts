import { validateBlueprint, type Blueprint } from "@boxel-planner/schema";

export type ImportResult =
  | { ok: true; data: Blueprint }
  | { ok: false; error: string };

/** テキストから Blueprint を読み込む */
export function importFromText(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "JSON の解析に失敗しました。ファイルの形式を確認してください。" };
  }

  const result = validateBlueprint(raw);
  if (!result.ok) {
    const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join("\n");
    return { ok: false, error: `バリデーションエラー:\n${messages}` };
  }

  return { ok: true, data: result.data };
}

/** File オブジェクトから Blueprint を非同期で読み込む */
export function importFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        resolve({ ok: false, error: "ファイルの読み込みに失敗しました。" });
        return;
      }
      resolve(importFromText(text));
    };
    reader.onerror = () => {
      resolve({ ok: false, error: "ファイルの読み込みに失敗しました。" });
    };
    reader.readAsText(file);
  });
}

/** Blueprint を .boxel.json としてダウンロード */
export function exportBlueprint(blueprint: Blueprint): void {
  const json = JSON.stringify(blueprint, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const filename = `${blueprint.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.boxel.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
