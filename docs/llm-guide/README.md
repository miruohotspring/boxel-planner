# boxel-planner LLM ガイド入口

`docs/llm-guide.md` はフルリファレンスです。先に方向を決めたいときは、以下の入口から辿ってください。

サイズ感の基準は、推奨規約として `1 block = 1 meter` です。

形状確認では `boxel ortho` が立面把握に有効です。`boxel ortho --mode coord` を使うと可視面の座標値で穴や段差を見つけやすくなります。サイズ制約の確認には `boxel check --max-x ... --max-y ... --max-z ...`、通り抜け確認には `boxel check-access --from ... --to ...` を使えます。

- 建築タイプから考える: [by-building-type.md](./by-building-type.md)
- 構造パターンから考える: [by-structure.md](./by-structure.md)
- プリミティブを逆引きする: [primitives.md](./primitives.md)
- 部品合成・対称配置を見る: [composition.md](./composition.md)
- 失敗パターンだけ見る: [troubleshooting.md](./troubleshooting.md)
- 全部まとめて読む: [../llm-guide.md](../llm-guide.md)
