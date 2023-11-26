# mdparse.js
Markdown を HTML に変換する JavaScript のライブラリです。

## 目次
- mdparse.js: ライブラリ本体
- mdparse.min.js: ライブラリ本体（圧縮版）
- sample.html: 使い方のサンプル
- sample.md: Markdown 文書のサンプル
- sample.jpg: sample.md 内で呼ばれているサンプル画像。猫
- mdhtmlize.html: 自宅で使っているページ。応用例にどうぞ

## 説明
- Markdown をパースして HTML を出力します
- GitHab の Markdown パーサを意識しました
- 第 2 引数に連想配列でオプションを指定することができます
  - {"permissive": true} とすることで 1 個の改行を段落と見なします。省略することが可能です
  - {"section": true} とすることで h1 ~ 6 ごとに <section> で囲います。省略することが可能です
  - 二つのオプションを設定する際には {"permissive": true, "section": true} とします
- 出力される HTML は 1 行です（コードブロックを除く）。整形されたものが必要な場合は別途 [htmlshape.js](https://github.com/satsuki-thyme/htmlshape.js) をご利用ください

## CDN
https://cdn.jsdelivr.net/gh/satsuki-thyme/mdparse.js@main/mdparse.min.js
