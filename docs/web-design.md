# packages/web 設計ドキュメント

## 役割

`.boxel.json` 設計図ファイルを視覚的に確認・編集するブラウザアプリケーション。
3D ビューでボクセル構造全体を確認し、2D 断面ビューで層ごとの編集を行う。

---

## ファイル構成

```
packages/web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx               # レイアウト全体・状態の頂点
│   ├── components/
│   │   ├── Toolbar.tsx       # import/export/view切替/scaffold toggle
│   │   ├── View3D.tsx        # @react-three/fiber ボクセル3Dビュー
│   │   ├── View2D.tsx        # Canvas 2D断面ビュー（編集対応）
│   │   ├── Sidebar.tsx       # パレット + Yスライダー + 統計情報
│   │   └── ColorPalette.tsx  # カラーパレット（選択・プリセット）
│   ├── hooks/
│   │   ├── useBlueprint.ts   # Blueprint state 管理（CRUD操作）
│   │   └── useColorPalette.ts # パレット状態管理
│   └── lib/
│       ├── importExport.ts   # ファイル読み書きロジック
│       └── colors.ts         # デフォルトカラープリセット
```

---

## 状態管理

### トップレベル状態（App.tsx）

```ts
// 設計図の状態
blueprint: Blueprint | null  // 現在開いている設計図
viewMode: "3d" | "2d"        // 表示モード
showScaffold: boolean         // 足場の表示切替
currentY: number             // 2Dビューで表示中のY層
selectedColor: string        // 現在選択中のブロック色
```

### useBlueprint フック

Blueprint の CRUD 操作を提供する。

```ts
const {
  blueprint,
  setBlueprint,
  addBlock,
  removeBlock,
} = useBlueprint();
```

- `addBlock(x, y, z, color)`: structure にブロックを追加し、bounds を再計算
- `removeBlock(x, y, z)`: 座標のブロックを削除し、bounds を再計算
- 操作後は必ず `computeBounds` で bounds を更新する

### useColorPalette フック

```ts
const {
  colors,          // 登録済みカラーリスト
  selectedColor,   // 選択中のカラー
  selectColor,     // カラーを選択
  addColor,        // カラーを追加
} = useColorPalette();
```

---

## コンポーネント設計

### App.tsx

- `useBlueprint` / `useColorPalette` フックを保持するルートコンポーネント
- ドラッグ＆ドロップのグローバルハンドラを設置
- Toolbar / メインビュー（3D or 2D） / Sidebar の3分割レイアウト

### Toolbar.tsx

- Import ボタン: ファイル選択ダイアログを開く
- Export ボタン: 現在の Blueprint を `.boxel.json` としてダウンロード
- 3D / 2D 切替: viewMode を変更
- 足場 ON/OFF: showScaffold を切替
- エラーメッセージのインライン表示領域

### View3D.tsx

- `@react-three/fiber` の Canvas + OrbitControls
- InstancedMesh でボクセルをバッチレンダリング（大規模対応）
- structure / scaffold を別の InstancedMesh で管理
- showScaffold フラグで scaffold の InstancedMesh を表示切替
- InstancedMesh の matrix と color を useEffect で更新

### View2D.tsx

- HTML5 Canvas でグリッドを描画
- useEffect でブロック配置を再描画
- 左クリック: 選択中の色でブロックを配置（addBlock）
- 右クリック: ブロックを削除（removeBlock）
- グリッドのセルサイズは Canvas サイズと bounds から動的計算

### Sidebar.tsx

- ColorPalette コンポーネントを含む
- Y スライダー: currentY を変更（min/max は bounds から算出）
- 統計情報: 建築名、ブロック数（structure + scaffold）

### ColorPalette.tsx

- プリセットカラーのグリッド表示
- 選択中のカラーをハイライト（border で示す、shadow は使わない）
- カスタムカラーの追加: `<input type="color">` で色を選択

---

## 技術方針

### Tailwind CSS v4

- `@import "tailwindcss"` スタイルで CSS から使用
- カスタムプロパティは `@theme` ブロックで定義
- デザイン方針に従い、shadow は避け border と背景差で区切りを表現

### @react-three/fiber

- `<Canvas>` は fixed height（例: calc(100vh - toolbar height)）
- OrbitControls で回転・移動・ズーム
- InstancedMesh はブロック数が変わった際に再生成

### vite.config.ts の alias

```ts
resolve: {
  alias: {
    "@boxel-planner/schema": path.resolve(__dirname, "../schema/src/index.ts"),
  },
}
```

`@boxel-planner/schema` の dist を使わず、ソースを直接参照する。

---

## Import / Export フロー

### Import

1. ファイル選択 or ドラッグ＆ドロップ
2. `FileReader.readAsText()` でテキストを読み込む
3. `validateBlueprint(JSON.parse(text))` でバリデーション
4. 成功: Blueprint state を更新
5. 失敗: エラーメッセージをインライン表示

### Export

1. `JSON.stringify(blueprint, null, 2)` でシリアライズ
2. `Blob` + `URL.createObjectURL` でダウンロードリンクを生成
3. `<a>` 要素の click をトリガーしてダウンロード

---

## デザイン方針（design-principles.md 準拠）

- コンパクトなツールバー（compact / practical / neutral）
- border と背景差で区切り（shadow は使わない）
- `rounded-md` 以下の小さい角丸
- セクション間 24-32px、要素間 8-12px
- タグ・補助情報は小さめ・低彩度
