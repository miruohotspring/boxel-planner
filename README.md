# boxel-planner

Minecraft などのボクセル系ゲームにおける建築を支援するツールセット。
LLM（Claude / Codex など）が操作できる CLI と、設計図をグラフィカルに確認・編集できる Web UI で構成されます。

---

## 概要

```
┌─────────────────────────────────────────────────┐
│  LLM (Claude / Codex)                           │
│    ↓  自然言語で指示                              │
│  boxel-cli  ←→  設計図ファイル (.boxel.json)     │
│                     ↓  インポート                 │
│               boxel-web (Web UI)                 │
└─────────────────────────────────────────────────┘
```

---

## LLM Docs

- フルガイド: [docs/llm-guide.md](docs/llm-guide.md)
- 入口ルータ: [docs/llm-guide/README.md](docs/llm-guide/README.md)
- 建築タイプ別: [docs/llm-guide/by-building-type.md](docs/llm-guide/by-building-type.md)
- 構造別: [docs/llm-guide/by-structure.md](docs/llm-guide/by-structure.md)

---

## 設計図ファイル形式 `.boxel.json`

### 概念

設計図は **本体ブロック** と **足場ブロック** の 2 層で構成されます。

- **本体 (structure)** : 実際にゲーム内で建てるブロック
- **足場 (scaffold)** : 建設時に使う仮設の骨組み。3D プリンターのサポート材のようなイメージ

### 座標系

右手系 XYZ。Y が高さ方向。原点は構造物の任意の基準点。

### 推奨スケール

- 推奨規約として `1 block = 1 meter` とみなす
- ファイル形式自体は抽象座標のままだが、実在建築やサイズ指定ではこの換算を使う
- 例: 幅 50 の建物は、おおむね幅 50m 級として考える

### 推奨座標規約

- `x,z`: 建物の中心を `(0,0)` に置く
- `y`: 一番下の床を `0` に置く
- 奇数幅の建物は中心ブロックを `x=0` / `z=0` に置ける
- 偶数幅の建物は中心線が `0.5` ずれるため、`-24..23` のように原点付近へ寄せる

### スキーマ

```jsonc
{
  "version": "1.0",
  "name": "My Tower",
  "description": "シンプルな石造りの塔",
  "bounds": {
    "min": { "x": 0, "y": 0, "z": 0 },
    "max": { "x": 9, "y": 19, "z": 9 }
  },
  "structure": [
    { "x": 0, "y": 0, "z": 0, "color": "#888888" },
    { "x": 1, "y": 0, "z": 0, "color": "#888888" }
    // ...
  ],
  "scaffold": [
    { "x": -1, "y": 0, "z": 0, "color": "#F5A623" },
    { "x": -1, "y": 1, "z": 0, "color": "#F5A623" }
    // ...
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `version` | string | フォーマットバージョン |
| `name` | string | 建築名 |
| `description` | string | 任意の説明文 |
| `bounds` | object | 本体の最小・最大座標（自動計算可） |
| `structure` | Block[] | 本体ブロック一覧 |
| `scaffold` | Block[] | 足場ブロック一覧 |

**Block**

| フィールド | 型 | 説明 |
|---|---|---|
| `x`, `y`, `z` | integer | ブロック座標 |
| `color` | string | CSS 16進カラーコード（`#RRGGBB`） |

---

## CLI `boxel-cli`

LLM が読み書きしやすいシンプルな設計。すべてのコマンドは `--json` フラグで機械可読な JSON 出力に切り替え可能。

### インストール（予定）

```bash
npm install -g boxel-cli
```

### コマンド一覧

#### ファイル操作

```bash
# 新規設計図を作成
boxel init <name> [--out <file>]

# 設計図の概要を表示
boxel info <file>

# 設計図を検証（スキーマ整合・重複チェック等）
boxel validate <file>
```

#### ブロック操作

```bash
# ブロックを追加（上書き）
boxel add <file> --x <n> --y <n> --z <n> --color <#RRGGBB> [--layer scaffold]

# ブロックを削除
boxel remove <file> --x <n> --y <n> --z <n> [--layer scaffold]

# 指定座標のブロック情報を取得
boxel get <file> --x <n> --y <n> --z <n>

# 指定 Y 断面のブロック一覧を取得
boxel slice <file> --y <n> [--layer structure|scaffold|all]
```

#### 一括操作

```bash
# 直方体領域を一色で塗りつぶす
boxel fill <file> \
  --x1 <n> --y1 <n> --z1 <n> \
  --x2 <n> --y2 <n> --z2 <n> \
  --color <#RRGGBB> [--hollow]

# 指定範囲を平行移動コピー
boxel copy <file> \
  --x1 <n> --y1 <n> --z1 <n> \
  --x2 <n> --y2 <n> --z2 <n> \
  --dx <n> --dy <n> --dz <n> [--repeat <n>]

# 指定範囲を鏡映コピー
boxel mirror <file> \
  --x1 <n> --y1 <n> --z1 <n> \
  --x2 <n> --y2 <n> --z2 <n> \
  --axis <x|y|z> --origin <n>

# 別ファイルの部品を配置
boxel place <file> \
  --source <part.boxel.json> \
  --x <n> --y <n> --z <n> \
  [--repeat <n>] [--step-x <n>] [--step-y <n>] [--step-z <n>] \
  [--collision <ours|theirs|error>] \
  [--rotate-y <0|90|180|270>] [--mirror <x|z>]

# 設計図を XZ 中心 / 底面 Y=0 に寄せる
boxel recenter <file>

# 足場を自動生成（外周フレーム + 柱）
boxel scaffold generate <file> [--margin <n>]

# 足場をクリア
boxel scaffold clear <file>
```

#### 曲線・曲面プリミティブ

```bash
# Y平面に円を描く
boxel circle <file> --cx <n> --cz <n> --r <n> --y <n> --color <#RRGGBB> [--filled]

# 円柱を作る
boxel cylinder <file> --cx <n> --cz <n> --r <n> --y1 <n> --y2 <n> --color <#RRGGBB> [--filled]

# 張り出し付き段屋根を作る
boxel roof <file> --x1 <n> --z1 <n> --x2 <n> --z2 <n> --y <n> --layers <n> --color <#RRGGBB>

# 中央が盛り上がる破風を作る
boxel gable <file> --face <north|south|east|west> --center <n> --base <n> --y <n> --width <n> --height <n> --depth <n> --color <#RRGGBB>

# 尖塔を段積みで作る
boxel spire <file> --cx <n> --cz <n> --y <n> --radii <4,3,2,1> --color <#RRGGBB> [--cap-color <#RRGGBB>]

# 球やドームを作る
boxel sphere <file> --cx <n> --cy <n> --cz <n> --r <n> --color <#RRGGBB> [--filled]

# 楕円を描く
boxel ellipse <file> --cx <n> --cz <n> --rx <n> --rz <n> --y <n> --color <#RRGGBB> [--filled]

# 数式曲面を生成する
boxel surface <file> --type <torus|paraboloid|wave|gaussian|saddle> --color <#RRGGBB> ...
```

#### 出力

```bash
# 断面図をテキストで出力（LLM 確認用）
boxel render <file> --y <n>

# TOP/FRONT/SIDE の正射影をまとめて確認
boxel ortho <file>

# 可視面の座標値で穴・段差を確認
boxel ortho <file> --mode coord

# 必要な面だけ切り出す
boxel ortho <file> --mode coord --view front

# 座標値を点字ヒートマップで見る
boxel ortho <file> --mode coord --style braille --view top

# サイズ制約を検証（例: 幅50m級に収まるか）
boxel check <file> --max-x 50 --max-y 35 --max-z 50

# 門から内部まで通れるか確認
boxel check-access <file> --from 0,4,-5 --to 0,8,10

# 例:
# Y=0 断面:
# ##########
# #        #
# #        #
# ##########
```

### LLM 向け利用イメージ

```
[Human → LLM への指示例]
"10x10 の石造りの塔（高さ 15）を設計して boxel-cli で出力して"

[LLM が実行するコマンド列]
boxel init "Stone Tower" --out tower.boxel.json
boxel fill tower.boxel.json --x1 0 --y1 0 --z1 0 --x2 9 --y2 14 --z2 9 \
  --color #888888 --hollow
boxel scaffold generate tower.boxel.json
boxel info tower.boxel.json --json
```

---

## Web UI `boxel-web`

### 機能一覧

| 機能 | 説明 |
|---|---|
| ファイルインポート | `.boxel.json` をドラッグ＆ドロップまたは選択 |
| 3D ビュー | ボクセルを Three.js でレンダリング。回転・拡大縮小・移動対応 |
| 2D 断面ビュー | Y 軸方向にスライスした断面を 1 段ずつ表示 |
| 断面編集 | 2D ビュー上でクリック・ドラッグによるブロックの追加・削除・色変更 |
| 足場表示トグル | 足場の表示/非表示を切り替え |
| カラーパレット | よく使う色をパレットに登録し、ワンクリックで選択 |
| エクスポート | 編集後の設計図を `.boxel.json` として保存 |

### UI レイアウト（概念図）

```
┌──────────────────────────────────────────────────┐
│  [Import]  [Export]    [3D] [2D]  [足場: ON/OFF]  │  ← ツールバー
├────────────────────────────┬─────────────────────┤
│                            │  Color Palette       │
│                            │  ■ ■ ■ ■ ■ ■        │
│   3D / 2D ビュー           │──────────────────── │
│                            │  Layer: Y = [  3 ]   │
│                            │  ← 1 段ずつスライド →  │
│                            │──────────────────── │
│                            │  建築名: My Tower    │
│                            │  ブロック数: 1,234   │
└────────────────────────────┴─────────────────────┘
```

### 操作

**3D ビュー**
- 左ドラッグ: 回転
- 右ドラッグ / 中ドラッグ: 移動
- スクロール: ズーム

**2D ビュー（編集モード）**
- 左クリック: 選択中の色でブロックを配置
- 右クリック: ブロックを削除
- `Y` スライダー: 表示する断面を切り替え

---

## Getting Started

### 必要環境

- Node.js 18 以上
- npm 9 以上

### インストール

```bash
git clone https://github.com/miruohotspring/boxel-planner.git
cd boxel-planner
npm install
```

### ビルド（CLI）

```bash
npm run build
```

schema → cli の順に自動でビルドされます。

### CLI を使う

```bash
# 新規設計図を作成
node packages/cli/dist/index.js init "My House" --out my-house.boxel.json

# 5x5x5 の中空の家を作る
node packages/cli/dist/index.js fill my-house.boxel.json \
  --x1 0 --y1 0 --z1 0 --x2 4 --y2 4 --z2 4 \
  --color "#8B4513" --hollow

# 断面を確認（LLM はこれで現状を把握する）
node packages/cli/dist/index.js render my-house.boxel.json --y 2

# 足場を自動生成
node packages/cli/dist/index.js scaffold generate my-house.boxel.json
```

`boxel` コマンドとしてパスに通したい場合：

```bash
cd packages/cli && npm link
boxel --help
```

### Web UI を起動する

```bash
npm run dev:web
# → http://localhost:5173
```

ブラウザで `.boxel.json` をドラッグ＆ドロップして読み込めます。

### LLM（Claude / Codex）と使う

`docs/llm-guide.md` を LLM のシステムプロンプトまたは会話の冒頭に渡してください。
ガイドに従って LLM が `boxel` コマンドを組み合わせて設計図を作成します。

---

## 技術スタック（予定）

| レイヤー | 技術 |
|---|---|
| CLI | Node.js + TypeScript, Commander.js |
| Web UI フレームワーク | React + TypeScript + Vite |
| 3D レンダリング | Three.js（@react-three/fiber） |
| 2D 編集 Canvas | React + Canvas API |
| スタイリング | Tailwind CSS |
| ファイル形式 | JSON（`zod` でスキーマ検証） |

---

## リポジトリ構成（予定）

```
boxel-planner/
├── packages/
│   ├── schema/        # 設計図ファイルの型定義・バリデーション（共有）
│   ├── cli/           # boxel-cli
│   └── web/           # boxel-web
├── docs/
│   ├── file-format.md # 設計図ファイル仕様詳細
│   └── cli-guide.md   # LLM 向け CLI 操作ガイド
└── README.md
```

---

## ロードマップ

- [x] `packages/schema` : ファイル形式定義・バリデーター
- [x] `packages/cli` : 基本コマンド実装
- [x] `packages/cli` : 足場自動生成
- [x] `packages/web` : 3D ビュー
- [x] `packages/web` : 2D 断面ビュー
- [x] `packages/web` : 2D 編集機能
- [x] `packages/web` : カラーパレット
- [x] ドキュメント整備（`docs/llm-guide.md`）
