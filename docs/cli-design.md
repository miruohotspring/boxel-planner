# packages/cli 設計ドキュメント

## 役割

`boxel` CLI は `.boxel.json` 設計図ファイルを操作するコマンドラインツール。
LLM（ChatGPT / Claude 等）が `--json` フラグを付けて呼び出すことで、
プログラマブルに建築設計図を生成・編集できる。

---

## ファイル構成

```
packages/cli/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── src/
    ├── index.ts              # CLI エントリーポイント（commander設定）
    ├── commands/
    │   ├── init.ts           # boxel init
    │   ├── info.ts           # boxel info
    │   ├── validate.ts       # boxel validate
    │   ├── add.ts            # boxel add
    │   ├── remove.ts         # boxel remove
    │   ├── get.ts            # boxel get
    │   ├── slice.ts          # boxel slice
    │   ├── fill.ts           # boxel fill
    │   ├── scaffold.ts       # boxel scaffold generate / clear
    │   └── render.ts         # boxel render
    ├── lib/
    │   ├── file.ts           # ファイル読み書きユーティリティ
    │   └── output.ts         # テキスト/JSON出力ヘルパー
    └── __tests__/
        ├── commands.test.ts  # 各コマンドのユニットテスト
        └── scaffold.test.ts  # scaffold generate のテスト
```

---

## 依存関係

```
@boxel-planner/schema   # 型・バリデーション・ユーティリティ
commander               # CLI フレームワーク
```

---

## コマンドリファレンス

### ファイル操作

#### `boxel init <name> [--out <file>]`

新規設計図ファイルを作成する。

| オプション | 説明 |
|---|---|
| `<name>` | 設計図の名前（必須） |
| `--out <file>` | 出力ファイルパス（省略時: `<name>.boxel.json`） |
| `--json` | JSON 形式で結果を出力 |

```bash
boxel init myhouse
boxel init myhouse --out ./blueprints/myhouse.boxel.json
```

#### `boxel info <file> [--json]`

設計図の概要を表示する。

| 出力項目 | 説明 |
|---|---|
| name / version / description | メタデータ |
| structureBlocks / scaffoldBlocks | 各レイヤーのブロック数 |
| bounds | min/max 座標と size |

```bash
boxel info myhouse.boxel.json
boxel info myhouse.boxel.json --json
```

#### `boxel validate <file>`

スキーマ検証 + 重複座標チェックを実行する。
問題がなければ exit code 0、あれば exit code 1。

```bash
boxel validate myhouse.boxel.json
```

---

### ブロック操作

#### `boxel add <file> --x <n> --y <n> --z <n> --color <#RRGGBB> [--layer structure|scaffold]`

指定座標にブロックを追加する。既存の同座標ブロックは上書きされる。

```bash
boxel add myhouse.boxel.json --x 0 --y 0 --z 0 --color "#FF0000"
boxel add myhouse.boxel.json --x 0 --y 0 --z 0 --color "#FF8C00" --layer scaffold
```

#### `boxel remove <file> --x <n> --y <n> --z <n> [--layer structure|scaffold]`

指定座標のブロックを削除する。座標が存在しない場合は exit code 1。

```bash
boxel remove myhouse.boxel.json --x 0 --y 0 --z 0
```

#### `boxel get <file> --x <n> --y <n> --z <n>`

指定座標のブロック情報を表示する。両レイヤーを検索する。

```bash
boxel get myhouse.boxel.json --x 0 --y 0 --z 0 --json
```

#### `boxel slice <file> --y <n> [--layer structure|scaffold|all]`

指定 Y 座標の断面にあるブロック一覧を表示する。

```bash
boxel slice myhouse.boxel.json --y 0
boxel slice myhouse.boxel.json --y 0 --layer scaffold --json
```

---

### 一括操作

#### `boxel fill <file> --x1 <n> --y1 <n> --z1 <n> --x2 <n> --y2 <n> --z2 <n> --color <#RRGGBB> [--hollow] [--layer structure|scaffold]`

指定範囲をブロックで埋める。`--hollow` を付けると外周のみ。

```bash
# 5x5x5 の直方体を塗りつぶす
boxel fill myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 4 --y2 4 --z2 4 --color "#888888"

# 外周のみ（壁）
boxel fill myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 4 --y2 4 --z2 4 --color "#888888" --hollow
```

#### `boxel scaffold generate <file> [--margin <n>]`

structure の bounds を基に足場を自動生成する。

**アルゴリズム:**
1. `structure` の bounds を計算する
2. bounds を `--margin`（デフォルト 1）分広げた outer bounds を作る
3. outer bounds の各 Y 層で XZ 外周ループ（辺）を足場ブロックで埋める
4. 4 コーナー縦柱も追加する（冪等）
5. 既存の scaffold は完全に上書きされる

足場ブロックのデフォルトカラーは `#FF8C00`（オレンジ）。

```bash
boxel scaffold generate myhouse.boxel.json
boxel scaffold generate myhouse.boxel.json --margin 2
```

#### `boxel scaffold clear <file>`

全足場ブロックを削除する。

```bash
boxel scaffold clear myhouse.boxel.json
```

---

### 確認

#### `boxel render <file> --y <n>`

Y 断面をテキストアートで出力する。

- ブロックあり: `■`
- ブロックなし: `·`
- X 軸が横方向、Z 軸が縦方向
- structure / scaffold 両方のブロックを `■` として描画

```bash
boxel render myhouse.boxel.json --y 0
```

**出力例:**

```
Y=0 (structure: 9, scaffold: 0)
  -1 ···
   0 ■■■
   1 ■·■
   2 ■■■
     012
```

#### `boxel ortho <file>`

TOP / FRONT / SIDE の正射影を横並びで出力する。実在建築の立面確認に使う。

```bash
boxel ortho shrine.boxel.json
boxel ortho shrine.boxel.json --mode coord
boxel ortho shrine.boxel.json --mode coord --style braille --view top
```

`--mode coord` では、各セルに可視面の座標値を表示する。`--style braille` を付けると 9 段階の点字ヒートマップとして描画する。

#### `boxel check <file> --max-x <n> [--max-y <n>] [--max-z <n>]`

指定したサイズ制約を満たすかを検証する。失敗時は終了コード 1 を返す。

```bash
boxel check castle.boxel.json --max-x 50 --max-y 35 --max-z 50
```

#### `boxel check-access <file> --from <x,y,z> --to <x,y,z>`

2点間に空間的な到達経路があるかを検証する。失敗時は終了コード 1 を返す。

```bash
boxel check-access castle.boxel.json --from 0,4,-5 --to 0,8,10
```

---

## 設計方針

### ファイル操作パターン

すべての変更コマンドは以下の一貫したパターンで動作する:

```
1. readBlueprint(file)     → Blueprint を読み込む
2. ロジック適用           → blocks を操作する
3. computeBounds(...)      → bounds を再計算する
4. writeBlueprint(file, …) → ファイルに書き戻す
```

### --json フラグ（LLM 向け）

`--json` フラグを付けると、すべての出力が JSON 形式になる。

**成功時:**
```json
{ "ok": true, "data": { ... } }
```

**成功メッセージのみの場合:**
```json
{ "ok": true, "message": "..." }
```

**エラー時:**
```json
{ "ok": false, "error": "..." }
```

**バリデーションエラー時:**
```json
{ "ok": false, "errors": [{ "path": "...", "message": "..." }] }
```

### エラーハンドリング

- エラー時は exit code 1 で終了する
- エラーメッセージは stderr に出力する
- `--json` フラグ付きのエラーも stderr に JSON 形式で出力する

---

## LLM 向け利用ガイド

LLM が `boxel` CLI を使って建築設計図を生成・編集する際の手順例。

### 1. 新規設計図を作成する

```bash
boxel init tower --json
# => { "ok": true, "data": { "file": "/path/to/tower.boxel.json", ... } }
```

### 2. ブロックを追加する

```bash
# 基礎部分を一括配置
boxel fill tower.boxel.json --x1 0 --y1 0 --z1 0 --x2 5 --y2 0 --z2 5 --color "#888888" --json

# タワーの壁（中空）
boxel fill tower.boxel.json --x1 0 --y1 1 --z1 0 --x2 5 --y2 10 --z2 5 --color "#AAAAAA" --hollow --json
```

### 3. 設計図の状態を確認する

```bash
boxel info tower.boxel.json --json
# => { "ok": true, "data": { "structureBlocks": 156, "bounds": { ... } } }
```

### 4. 断面を確認する

```bash
boxel render tower.boxel.json --y 5 --json
# => { "ok": true, "data": { "y": 5, "structureCount": 20, "grid": "..." } }
```

### 5. 足場を生成する

```bash
boxel scaffold generate tower.boxel.json --margin 1 --json
# => { "ok": true, "data": { "scaffoldBlocks": 312 } }
```

### 6. バリデーションする

```bash
boxel validate tower.boxel.json --json
# => { "ok": true, "data": { "valid": true } }
```

---

## Blueprint ファイル形式 (.boxel.json)

```json
{
  "version": "1.0",
  "name": "tower",
  "description": "シンプルなタワー",
  "bounds": {
    "min": { "x": 0, "y": 0, "z": 0 },
    "max": { "x": 5, "y": 10, "z": 5 }
  },
  "structure": [
    { "x": 0, "y": 0, "z": 0, "color": "#888888" }
  ],
  "scaffold": [
    { "x": -1, "y": -1, "z": -1, "color": "#FF8C00" }
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `version` | `"1.0"` | スキーマバージョン（固定） |
| `name` | `string` | 設計図の名前（必須・1文字以上） |
| `description` | `string?` | 説明（省略可） |
| `bounds` | `Bounds` | 全ブロックを包む AABB（自動計算） |
| `structure` | `Block[]` | 建物本体のブロック配列 |
| `scaffold` | `Block[]` | 足場ブロック配列（別管理） |
