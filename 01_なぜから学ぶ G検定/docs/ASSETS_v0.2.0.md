# v0.2.0 挿絵の制作と組み込み

制作方式は imagegen スキルの組み込み画像生成機能。既存の第0章の見本箱の絵をスタイル資料にし、新しい動物保護施設とスタッフを制作した。以後は最初の施設の絵を人物・配色の資料として参照した。工場編の画像は上書きしていない。

すべてローカルPNGで、実行時に画像生成APIや外部画像サイトへ接続しない。元の生成画像からファイルをコピーし、画像編集や文字の焼き込みはしていない。比較用の複数コマはアプリの枠内で個別に表示し、名前・手がかり・説明はHTMLで載せる。

| プロジェクト内の画像パス                       | 使用場面・説明                                                  |
| ---------------------------------------------- | --------------------------------------------------------------- |
| public/illustrations/l007/shelter-welcome.png  | 場面1。新しいスタッフ、写真が増えたパソコン、施設の入口、猫と犬 |
| public/illustrations/l007/animal-photos.png    | 場面2の最初の2枚。茶トラ猫と垂れ耳の犬                          |
| public/illustrations/l007/varied-animals.png   | 場面2の追加3枚。垂れ耳の猫、立ち耳の犬、顔の一部が隠れた猫      |
| public/illustrations/l007/cat-pixel-source.png | 場面3・4、D05。画素拡大・層の入力・固定フィルタ計算に使う同じ猫 |
| public/illustrations/l007/dl-applications.png  | 場面6。カメラ、マイク、本と文章、生成物を扱う4場面              |
| public/illustrations/l007/shelter-ending.png   | 場面7。同じスタッフが写真を手で確認し、猫と犬が休む結末         |

全6点の生成プロンプト：[image-prompts-v0.2.0.json](image-prompts-v0.2.0.json)。生成人物は短い茶色のボブ、クリームのシャツ、くすんだ青緑のエプロンで統一。クリーム・緑・黄土色、濃い輪郭と段差のあるドット表現を共通にした。

## 本文と一緒に表示した状態

- [導入とスタッフ](screenshots/v0.2.0/01-shelter-390-chromium.png)
- [写真と見た目の手がかり](screenshots/v0.2.0/02-photo-clues-390-chromium.png)
- [同じ猫の実データから拡大した画素](screenshots/v0.2.0/03-real-pixels-390-chromium.png)
- [層の模式図と説明](screenshots/v0.2.0/04-network-390-chromium.png)
- [学習・利用の切替](screenshots/v0.2.0/05-inference-390-chromium.png)
- [4用途の挿絵と本文](screenshots/v0.2.0/06-applications-390-chromium.png)
- [結末と振り返り](screenshots/v0.2.0/07-ending-390-chromium.png)
- [320pxの写真比較](screenshots/v0.2.0/09-photo-320-large-false-chromium.png)
- [320px・文字拡大の結末](screenshots/v0.2.0/10-ending-320-large-true-chromium.png)

同名の webkit-mobile.png も保存する。これはWebKitのモバイル設定によるブラウザ試験であり、iPhone実機ではない。

画素はこのPNGをCanvasで32×32へ縮小した実データ。別の猫や架空の色格子に切り替えていない。D05では同じPNGから8×8の明るさを取り出す。数値と分類ラベルを絵に焼き込まず、データと表示を対応させている。
