# boxel-planner LLM ガイド

このドキュメントは Claude・Codex などの LLM が `boxel` CLI を操作して `.boxel.json` 設計図を作成・編集するためのリファレンスです。

---

## 1. セットアップ

### クイックセットアップ（推奨）

ビルドとグローバルリンクを一発で行う `setup` スクリプトを使います。

```bash
# リポジトリルートで実行
npm run setup

# これで boxel コマンドが使えるようになる
boxel --help
```

> **注意:** `CLI="node packages/cli/dist/index.js"` のようなシェル変数を使う方法は、
> eval コンテキスト（サブシェルや CI スクリプト内）では変数が引き継がれないため動作しません。
> `npm run setup` で `boxel` コマンドをグローバルに登録することを推奨します。

### 手動ビルド手順

schema → cli の順でビルドが必要です。

```bash
# リポジトリルートで実行
npm install
npm run build --workspace=packages/schema
npm run build --workspace=packages/cli
```

### CLI の実行方法

```bash
# ビルド後、直接実行
node packages/cli/dist/index.js <command>

# npm link 後（推奨）
cd packages/cli && npm link
boxel <command>
```

---

## 2. 設計図ファイル形式

### JSON 構造の概要

```json
{
  "version": "1.0",
  "name": "my-build",
  "description": "説明（省略可）",
  "bounds": {
    "min": { "x": 0, "y": 0, "z": 0 },
    "max": { "x": 4, "y": 7, "z": 4 }
  },
  "structure": [
    { "x": 0, "y": 0, "z": 0, "color": "#888888" }
  ],
  "scaffold": [
    { "x": -1, "y": 0, "z": -1, "color": "#FF8C00" }
  ]
}
```

| フィールド | 説明 |
|---|---|
| `structure` | 建物本体のブロック配列 |
| `scaffold` | 足場ブロック配列（別管理、自動生成される） |
| `bounds` | 全ブロックを包む AABB（fill/add 後に自動再計算） |

### 座標系

- **Y が高さ方向**（上へ行くほど Y が増える）
- X は東西、Z は南北
- 座標はすべて整数

### カラー指定

- `#RRGGBB` 形式のみ（例: `#888888`、`#8B4513`）
- 小文字も可（`#aaaaaa` など）

---

## 3. LLM が使うべきコマンドフロー

以下の順序で操作します。

### Step 1: `init` で空ファイルを作る

```bash
boxel init myhouse --json
# => { "ok": true, "data": { "file": "myhouse.boxel.json", ... } }
```

### Step 2: `fill` や `add` で構造を作る

```bash
# 範囲を一括で埋める（最も多用するコマンド）
boxel fill myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 9 --y2 0 --z2 7 --color "#8B4513"

# 外周のみ（--hollow で壁・箱型を作る）
boxel fill myhouse.boxel.json --x1 0 --y1 1 --z1 0 --x2 9 --y2 5 --z2 7 --color "#8B4513" --hollow

# 外周のうち側面のみ（天井・床なし）→ 城壁や単層の外周リングに使う
boxel fill myhouse.boxel.json --x1 0 --y1 1 --z1 0 --x2 9 --y2 5 --z2 7 --color "#8B4513" --hollow --no-cap

# ストライプ fill（X方向: 2置いて1空け → 胸壁パターンなど）
boxel fill wall.boxel.json --x1 0 --y1 10 --z1 0 --x2 49 --y2 10 --z2 0 --color "#888888" --step-x 2 --gap-x 1

# 単体ブロックを追加
boxel add myhouse.boxel.json --x 4 --y 3 --z 0 --color "#ADD8E6"

# 単体ブロックを削除（窓穴など）
boxel remove myhouse.boxel.json --x 3 --y 2 --z 0
```

> **上書き挙動について:** `fill` と `add` は既存ブロックを上書きします。色を変更したいだけなら `remove` は不要です。直接 `fill` を実行すれば色が更新されます。
>
> 出力の `added` は新規ブロック数、`updated` は色が変わった既存ブロック数です。色変更だけのとき `added: 0, updated: N` と表示されますが、ファイルは正常に更新されています。

### Step 3: 形状を確認する【重要】

**テキストでの状態確認は render / ortho だけです。必ず確認してから次のステップへ進んでください。**

#### `render --y <n>` — 1断面を確認

```bash
boxel render myhouse.boxel.json --y 0
```

出力例:

```
Y=0 (structure: 80, scaffold: 0)
   0 ■■■■■■■■■■
   1 ■·········■
   2 ■·········■
   ...
   7 ■■■■■■■■■■
     0    5
```

色の確認をしたいときは `--color` を使います:

```bash
boxel render myhouse.boxel.json --y 0 --color
# → グリッド内が a/b/c... 記号になり、下部に色の対応表を表示
```

#### `ortho` — 3方向を一発で確認【全体把握に最適】

1断面ずつでは全体形状が掴みにくい場合（特に曲面やドームなど）は `ortho` を使うと TOP/FRONT/SIDE の3方向が一度に確認できます。

```bash
boxel ortho myhouse.boxel.json
```

出力例:

```
── TOP (Y↓) ───────   ── FRONT (Z↑) ─────   ── SIDE (X→) ──────
     0    5                0    5                0    5
  0 ···■■■···           0 ·■■■■■■■·           0 ·■■■■■■■·
  1 ··■···■··           1 ■·······■           1 ■·······■
  ...
```

Y 座標でフィルターしたいときは `--y-min` を使います（床だけで全面 ■ になる場合などに有効）:

```bash
boxel ortho myhouse.boxel.json --y-min 1
# → Y=0 の床を除外して構造を確認
```

色の確認をしたいときは `--verbose` を使います:

```bash
boxel ortho myhouse.boxel.json --verbose
# → グリッド内が a/b/c... 記号になり、下部に色の対応表を表示
# 例:
# Legend:
#   a = #8B4513  ×240 (structure)
#   b = #4A2F08  ×80  (structure)
```

各投影方向の代表色は以下のルールで選ばれます:
- **TOP**: その (X,Z) 位置で最も Y が高いブロックの色
- **FRONT**: その (X,Y) 位置で最も Z が小さいブロックの色
- **SIDE**: その (Z,Y) 位置で最も X が小さいブロックの色

### Step 4: `scaffold generate` で足場を生成

```bash
boxel scaffold generate myhouse.boxel.json --margin 1 --json
# => { "ok": true, "data": { "scaffoldBlocks": 312 } }
```

### Step 5: `validate` で最終チェック

```bash
boxel validate myhouse.boxel.json --json
# => { "ok": true, "data": { "valid": true } }
```

### Step 6: `info --json` で機械可読な概要取得

```bash
boxel info myhouse.boxel.json --json
# => { "ok": true, "data": { "structureBlocks": 156, "bounds": { ... } } }
```

---

## 4. 実践例

### 例1: 小さな家（10x6x8、木造風）

**ユーザーの指示:** 「10×8の木造の家を作って。屋根は濃い茶色で、窓も開けて」

**LLM が実行するコマンド列:**

```bash
# 1. ファイル初期化
boxel init myhouse --json

# 2. 1階の床（Y=0）
boxel fill myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 9 --y2 0 --z2 7 --color "#8B4513" --json

# 3. 壁（Y=1〜4、外周のみ）
boxel fill myhouse.boxel.json --x1 0 --y1 1 --z1 0 --x2 9 --y2 4 --z2 7 --color "#8B4513" --hollow --json

# 4. 屋根（Y=5）
boxel fill myhouse.boxel.json --x1 0 --y1 5 --z1 0 --x2 9 --y2 5 --z2 7 --color "#4a2f08" --json

# 5. 断面確認（壁の確認）
boxel render myhouse.boxel.json --y 2

# 6. 窓穴を開ける（正面 Z=0 の壁）
boxel remove myhouse.boxel.json --x 2 --y 2 --z 0
boxel remove myhouse.boxel.json --x 3 --y 2 --z 0
boxel remove myhouse.boxel.json --x 6 --y 2 --z 0
boxel remove myhouse.boxel.json --x 7 --y 2 --z 0

# 7. 断面再確認（窓穴ができているか確認）
boxel render myhouse.boxel.json --y 2

# 8. 足場生成
boxel scaffold generate myhouse.boxel.json --json

# 9. 最終バリデーション
boxel validate myhouse.boxel.json --json
```

**Y=2 の render 出力例（窓穴あり）:**

```
Y=2 (structure: 32, scaffold: 0)
   0 ■■·■·■·■■■
   1 ■·········■
   ...
   7 ■■■■■■■■■■
     0    5
```

---

### 例2: 石造りの塔（5x5x12）

**ユーザーの指示:** 「5×5の石造りの塔を12段作って。てっぺんは屋上にして」

**LLM が実行するコマンド列:**

```bash
# 1. ファイル初期化
boxel init tower --json

# 2. 壁（Y=0〜10、外周のみ）
boxel fill tower.boxel.json --x1 0 --y1 0 --z1 0 --x2 4 --y2 10 --z2 4 --color "#888888" --hollow --json

# 3. 断面確認（中層）
boxel render tower.boxel.json --y 5

# 4. 最上層の天板（Y=11、全面）
boxel fill tower.boxel.json --x1 0 --y1 11 --z1 0 --x2 4 --y2 11 --z2 4 --color "#888888" --json

# 5. 断面確認（最上層）
boxel render tower.boxel.json --y 11

# 6. 足場生成
boxel scaffold generate tower.boxel.json --json

# 7. バリデーション
boxel validate tower.boxel.json --json
```

**Y=5 の render 出力例（中空の壁）:**

```
Y=5 (structure: 16, scaffold: 0)
   0 ■■■■■
   1 ■···■
   2 ■···■
   3 ■···■
   4 ■■■■■
     0
```

---

### 例3: カラフルな旗（3x1x8、縦長ストライプ）

**ユーザーの指示:** 「3×8の縦長の旗を作って。赤・白・青のストライプで」

**LLM が実行するコマンド列:**

```bash
# 1. ファイル初期化
boxel init flag --json

# 2. 赤ストライプ（Y=0〜1）
boxel fill flag.boxel.json --x1 0 --y1 0 --z1 0 --x2 2 --y2 1 --z2 0 --color "#FF0000" --json

# 3. 白ストライプ（Y=2〜4）
boxel fill flag.boxel.json --x1 0 --y1 2 --z1 0 --x2 2 --y2 4 --z2 0 --color "#FFFFFF" --json

# 4. 青ストライプ（Y=5〜7）
boxel fill flag.boxel.json --x1 0 --y1 5 --z1 0 --x2 2 --y2 7 --z2 0 --color "#0000FF" --json

# 5. 断面確認（各色）
boxel render flag.boxel.json --y 0
boxel render flag.boxel.json --y 3
boxel render flag.boxel.json --y 6

# 6. バリデーション
boxel validate flag.boxel.json --json
```

---

## 5. render 出力の読み方

```
Y=2 (structure: 16, scaffold: 0)
   0 ■■■■■
   1 ■···■
   2 ■···■
   3 ■···■
   4 ■■■■■
     0
```

| 要素 | 意味 |
|---|---|
| `Y=2` | 表示している高さ（Y座標） |
| `structure: 16` | この層の構造ブロック数 |
| `scaffold: 0` | この層の足場ブロック数 |
| `■` | ブロックあり（structure または scaffold） |
| `·` | 空き |
| 行ラベル（左の数字） | Z 座標 |
| 列ラベル（下の数字） | X 座標（5の倍数のみ表示） |

### render の座標向き図解

```
        X=0  X=1  X=2  ...
  Z=0 [  ■    ■    ·  ]   ← 手前の列
  Z=1 [  ■    ·    ·  ]
  Z=2 [  ■    ■    ■  ]   ← 奥の列

  左端の数字 = Z 座標（手前→奥）
  下の数字   = X 座標（左→右）
  Y 軸は高さ方向（--y で断面を選ぶ）
```

---

## 6. よく使うカラーコード

| 素材 | カラーコード |
|---|---|
| 石 | `#888888` |
| 木材（茶色） | `#8B4513` |
| 砂岩 | `#D2B48C` |
| 苔石 | `#5A7A4A` |
| ガラス | `#ADD8E6` |
| 雪 | `#FFFAFA` |
| 黒曜石 | `#1C1C2E` |
| 金 | `#FFD700` |
| 足場（デフォルト） | `#FF8C00` |

---

## 7. LLM が陥りやすい失敗パターンと対策

### 座標を負にしてしまう

`init` 後は必ず `x=0, y=0, z=0` 基点で設計してください。structure のブロックは非負座標から始めるのが基本です（scaffold は自動生成時に負座標になることがあります）。

### fill の x1 > x2 になる

`fill` の座標指定は常に `x1 <= x2`、`y1 <= y2`、`z1 <= z2` になるよう min 側を 1 に指定してください。

```bash
# NG: x1 > x2
boxel fill f.boxel.json --x1 5 --y1 0 --z1 0 --x2 0 --y2 0 --z2 4 --color "#888888"

# OK
boxel fill f.boxel.json --x1 0 --y1 0 --z1 0 --x2 5 --y2 0 --z2 4 --color "#888888"
```

### bounds が構造に合わないと思い込む

`fill` や `add` の後、`bounds` は自動で再計算されます。手動で bounds を編集する必要はありません。

### render を使わずに進める

テキストの状態確認は `render` だけです。数層ごとに必ず確認し、意図した形になっているかを検証しながら作業してください。特に `--hollow` で壁を作った後や、`remove` で穴を開けた後は必ず確認します。

### 色変更のために remove → fill の2ステップを踏んでしまう

`fill` は既存ブロックを上書きするため、色変更に `remove` は不要です。

```bash
# NG: 不要な remove
boxel remove myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 3 --y2 3 --z2 3
boxel fill   myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 3 --y2 3 --z2 3 --color "#888888"

# OK: fill だけで上書き
boxel fill myhouse.boxel.json --x1 0 --y1 0 --z1 0 --x2 3 --y2 3 --z2 3 --color "#888888"
```

また `--dry-run` で確認した際に `added: 0` と表示されても、それは「新規ブロックがない」だけであり、色の更新は実際には行われます。

### --hollow を忘れて内部まで埋めてしまう

壁・箱型の建物を作る際は `--hollow` を付けないと内部まで全部埋まります。`fill` 後に `render` で確認するとすぐ気づけます。

### --hollow を単層（y1=y2）で使うと全面埋まる

`--hollow` は「6面の外周シェル」を生成します。単層（y1=y2）では上下面が常に境界と判定されるため、全面が埋まってしまいます。

外周リング（壁のみ、天井・床なし）が欲しいときは `--no-cap` を追加してください。

```bash
# NG: 単層で全面埋まる
boxel fill castle.boxel.json --x1 0 --y1 13 --z1 0 --x2 49 --y2 14 --z2 49 --hollow

# OK: 側面のみ（天井・床なし）
boxel fill castle.boxel.json --x1 0 --y1 13 --z1 0 --x2 49 --y2 14 --z2 49 --hollow --no-cap
```

`--no-cap` は多層の場合も有効です（壁だけ作り、天井・床は別のコマンドで後付けできます）。

### 曲線コマンドで負座標ブロックが生成される

`circle` / `cylinder` / `sphere` / `ellipse` / `surface` は中心 + 半径で計算するため、中心が端に近いと負座標にブロックが出る場合があります。structure レイヤーに負座標ブロックが生成された場合は自動で警告が出ます。

```
Warning: 14 block(s) added at negative coordinates on structure layer.
```

この場合は中心座標を半径分以上内側に移動してください（例: 半径 4 なら cx/cz は 4 以上）。

---

## 8. 発展パターン

### 斜め屋根の作り方

Y 層ごとに `fill` の範囲を1ずつ縮めることで、ピラミッド型の斜め屋根を作れます。

```bash
# 10x10 の家の上に三角屋根を作る例
# Y=5: 10x10（屋根の最下段）
boxel fill house.boxel.json --x1 0 --y1 5 --z1 0 --x2 9 --y2 5 --z2 9 --color "#4a2f08"

# Y=6: 8x8（1ずつ縮める）
boxel fill house.boxel.json --x1 1 --y1 6 --z1 1 --x2 8 --y2 6 --z2 8 --color "#4a2f08"

# Y=7: 6x6
boxel fill house.boxel.json --x1 2 --y1 7 --z1 2 --x2 7 --y2 7 --z2 7 --color "#4a2f08"
```

各 Y 層を `render` で確認しながら進めることを推奨します。

```bash
boxel render house.boxel.json --y 5
boxel render house.boxel.json --y 6
boxel render house.boxel.json --y 7
```

### ストライプ fill（繰り返しパターン）

胸壁（merlon）や格子窓など「N置いてM空ける」繰り返しパターンは `--step-x/--gap-x` と `--step-z/--gap-z` で一発で作れます。

```bash
# 城壁の胸壁: X方向に2ブロック置いて1ブロック空ける
boxel fill castle.boxel.json \
  --x1 0 --y1 15 --z1 0 --x2 49 --y2 15 --z2 0 \
  --color "#888888" --step-x 2 --gap-x 1

# Z方向ストライプ（縦縞）
boxel fill floor.boxel.json \
  --x1 0 --y1 0 --z1 0 --x2 9 --y2 0 --z2 9 \
  --color "#D2B48C" --step-z 2 --gap-z 2

# X・Z 両方を同時に指定すると格子パターン
boxel fill lattice.boxel.json \
  --x1 0 --y1 0 --z1 0 --x2 9 --y2 0 --z2 9 \
  --color "#888888" --step-x 1 --gap-x 1 --step-z 1 --gap-z 1
```

---

## 9. 曲線・曲面プリミティブ

丸みのある形状（円形の塔、ドーム屋根、池など）には専用の曲線コマンドを使います。

### 9.1 `circle` — Y平面上の円

```bash
# リング（外周のみ）
boxel circle tower.boxel.json --cx 5 --cz 5 --r 4 --y 0 --color "#888888"

# 塗りつぶし円
boxel circle tower.boxel.json --cx 5 --cz 5 --r 4 --y 0 --color "#888888" --filled
```

| オプション | 説明 |
|---|---|
| `--cx <n>` | 中心X座標（必須） |
| `--cz <n>` | 中心Z座標（必須） |
| `--r <n>` | 半径（1以上の整数、必須） |
| `--y <n>` | Y座標（必須） |
| `--color <#RRGGBB>` | ブロックカラー（必須） |
| `--filled` | 塗りつぶし（デフォルト: リング） |
| `--layer <structure\|scaffold>` | 対象レイヤー（デフォルト: structure） |
| `--json` | JSON形式出力 |

### 9.2 `cylinder` — 円柱

```bash
# 中空の円柱（塔の壁）
boxel cylinder tower.boxel.json --cx 5 --cz 5 --r 4 --y1 0 --y2 10 --color "#888888"

# 塗りつぶし円柱（柱）
boxel cylinder tower.boxel.json --cx 5 --cz 5 --r 2 --y1 0 --y2 8 --color "#4a2f08" --filled
```

| オプション | 説明 |
|---|---|
| `--cx <n>` | 中心X座標（必須） |
| `--cz <n>` | 中心Z座標（必須） |
| `--r <n>` | 半径（必須） |
| `--y1 <n>` | 開始Y座標（必須） |
| `--y2 <n>` | 終了Y座標（必須） |
| `--color <#RRGGBB>` | ブロックカラー（必須） |
| `--filled` | 塗りつぶし（デフォルト: 中空） |
| `--layer <structure\|scaffold>` | 対象レイヤー（デフォルト: structure） |
| `--json` | JSON形式出力 |

### 9.3 `sphere` — 球体 / ドーム

```bash
# 上半分ドーム（中空）
boxel sphere dome.boxel.json --cx 5 --cy 10 --cz 5 --r 6 --color "#aaaaaa" --half top

# 完全球（中空）
boxel sphere ball.boxel.json --cx 5 --cy 5 --cz 5 --r 5 --color "#888888"

# 塗りつぶし球
boxel sphere ball.boxel.json --cx 5 --cy 5 --cz 5 --r 5 --color "#888888" --filled
```

| オプション | 説明 |
|---|---|
| `--cx <n>` | 中心X座標（必須） |
| `--cy <n>` | 中心Y座標（必須） |
| `--cz <n>` | 中心Z座標（必須） |
| `--r <n>` | 半径（必須） |
| `--color <#RRGGBB>` | ブロックカラー（必須） |
| `--half <top\|bottom\|full>` | 球の半分（デフォルト: full）。`top` は cy 以上、`bottom` は cy 以下 |
| `--filled` | 塗りつぶし（デフォルト: 中空シェル） |
| `--layer <structure\|scaffold>` | 対象レイヤー（デフォルト: structure） |
| `--json` | JSON形式出力 |

### 9.4 `ellipse` — 楕円

```bash
# X方向に広い楕円の広場（塗りつぶし）
boxel ellipse pond.boxel.json --cx 5 --cz 5 --rx 6 --rz 4 --y 0 --color "#4a90d9" --filled

# 楕円リング
boxel ellipse plaza.boxel.json --cx 8 --cz 8 --rx 7 --rz 5 --y 0 --color "#D2B48C"
```

| オプション | 説明 |
|---|---|
| `--cx <n>` | 中心X座標（必須） |
| `--cz <n>` | 中心Z座標（必須） |
| `--rx <n>` | X方向半径（1以上の整数、必須） |
| `--rz <n>` | Z方向半径（1以上の整数、必須） |
| `--y <n>` | Y座標（必須） |
| `--color <#RRGGBB>` | ブロックカラー（必須） |
| `--filled` | 塗りつぶし（デフォルト: リング） |
| `--layer <structure\|scaffold>` | 対象レイヤー（デフォルト: structure） |
| `--json` | JSON形式出力 |

---

### 9.5 使用例：円形の塔

```bash
# 1. ファイル初期化
boxel init tower --json

# 2. 円筒形の壁（半径4、高さ11層）
boxel cylinder tower.boxel.json --cx 5 --cz 5 --r 4 --y1 0 --y2 10 --color "#888888" --json

# 3. 断面確認
boxel render tower.boxel.json --y 5

# 4. 円形の天井板
boxel circle tower.boxel.json --cx 5 --cz 5 --r 4 --y 11 --color "#888888" --filled --json

# 5. バリデーション
boxel validate tower.boxel.json --json
```

### 9.6 使用例：ドーム屋根

```bash
# 1. 既存の建物に続けてドームを追加
# 建物の屋上が Y=10 にあるとして

# 2. ドーム（上半分）を乗せる
boxel sphere building.boxel.json --cx 5 --cy 10 --cz 5 --r 5 --color "#aaaaaa" --half top --json

# 3. 断面確認（ドームの中段）
boxel render building.boxel.json --y 13

# 4. バリデーション
boxel validate building.boxel.json --json
```

### 9.7 使用例：楕円形の池

```bash
# 1. ファイル初期化
boxel init pond --json

# 2. 池の水面（楕円、塗りつぶし）
boxel ellipse pond.boxel.json --cx 6 --cz 4 --rx 6 --rz 4 --y 0 --color "#4a90d9" --filled --json

# 3. 断面確認
boxel render pond.boxel.json --y 0

# 4. バリデーション
boxel validate pond.boxel.json --json
```

### 9.5 `surface` — パラメトリック曲面

パラメトリック曲面 S(u,v) をボクセル座標列に変換して書き込みます。

#### 共通オプション

| オプション | 説明 | デフォルト |
|---|---|---|
| `--type <type>` | 曲面タイプ（必須）: `torus` / `paraboloid` / `wave` / `gaussian` / `saddle` | — |
| `--color <#RRGGBB>` | ブロックカラー（必須） | — |
| `--cx <n>` | 中心X座標 | 0 |
| `--cy <n>` | 中心Y座標 | 0 |
| `--cz <n>` | 中心Z座標 | 0 |
| `--layer <structure\|scaffold>` | 対象レイヤー | structure |
| `--samples <n>` | サンプル数 N（N×N でサンプリング） | 80 |
| `--json` | JSON形式出力 | — |

#### `torus`（ドーナツ形）

```
u, v ∈ [0, 2π]
x = (R + r·cos u)·cos v
y = r·sin u
z = (R + r·cos u)·sin v
```

```bash
boxel surface torus.json --type torus --cx 5 --cy 5 --cz 5 --R 4 --r 1.5 --color "#888888"
```

| オプション | 説明 |
|---|---|
| `--R <n>` | 大半径（必須） |
| `--r <n>` | 小半径（必須） |

#### `paraboloid`（放物面・お椀形）

```
u, v ∈ [-range, range]
x = u,  y = a·u² + b·v²,  z = v
```

```bash
boxel surface bowl.json --type paraboloid --cx 5 --cy 0 --cz 5 --a 0.4 --b 0.4 --range 5 --color "#8B4513"
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--a <n>` | a 係数（必須） | — |
| `--b <n>` | b 係数（必須） | — |
| `--range <n>` | u/v の範囲 | 5 |

#### `wave`（波面）

```
u, v ∈ [-range, range]
x = u,  y = amplitude · sin(kx·u) · sin(kz·v),  z = v
```

```bash
boxel surface wave.json --type wave --cx 0 --cy 5 --cz 0 --amplitude 3 --kx 0.6 --kz 0.6 --range 10 --color "#4a90d9"
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--amplitude <n>` | 振幅（必須） | — |
| `--kx <n>` | x 周波数（必須） | — |
| `--kz <n>` | z 周波数（必須） | — |
| `--range <n>` | u/v の範囲 | 10 |

#### `gaussian`（ガウシアン丘）

```
u, v ∈ [-range, range]
x = u,  y = amplitude · exp(-(u²/(2·σx²) + v²/(2·σz²))),  z = v
```

```bash
boxel surface hill.json --type gaussian --cx 5 --cy 0 --cz 5 --amplitude 6 --sigma-x 3 --sigma-z 3 --range 8 --color "#5A7A4A"
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--amplitude <n>` | 高さ（必須） | — |
| `--sigma-x <n>` | x 広がり（必須） | — |
| `--sigma-z <n>` | z 広がり（必須） | — |
| `--range <n>` | u/v の範囲 | 8 |

#### `saddle`（鞍面・双曲放物面）

```
u, v ∈ [-range, range]
x = u,  y = a·u² - b·v²,  z = v
```

```bash
boxel surface saddle.json --type saddle --cx 5 --cy 5 --cz 5 --a 0.3 --b 0.3 --range 5 --color "#888888"
```

| オプション | 説明 | デフォルト |
|---|---|---|
| `--a <n>` | a 係数（必須） | — |
| `--b <n>` | b 係数（必須） | — |
| `--range <n>` | u/v の範囲 | 5 |

---

### 9.9 render で確認する手順

曲線コマンド実行後は `render` で形状を確認してください。

```bash
# circle / ellipse の場合（Y=0 の断面）
boxel render file.boxel.json --y 0

# cylinder の場合（中間層の断面）
boxel render file.boxel.json --y 5

# sphere の場合（中心層と上下を確認）
boxel render file.boxel.json --y 5   # 中心（最大径）
boxel render file.boxel.json --y 8   # 上部（縮まっているはず）
boxel render file.boxel.json --y 2   # 下部（縮まっているはず）

# surface の場合（曲面の形状を断面ごとに確認）
boxel render file.boxel.json --y 5   # 中心層付近
boxel render file.boxel.json --y 8   # 高い層
boxel render file.boxel.json --y 2   # 低い層
```
