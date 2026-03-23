# 建築タイプから選ぶ

「何を作りたいか」が先に決まっているときの入口です。

実在建築を作るときは、推奨規約として `1 block = 1 meter` で考えるとサイズ感を決めやすくなります。

## 城・宮殿

- 主ボリューム: `fill`, `cylinder`
- 屋根と尖塔: `roof`, `gable`, `spire`
- 左右対称: `mirror`
- 部品再利用: `place`
- 窓や胸壁の反復: `copy`

進め方:
- 中央塔と翼棟を別ファイルで作る
- `place` で合成する
- 片側だけ細部を作り `mirror` で複製する
- 正面立面は `ortho` の FRONT/SIDE で確認する
- 開口や吹き抜けは `ortho --mode coord` で可視面の座標値を見る
- `check --max-x ... --max-y ... --max-z ...` で 50m 級などの制約を最後に検証する
- 門から正殿内部まで通したい場合は `check-access --from ... --to ...` で到達性を確認する

## 塔・時計台・キープ

- 円塔: `cylinder`
- 塔頂部: `circle`, `spire`
- 角塔: `fill` + `roof` か `spire`

## 家・ホール・門

- 本体: `fill`
- 屋根: `roof`, `gable`, 段状 `fill`, `spire`
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
