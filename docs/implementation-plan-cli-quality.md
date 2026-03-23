# CLI Quality Improvements Plan

## Goal

以下の 4 系統を、既存ワークフローを大きく壊さずに強化する。

1. `place --collision error` 時に衝突座標を返す
2. `palette` を CLI から追加・編集・削除できるようにする
3. `validate` に wall thickness / color count の lint を追加する
4. `ortho` を読みやすくする

## Scope

### 1. Collision Coordinates

- `place` の衝突例外を件数だけでなく座標つきで返す
- text 出力では代表座標を短く列挙する
- JSON 出力では衝突座標配列を構造化して返す
- 衝突座標は全部ではなく、まずは代表件数を返す

### 2. Palette CLI

- `boxel palette list <file>`
- `boxel palette add <file> --name --color --description`
- `boxel palette update <file> --name [--new-name] [--color] [--description]`
- `boxel palette remove <file> --name`

制約:

- `name` は一意
- `color` は `#RRGGBB`
- update は最低 1 つの更新項目が必要

### 3. Lint

`validate` に opt-in lint を追加する。

- `--lint`
- `--strict-lint`
- `--max-wall-thickness <n>` default `2`
- `--min-colors <n>` default `10`

実装方針:

- wall thickness は heuristic lint として実装する
- exposed face から見た連続厚みを測る
- color count は `palette` があれば `palette.length`、なければ使用色数で判定

### 4. Ortho Readability

今回の実装対象は絞る。

- `--crop structure|all`
- `--center`
- `--grid <n>`
- `--highlight-color <#RRGGBB>`
- `--verbose` 時に palette 名と description を legend に出す

見送り:

- `--diff`
- ANSI color
- depth shading
- silhouette mode

## Execution Order

1. collision coordinates
2. palette CLI
3. lint
4. ortho readability
5. tests / docs / verification

## Verification

- `npm run test`
- `npm run build`
- `boxel place ... --json` の衝突 JSON 確認
- `boxel palette ...` の CRUD 動作確認
- `boxel validate --lint`
- `boxel ortho` の新オプション確認
