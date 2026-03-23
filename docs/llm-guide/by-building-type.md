# 建築タイプから選ぶ

「何を作りたいか」が先に決まっているときの入口です。

## 城・宮殿

- 主ボリューム: `fill`, `cylinder`
- 屋根と尖塔: `roof_box` 的な段積み + `spire`
- 左右対称: `mirror`
- 部品再利用: `place`
- 窓や胸壁の反復: `copy`

進め方:
- 中央塔と翼棟を別ファイルで作る
- `place` で合成する
- 片側だけ細部を作り `mirror` で複製する

## 塔・時計台・キープ

- 円塔: `cylinder`
- 塔頂部: `circle`, `spire`
- 角塔: `fill` + `roof_box` か `spire`

## 家・ホール・門

- 本体: `fill`
- 屋根: 段状 `fill` または `spire`
- 開口部: `remove`
- 窓列や柱列: `copy`

## ドーム・記念碑・噴水

- ドーム: `sphere --half top`
- 円形基壇: `circle`, `cylinder`
- 装飾リング: `circle`

## 広場・池・庭園

- 平面形: `fill`, `ellipse`
- 段差: 複数の `fill`
- 中央オブジェクト: 別ファイル化して `place`

詳しいコマンド仕様は [../llm-guide.md](../llm-guide.md) を参照してください。
