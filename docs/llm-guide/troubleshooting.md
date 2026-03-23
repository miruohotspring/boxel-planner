# よくある失敗

## 床より下に潜る

- 警告対象は `y<0` だけです
- `x,z` の負座標は中心原点運用では問題ありません

## `--hollow` で全面が埋まる

- 単層では `--no-cap` を併用します

## 大きい建物が歪む

- 片側だけ作って `mirror`
- 反復は `copy`
- 大部品は `place`

## bounds が見づらい

- 実建築サイズは `structureBounds`
- 足場込みは `scaffoldBounds`

## 原点がズレる

- 仕上げ前に `recenter`

詳しいコマンド仕様は [../llm-guide.md](../llm-guide.md) を参照してください。
