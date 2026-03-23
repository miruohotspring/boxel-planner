# boxel-planner LLM ガイド入口

`docs/llm-guide.md` はフルリファレンスです。先に方向を決めたいときは、以下の入口から辿ってください。

サイズ感の基準は、推奨規約として `1 block = 1 meter` です。
壁厚は原則 `1 block = 1 meter`、分厚く見せたい場合でも `2 block` までを推奨します。
色も形状と同じくらい重要な情報です。指定がない場合は、まず用途に合った `palette` を `10〜30` 色程度で定義してから作り始めてください。

形状確認では `boxel ortho` が立面把握に有効です。`boxel ortho --mode coord` を使うと可視面の座標値で穴や段差を見つけやすくなります。`--crop structure --center --grid 5` を併用すると全体の読みやすさが上がります。サイズ制約の確認には `boxel check --max-x ... --max-y ... --max-z ...`、通り抜け確認には `boxel check-access --from ... --to ...`、推奨規約の確認には `boxel validate --lint` を使えます。

- 建築タイプから考える: [by-building-type.md](./by-building-type.md)
- 構造パターンから考える: [by-structure.md](./by-structure.md)
- プリミティブを逆引きする: [primitives.md](./primitives.md)
- 部品合成・対称配置を見る: [composition.md](./composition.md)
- 失敗パターンだけ見る: [troubleshooting.md](./troubleshooting.md)
- 全部まとめて読む: [../llm-guide.md](../llm-guide.md)
