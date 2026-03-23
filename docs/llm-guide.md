# boxel-planner LLM ガイド

このドキュメントは Claude・Codex などの LLM が `boxel` CLI を操作して `.boxel.json` 設計図を作成・編集するためのリファレンスです。

短い導線が欲しい場合は、用途別の入口ファイルも使えます。

- 建築タイプから入る: [docs/llm-guide/by-building-type.md](./llm-guide/by-building-type.md)
- 構造パターンから入る: [docs/llm-guide/by-structure.md](./llm-guide/by-structure.md)
- 人間スケールと開口設計: [docs/llm-guide/human-scale-and-openings.md](./llm-guide/human-scale-and-openings.md)
- プリミティブ早見表: [docs/llm-guide/primitives.md](./llm-guide/primitives.md)
- 部品合成と対称配置: [docs/llm-guide/composition.md](./llm-guide/composition.md)
- 失敗時の見直し: [docs/llm-guide/troubleshooting.md](./llm-guide/troubleshooting.md)

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
  "palette": [
    {
      "name": "stone-main",
      "color": "#888888",
      "description": "主壁の石材色"
    },
    {
      "name": "roof-dark",
      "color": "#3E5FA8",
      "description": "屋根の濃色"
    }
  ],
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
| `palette` | 推奨カラーパレット定義。各要素は `name` / `color` / `description` を持つ |
| `bounds` | 全ブロックを包む AABB（fill/add 後に自動再計算） |

### 座標系

- **Y が高さ方向**（上へ行くほど Y が増える）
- X は東西、Z は南北
- 座標はすべて整数

### 推奨スケール【重要】

建築タスクでは、推奨規約として **`1 block = 1 meter`** とみなしてください。

- ファイル形式自体は抽象座標のままです
- ただし、実在建築の再現や「50x50x50 くらい」のような指示は、基本的に `50m 級` と読んで構いません
- 例: 高さ 12m の門楼を作りたいなら、まず `y=0..11` 前後で考えます
- 壁厚は原則 `1 block`、重厚な石造表現でも `2 block` までを基本としてください。`3 block` 以上は意図が明確な場合に限ります

### 人間スケール規約【重要】

人が使う建築では、見た目より先に次を守ってください。

- 通行可能な段差は `1 block = 1 meter` まで
- `2 block` 以上の段差は通行不可能として扱う
- 出入口の開口高さは `2 block = 2 meter`
- 内部の実行動空間の高さは最低 `3 block = 3 meter`
- 原則は `ドア 2m / 天井 3m 以上`

特に駅舎、門、ホール、塔の入口では、床高さと開口高さを最初に固定してください。
入口まわりの段差や意図しない抜け穴は、見た目が良くても設計ミスとして扱います。

### 推奨座標規約【重要】

ファイル形式そのものは絶対座標ですが、建築タスクでは次の規約を標準にしてください。

- `x,z`: 建物の中心を `(0,0)` に置く
- `y`: 建物の一番下の床を `0` に置く
- 部品ファイルも同様に、`place` で置きたい基準点を `(0,0,0)` に寄せる

例:
- 幅 49 の塔: `x = -24 .. 24` に置くと中心が `0`
- 幅 48 の建物: `x = -24 .. 23` または `x = -23 .. 24` のように原点付近へ寄せる

偶数幅では中心線が `0.5` ずれるため、`0` に中心ブロックは置けません。その場合でも「原点の近くに中心線が来る」ように配置してください。

### カラー指定

- `#RRGGBB` 形式のみ（例: `#888888`、`#8B4513`）
- 小文字も可（`#aaaaaa` など）

### 推奨カラーパレット規約【重要】

ユーザーから色指定がない場合、建築を始める前にトップレベル `palette` を先に定義してください。

- まず用途ごとに `10〜30` 色程度のパレットを作る
- 各要素は `name`, `color`, `description` を持つ
- `name` は短い識別子、`description` は何に使う色かを明記する
- 実作業では、定義した `palette` から色を選んで `fill` / `add` / `roof` / `spire` に使う
- 白い城でも `白1色 + 灰1色` では足りません。主壁、縁石、影、屋根、窓奥、金物、地盤などを分けてください

例:

```json
"palette": [
  { "name": "main-wall", "color": "#E7EBF2", "description": "主壁の白い石材" },
  { "name": "trim-white", "color": "#F8FAFD", "description": "窓回りや塔の縁石" },
  { "name": "roof-blue", "color": "#4A5C8F", "description": "尖塔の青い屋根" },
  { "name": "window-deep", "color": "#20314E", "description": "窓の奥行きと影" }
]
```

---

## 3. LLM が使うべきコマンドフロー

以下の順序で操作します。

### Step 1: `init` で空ファイルを作る

```bash
boxel init myhouse --json
# => { "ok": true, "data": { "file": "myhouse.boxel.json", ... } }
```

`init` 直後は空ファイルなので原点は未確定です。最初の床や中心塔を置くときに、上の推奨座標規約に合わせて座標を決めてください。
また、ユーザーから色指定がない場合は、この段階で `palette` を用途別に `10〜30` 色程度追加してから作業を始めてください。

```bash
boxel palette add myhouse.boxel.json \
  --name main-wall \
  --color "#E7EBF2" \
  --description "主壁の白い石材"

boxel palette add myhouse.boxel.json \
  --name roof-blue \
  --color "#4A5C8F" \
  --description "主屋根の青いスレート"

boxel palette list myhouse.boxel.json
```

### Step 2: `fill` や `add` で構造を作る

```bash
# 範囲を一括で埋める（最も多用するコマンド）
boxel fill myhouse.boxel.json --x1 -4 --y1 0 --z1 -3 --x2 4 --y2 0 --z2 3 --color "#8B4513"

# 外周のみ（--hollow で壁・箱型を作る）
boxel fill myhouse.boxel.json --x1 -4 --y1 1 --z1 -3 --x2 4 --y2 5 --z2 3 --color "#8B4513" --hollow

# 外周のうち側面のみ（天井・床なし）→ 城壁や単層の外周リングに使う
boxel fill myhouse.boxel.json --x1 -4 --y1 1 --z1 -3 --x2 4 --y2 5 --z2 3 --color "#8B4513" --hollow --no-cap

# ストライプ fill（X方向: 2置いて1空け → 胸壁パターンなど）
boxel fill wall.boxel.json --x1 0 --y1 10 --z1 0 --x2 49 --y2 10 --z2 0 --color "#888888" --step-x 2 --gap-x 1

# 単体ブロックを追加
boxel add myhouse.boxel.json --x 0 --y 3 --z -3 --color "#ADD8E6"

# 単体ブロックを削除（窓穴など）
boxel remove myhouse.boxel.json --x -1 --y 2 --z -3
```

> **上書き挙動について:** `fill` と `add` は既存ブロックを上書きします。色を変更したいだけなら `remove` は不要です。直接 `fill` を実行すれば色が更新されます。
>
> 出力の `added` は新規ブロック数、`updated` は色が変わった既存ブロック数です。色変更だけのとき `added: 0, updated: N` と表示されますが、ファイルは正常に更新されています。

### Step 2.5: 部品配置や対称・反復は `place` / `copy` / `mirror` を使う

大きな建築物では、部品を別ファイルで作って配置したり、片側だけ作って複製した方が速くて精度も安定します。

```bash
# 塔の部品を別ファイルから配置
boxel place castle.boxel.json \
  --source big_tower.boxel.json \
  --x 36 --y 0 --z 18 \
  --collision error

# 同じ部品を回転して反対向きに配置
boxel place castle.boxel.json \
  --source gate_wing.boxel.json \
  --x 8 --y 0 --z 20 \
  --rotate-y 180 --mirror x \
  --collision theirs

# 角塔を 4 本並べる
boxel place castle.boxel.json \
  --source corner_tower.boxel.json \
  --x -18 --y 0 --z -18 \
  --repeat 2 --step-x 36 \
  --collision error

# 左右対称の翼棟を片側から複製
boxel mirror castle.boxel.json \
  --x1 4 --y1 0 --z1 10 \
  --x2 18 --y2 20 --z2 30 \
  --axis x --origin 24.5

# 窓や柱を等間隔で並べる
boxel copy castle.boxel.json \
  --x1 8 --y1 5 --z1 12 \
  --x2 9 --y2 8 --z2 12 \
  --dx 4 --dy 0 --dz 0 --repeat 5
```

使い分け:
- `place`: 別ファイルで作った部品を合成する
- `mirror`: 左右対称・前後対称・上下対称の複製
- `copy`: 窓列、柱列、胸壁、連続アーチなどの反復

`mirror --origin` は整数だけでなく `.5` も使えます。たとえば `--axis x --origin 24.5` は X=24 と X=25 の間を鏡面にします。
`place` は source 側のローカル原点 `(0,0,0)` を target 側の `(--x, --y, --z)` に合わせて配置します。
`place` の変換順は `mirror -> rotate-y -> translate` です。
`place --repeat` は開始位置を含む配置回数です。`repeat > 1` のときは少なくとも 1 つの `--step-x/--step-y/--step-z` を指定してください。

既存ファイルをこの規約へ寄せたいときは `recenter` を使います。

```bash
boxel recenter castle.boxel.json --json
# => structure の底面 Y が 0 になり、XZ 中心が原点付近へ移動する
```

### Step 3: 形状を確認する【重要】

**テキストでの状態確認は render / ortho / check が中心です。必ず確認してから次のステップへ進んでください。**

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

実在建築の正面再現では、`FRONT` で立面、`SIDE` で屋根勾配と奥行きを確認すると詰めやすくなります。

見やすくする補助オプション:

```bash
boxel ortho myhouse.boxel.json --crop structure --center --grid 5
boxel ortho myhouse.boxel.json --highlight-color "#20314E"
boxel ortho myhouse.boxel.json --verbose
```

#### `ortho --mode coord` — 可視面の座標値で穴や段差を確認

`solid` モードの `■` 表示では、シルエットは見えても「どの高さ/奥行きの面が見えているか」は分かりません。`coord` モードでは、各セルに見えている面の座標値を表示します。

- `TOP`: 各 `(x,z)` で見えている最上面の `y`
- `FRONT`: 各 `(x,y)` で手前に見える `z`
- `SIDE`: 各 `(z,y)` で手前に見える `x`
- 空白: その視線方向にブロックが存在しない

```bash
boxel ortho shuri.boxel.json --mode coord
boxel ortho shuri.boxel.json --mode coord --view front
boxel ortho shuri.boxel.json --mode coord --style braille --view top
```

値が周囲から急に飛ぶ場所は、吹き抜け、段差、開口の候補として読み取りやすくなります。
巨大モデルでは `--view top|front|side` で1面だけに絞ると読みやすくなります。
さらに全体傾向だけ素早く見たい場合は `--style braille` で 9 段階の点字ヒートマップにできます。

#### `check` — サイズ制約を機械的に確認【仕上げ前に必須】

`1 block = 1 meter` の規約で作っている場合、幅 50m 級に収まっているかを最後に `check` で検証します。

```bash
boxel check shuri.boxel.json --max-x 50 --max-y 35 --max-z 50
```

出力例:

```text
PASS: size constraints satisfied
Target: structure
Bounds: (-24, 0, -22) -> (24, 30, 21)
Size:   49 x 31 x 44
X: 49 <= 50  OK
Y: 31 <= 35  OK
Z: 44 <= 50  OK
```

足場込みで見たい場合は `--target all` を使います。

#### `check-access` — 2点間の通り抜けを確認【門や内部導線の検証用】

空間内の2点の間に、ブロックを貫通せず到達できるかを BFS で検証します。

```bash
boxel check-access shuri.boxel.json --from 0,4,-5 --to 0,8,10
```

出力例:

```text
PASS: path exists
From: (0, 4, -5)
To:   (0, 8, 10)
Bounds: (-25, -1, -23) -> (25, 31, 22)
Visited: 1860
Distance: 19
```

足場も障害物として扱いたい場合は `--include-scaffold` を付けます。

注意:
- `check-access` は空セル同士の BFS なので、頭上クリアランスや「人が立てる高さ」は検証しません
- 人間スケールの確認には `render --y 1`, `render --y 2`, `render --y 3` と `ortho --mode coord` を併用してください

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

推奨規約も合わせて見たいときは lint を使います。

```bash
boxel validate myhouse.boxel.json --lint
boxel validate myhouse.boxel.json --lint --strict-lint
```

現在の lint:

- 壁厚 heuristic: exposed face から見た連続厚みが `--max-wall-thickness` を超えないか
- 色数: `palette` があればその件数、なければ structure 使用色数が `--min-colors` 以上か

### Step 6: `info --json` で機械可読な概要取得

```bash
boxel info myhouse.boxel.json --json
# => { "ok": true, "data": { "structureBlocks": 156, "bounds": { ... }, "structureBounds": { ... } } }
```

`scaffold generate` の後は `bounds` が足場込みになるため、実建築サイズを見たいときは `structureBounds` を参照してください。

### 大きめ建築の進め方

城や駅舎のような大きな建築では、次の順で進めると崩れにくくなります。

1. `fill` / `cylinder` / `roof` / `gable` / `spire` でシルエットの主ボリュームだけ作る
2. `ortho --y-min 1` で TOP / FRONT / SIDE の見え方を確認する
3. 大きい部品は別ファイルで作って `place` で合成する
4. 片側だけ細部を作り、`mirror` で反対側へ複製する
5. 窓や柱は `copy --repeat` で等間隔に並べる
6. 最後に `render --color` で装飾や配色を確認する

最初から窓や胸壁を彫り込み始めると、全体比率が崩れたときの手戻りが大きくなります。先に「遠目のシルエット」を決めてから細部へ進んでください。

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

### 負の x,z を避けようとして形が崩れる

推奨座標規約では、`x,z` は建物中心が原点付近に来るように置くため、負座標になって構いません。特に左右対称の建物や `place` 用の部品では、負の `x,z` は普通に発生します。

注意すべきなのは `y` だけです。床基準を `y=0` にそろえる前提なので、structure のブロックが `y<0` に出ると警告が出ます。

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

### 曲線コマンドで y<0 のブロックが生成される

`circle` / `cylinder` / `sphere` / `ellipse` / `surface` は中心 + 半径で計算するため、意図せず structure のブロックが `y<0` に出る場合があります。負の `x,z` は問題ありませんが、`y<0` は床より下に潜るため自動で警告が出ます。

```
Warning: 14 block(s) added below Y=0 on structure layer. Consider adjusting height or origin.
```

この場合は `cy` や高さ方向の開始位置を見直してください。例えば半径 4 の球なら、少なくとも `cy=4` 以上にすると底面が `y=0` 未満へはみ出しません。

---

## 8. 発展パターン

### 対称建築の作り方

宮殿・城・寺院のような左右対称建築は、中央線を先に決めてから片側だけ作るのが基本です。

```bash
# 左半分だけ作ったあと、右半分へ鏡映
boxel mirror palace.boxel.json \
  --x1 0 --y1 0 --z1 0 \
  --x2 24 --y2 30 --z2 40 \
  --axis x --origin 24.5 --json
```

ポイント:
- 中央線がブロック列の真ん中なら `origin` は整数
- 中央線が 2 列の間なら `origin` は `.5`
- 先に中央塔だけ作っておくと、左右の翼棟サイズを合わせやすい

### 反復パーツの作り方

窓列、列柱、胸壁のような反復パーツは `copy` を使います。

```bash
# 2x3 の窓を 6 個並べる
boxel copy facade.boxel.json \
  --x1 6 --y1 5 --z1 0 \
  --x2 7 --y2 7 --z2 0 \
  --dx 4 --dy 0 --dz 0 --repeat 5 --json
```

`copy` は毎回「元の選択範囲」から複製します。1 回目のコピー結果をさらにコピーするのではなく、同じ間隔で N 個並べたいときに使ってください。

### 部品を合成する (`place`)

土台・中央塔・左右の塔を別々のファイルで作って、最後に 1 つへ合成できます。

```bash
# 空の土台に中央塔を配置
boxel place castle.boxel.json \
  --source center_tower.boxel.json \
  --x 24 --y 0 --z 18 \
  --collision error --json

# 左右の塔をそれぞれ配置
boxel place castle.boxel.json \
  --source side_tower.boxel.json \
  --x 10 --y 0 --z 20 \
  --collision ours --json

boxel place castle.boxel.json \
  --source side_tower.boxel.json \
  --x 38 --y 0 --z 20 \
  --collision ours --json

# 同じ塔を等間隔に 3 本置く
boxel place castle.boxel.json \
  --source buttress.boxel.json \
  --x -12 --y 0 --z 8 \
  --repeat 3 --step-x 12 \
  --collision error --json
```

`--collision` の意味:
- `error`: 既存ブロックと 1 つでも重なったら失敗
- `ours`: target 側を優先し、重なった source ブロックは置かない
- `theirs`: source 側を優先し、重なった target ブロックを置き換える

`--include structure|scaffold|all` で、source のどのレイヤーを持ってくるか選べます。既定値は `all` です。
`--rotate-y 90|180|270` で source をローカル原点まわりに回転できます。`90` は `(x,z) -> (-z,x)` です。
`--mirror x|z` は source をローカル原点に対して反転します。
`--repeat <n>` は開始位置を含む総配置回数です。反復間隔は `--step-x/--step-y/--step-z` で指定します。

### 斜め屋根の作り方

矩形屋根なら `roof` を使うのが一番楽です。基準矩形に対して張り出し (`--overhang-*`) と段ごとの縮小 (`--shrink-*`) を指定できます。

```bash
# 10x10 の家に 1 ブロック張り出した 3 段屋根
boxel roof house.boxel.json \
  --x1 0 --z1 0 --x2 9 --z2 9 \
  --y 5 --layers 3 \
  --overhang-x 1 --overhang-z 1 \
  --color "#4a2f08"
```

`roof` で足りない特殊形状だけを、従来どおり `fill` 段積みで微調整すると効率がよいです。

```bash
# 手作業で微調整したい場合
boxel fill house.boxel.json --x1 0 --y1 5 --z1 0 --x2 9 --y2 5 --z2 9 --color "#4a2f08"
boxel fill house.boxel.json --x1 1 --y1 6 --z1 1 --x2 8 --y2 6 --z2 8 --color "#4a2f08"
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

## 9. 形状プリミティブ

屋根・破風・円塔・ドームなど、箱以外の形状には専用プリミティブを使います。

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

### 9.5 `roof` — 張り出し付きの段屋根

`roof` は基準矩形から、張り出しのある段屋根を生成します。深い軒や大きい瓦屋根を作るときに使います。

```bash
boxel roof palace.boxel.json \
  --x1 -12 --z1 -4 --x2 12 --z2 8 \
  --y 10 --layers 4 \
  --overhang-x 2 --overhang-z 3 \
  --color "#2F313A"
```

| オプション | 説明 |
|---|---|
| `--x1 <n>` `--z1 <n>` | 基準矩形の開始座標（必須） |
| `--x2 <n>` `--z2 <n>` | 基準矩形の終了座標（必須） |
| `--y <n>` | 開始Y座標（必須） |
| `--layers <n>` | 屋根の段数（必須） |
| `--overhang-x <n>` | X方向の張り出し量 |
| `--overhang-z <n>` | Z方向の張り出し量 |
| `--shrink-x <n>` | 各段での X方向縮小量（デフォルト: 1） |
| `--shrink-z <n>` | 各段での Z方向縮小量（デフォルト: 1） |
| `--color <#RRGGBB>` | ブロックカラー（必須） |
| `--layer <structure\|scaffold>` | 対象レイヤー |
| `--json` | JSON形式出力 |

### 9.6 `gable` — 段状の破風 / 向拝

`gable` は正面中央だけが盛り上がる装飾面を作ります。首里城の唐破風、門の破風、寺社の向拝に使えます。

```bash
boxel gable shuri.boxel.json \
  --face north --center 0 --base -3 \
  --y 12 --width 15 --height 4 --depth 3 \
  --color "#E16452"
```

| オプション | 説明 |
|---|---|
| `--face <north\|south\|east\|west>` | 張り出す向き（必須） |
| `--center <n>` | 幅方向の中心。偶数幅では `.5` を使える |
| `--base <n>` | 取り付け面の基準座標 |
| `--y <n>` | 開始Y座標 |
| `--width <n>` | 最下段の幅 |
| `--height <n>` | 高さ（段数） |
| `--depth <n>` | 最下段の張り出し量 |
| `--shrink <n>` | 各段で左右を縮める量（デフォルト: 1） |
| `--inset <n>` | 各段で張り出しを減らす量（デフォルト: 1） |
| `--color <#RRGGBB>` | ブロックカラー（必須） |
| `--layer <structure\|scaffold>` | 対象レイヤー |
| `--json` | JSON形式出力 |

---

### 9.7 `spire` — 段積みの尖塔 / 屋根

`spire` は各層の半径を下から順に積みます。城の尖塔、塔屋根、段付きの青屋根を作るときに使います。

```bash
# 半径 4,3,3,2,2,1 の尖塔を積み、最後に金色の頂点を置く
boxel spire castle.boxel.json \
  --cx 0 --cz 0 --y 20 \
  --radii 4,3,3,2,2,1 \
  --color "#3E5FA8" \
  --cap-color "#D8B343"
```

| オプション | 説明 |
|---|---|
| `--cx <n>` | 中心X座標（必須） |
| `--cz <n>` | 中心Z座標（必須） |
| `--y <n>` | 開始Y座標（必須） |
| `--radii <list>` | 各層の半径をカンマ区切りで指定（必須） |
| `--color <#RRGGBB>` | 本体色（必須） |
| `--cap-color <#RRGGBB>` | 先端ブロック色（任意） |
| `--layer <structure\|scaffold>` | 対象レイヤー（デフォルト: structure） |
| `--json` | JSON形式出力 |

---

### 9.8 使用例：円形の塔

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

### 9.9 使用例：ドーム屋根

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

### 9.10 使用例：楕円形の池

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

### 9.11 `surface` — パラメトリック曲面

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

### 9.12 render で確認する手順

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
