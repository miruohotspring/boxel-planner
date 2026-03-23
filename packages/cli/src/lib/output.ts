/**
 * テキスト/JSON 出力ヘルパー
 *
 * --json フラグが渡されたとき、すべての出力を JSON 形式にして LLM 等のパーサが扱いやすくする。
 */

export interface OutputOptions {
  json?: boolean | undefined;
}

/** 成功メッセージを出力する */
export function printSuccess(message: string, opts: OutputOptions): void {
  if (opts.json) {
    console.log(JSON.stringify({ ok: true, message }));
  } else {
    console.log(message);
  }
}

/** 任意データを出力する */
export function printData<T>(data: T, opts: OutputOptions, textFn?: () => string): void {
  if (opts.json) {
    console.log(JSON.stringify({ ok: true, data }));
  } else if (textFn) {
    console.log(textFn());
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

/** エラーを出力して process.exit(1) する */
export function printError(message: string, opts: OutputOptions): never {
  if (opts.json) {
    console.error(JSON.stringify({ ok: false, error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(1);
}

/** structure レイヤーに負の Y 座標ブロックが追加されたとき stderr へ警告する */
export function warnNegativeCoords(
  posMap: ReadonlyMap<string, { x: number; y: number; z: number }>,
  prevKeys: ReadonlySet<string>,
  layer: string
): void {
  let count = 0;
  for (const [key, b] of posMap) {
    if (!prevKeys.has(key) && b.y < 0) count++;
  }
  if (count > 0) {
    console.warn(
      `Warning: ${count} block(s) added below Y=0 on ${layer} layer. Consider adjusting height or origin.`
    );
  }
}

/** バリデーションエラーを出力して process.exit(1) する */
export function printValidationErrors(
  errors: Array<{ path: string; message: string }>,
  opts: OutputOptions
): never {
  if (opts.json) {
    console.error(JSON.stringify({ ok: false, errors }));
  } else {
    console.error("Validation errors:");
    for (const e of errors) {
      if (e.path) {
        console.error(`  ${e.path}: ${e.message}`);
      } else {
        console.error(`  ${e.message}`);
      }
    }
  }
  process.exit(1);
}
