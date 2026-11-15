# v0.1.8 挿絵制作記録

組み込み image_gen を使い、場面ごとにオリジナルPNGを生成。両方とも1536×1024。出力を目視確認して以下へコピーし、アプリの本文に組み込んだ。

| ファイル | 使用場面 |
| --- | --- |
| `public/illustrations/l005/practice-inspection.png` | L005導入。検査員が外からへこみの見えない箱と検査記録を見比べる |
| `public/illustrations/l005/fresh-boxes.png` | L005新着比較。別々の新着箱が間隔を空けて届く |

画風・人物の参照：`public/illustrations/l003/sorting-background.png`。実画像をview_imageで確認し、生成時にも参照画像として渡した。既存PNGは上書きしていない。箱ID・ロット・判定・件数はHTMLで表示。実行時は外部画像APIに接続しない。

## 練習場面の最終プロンプト

```text
Use case: illustration-story. Asset: original local PNG for a Japanese educational factory story, landscape 3:2.
Reference image is style and character reference only; create a new scene, do not paste it.
Same friendly inspector: short dark brown hair, dark green cap, green collared work uniform, simple expressive face. Muted green conveyor, warm cream factory interior, brown cardboard with cream tape. Match reference's chunky square pixel outlines and limited pixel shading.
Scene: inspector carefully compares an externally intact cardboard box resting on an inspection table beside the conveyor with a paper inspection record on a clipboard, looking slightly concerned. Box has no externally visible dent. Inspector's eyes and hand connect the box and record. Clear simple composition, large legible subjects at mobile width.
Record may have a simple empty grid but NO readable text, letters, numerals, labels, lot codes, IDs, verdicts, counts or logos anywhere. No infographic, no arrows, no speech bubbles. New pose and camera composition.
```

## 新着場面の最終プロンプト

```text
Use case: illustration-story. Asset: original local educational story PNG, landscape 3:2.
Reference image gives character and pixel-art style only. Create a different scene in the same cream factory.
Same inspector with short dark brown hair, dark green cap and green collared workwear stands left of muted green conveyor, welcoming a new delivery. TWO DISTINCT large intact brown cardboard boxes with cream packing tape are arriving on the belt, separated by a clear wide gap, both fully visible, one near center and one right. Identical blank small tag shapes on both convey same lot; they are separate physical boxes, not before-and-after views of one box. No other boxes. Inspector with clipboard gestures to newly arriving boxes. Same chunky square pixel outlines, limited warm shading and muted palette as reference, mobile-readable simple composition.
NO written text, numbers, box IDs, lot codes, verdicts, counts, logos, arrows, labels or speech bubbles anywhere. New composition, do not repeat reference background exactly.
```

