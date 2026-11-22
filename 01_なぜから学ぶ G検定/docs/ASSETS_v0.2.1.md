# v0.2.1 新規挿絵

imagegenスキルの組み込み画像生成で制作し、PNGをプロジェクトへコピーした。第5話のpublic/illustrations/l007/shelter-welcome.pngを人物・施設・画風の資料として参照。短い茶色のボブ、クリーム色のシャツ、青緑のエプロン、猫と犬、クリームとくすんだ緑の施設を統一した。既存画像を上書きしていない。

| 新規画像パス                                        | 使用場面                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| public/illustrations/l008/mistaken-cat.png          | 場面1。猫の写真と画面を見比べて困るスタッフ                        |
| public/illustrations/l008/labelled-photos.png       | 場面2。正解を確認した猫と犬の写真を記録と並べる                    |
| public/illustrations/l008/network-investigation.png | 場面4。ネットワークを調べる。モニター内も2入力・3中間・1出力に調整 |
| public/illustrations/l008/trained-review.png        | 場面6・7。学習後の判定をスタッフが確認する                         |

4点とも1536×1024。説明・ID・スコア・判定・件数は焼き込んでいない。画面の判定ラベルとネットワークの線、グラフは実計算から描く。第5話の猫の絵はC01の表示に再利用した。実行時に外部画像や画像生成APIへ接続しない。

## 生成指示

共通指定：landscape pixel art、chunky square pixels、dark stepped outlines、muted cream/sage/ochre palette、same short-brown-bob shelter worker in cream shirt and muted-teal apron、no writing/numbers/verdicts/logos。重要な情報はHTML/SVGへ分離。

- mistaken-cat：スタッフが猫の写真とモニターの猫を見比べて困る。実物の猫と犬もそばに置く。画面の横は判定文字を入れず余白にする。第5話と同じ人物で、斜め前からの構図。
- labelled-photos：スタッフが机に猫4枚・犬4枚の写真と空白のラベル欄を並べ、記録を確認する。机と手元を上から斜めに見る構図。
- network-investigation：スタッフがモニターのネットワークを鉛筆とノートで調べる。最初の生成後、モニター内だけを「左2・中3・右1の丸、層間は全結合」へ編集。人物・施設・色・構図を維持。
- trained-review：同じスタッフが、猫の写真とモニターの猫を人の記録と照合して確認。表情は安心しつつ注意深く。自動分類の魔法や数値の描き込みを避ける。入口とは反対側、窓の近くの構図。

原本は組み込み画像生成の保存先に残し、選定した画像を上記パスへコピーした。初回のネットワーク挿絵は今回の2-3-1と異なる丸の数だったため、編集機能で修正してから組み込んだ。初回案はアプリに含めていない。

## 本文と一緒に表示した画面

- [誤判定](screenshots/v0.2.1/01-initial-mistake-390-chromium.png)
- [正解付きの見本](screenshots/v0.2.1/02-examples-390-chromium.png)
- [損失の説明](screenshots/v0.2.1/03-loss-390-chromium.png)
- [1回の更新](screenshots/v0.2.1/04-one-update-390-chromium.png)
- [10回](screenshots/v0.2.1/05-ten-updates-390-chromium.png)
- [50回](screenshots/v0.2.1/06-fifty-updates-390-chromium.png)
- [100回](screenshots/v0.2.1/07-hundred-updates-390-chromium.png)
- [別の4例の確認](screenshots/v0.2.1/08-new-animals-390-chromium.png)
- [結末](screenshots/v0.2.1/09-ending-390-chromium.png)

各画面のWebKit版、320pxと文字拡大の画面も保存する。iPhone実機ではない。
