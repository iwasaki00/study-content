# v0.1.9 挿絵制作記録

組み込みimage_genで4点を新規制作し、出力を目視確認してpublicへ保存。アプリは同じ配信からPNGを読み込む。画像生成API・外部画像サイトへの実行時接続はない。

参照画像は画風・人物の資料として実際にview_imageで確認し、生成時にも渡した。編集対象ではなく、新しい場面の生成に使用した。

- `public/illustrations/l005/practice-inspection.png`
- `public/illustrations/ml-inspected-samples.png`

深緑の帽子と作業服、短い濃茶の髪、素朴な顔、緑のベルト、箱とクリーム色のテープ、工場の内装、角のあるドットの輪郭と陰影をそろえた。公平性の絵は、工場の技術的な実験と区別するため、別の面談室と普段着の人物を描いた。

| 保存先                                              | 使用場面                                  | サイズ    |
| --------------------------------------------------- | ----------------------------------------- | --------- |
| `public/illustrations/l006/two-lines.png`           | Scene 1の新しい2ライン、Scene 3の照明比較 | 1536×1024 |
| `public/illustrations/l006/missed-boxes.png`        | Scene 2の見逃し、Scene 4の操作前          | 1536×1024 |
| `public/illustrations/l006/lighting-adjustment.png` | Scene 4の照明調整後                       | 1536×1024 |
| `public/illustrations/l006/human-review.png`        | Scene 6、人の機会と判断を確認する場面     | 1254×1254 |

箱ID・判定・集計結果・数式は画像へ焼き込まず、HTMLで別々に表示する。Scene 4のD09・D10は既存の透明箱パーツを再利用し、同じIDの操作前後を実際の判定結果と結び付けた。元のPNGは上書きしていない。

## 新しい検査ライン：最終プロンプト

```text
Use case: illustration-story. Original landscape 3:2 PNG for a beginner Japanese AI educational story. Reference images are ONLY character/pixel art style references, not edit targets. Match short dark brown hair, friendly simple face, dark green cap and green collared work uniform; muted green conveyors, brown cardboard with cream tape, warm cream industrial interior. Same chunky square pixel outlines and pixel density, limited muted shading. Large uncluttered subjects recognizable on a 320px phone. No text, letters, numbers, box IDs, verdict symbols, graphs, logos, speech bubbles or arrows burned into image. Scene: SAME factory with TWO clearly separated parallel inspection conveyor lines, each with identical camera and cardboard box type. One line well lit under a bright lamp on left, second line visibly dim with its lamp weak on right, but all subjects remain recognizable. Same inspector between or beside the lines gesturing as he introduces them, optimistic expression. Distinct wide composition showing lighting difference, not a generic repeated background. No explicit outcome shown.
```

## 暗いラインでの見逃し：最終プロンプト

```text
Use case: illustration-story. Original landscape 3:2 PNG for a beginner Japanese AI educational story. Reference images are ONLY character/pixel art style references, not edit targets. Match short dark brown hair, friendly simple face, dark green cap and green collared work uniform; muted green conveyors, brown cardboard with cream tape, warm cream industrial interior. Same chunky square pixel outlines and pixel density, limited muted shading. Large uncluttered subjects recognizable on a 320px phone. No text, letters, numbers, box IDs, verdict symbols, graphs, logos, speech bubbles or arrows burned into image. Scene: a new close composition at the DIM inspection line's exit. Same inspector looks surprised and concerned, holding his inspection clipboard and pointing at a dent in a cardboard box that has passed beyond the inspection camera. A second physically separate dented box beside it. The weak overhead lamp and camera are behind the boxes, making the overlooked small dents apparent to the human nearby. Boxes and character are large, not lost in darkness. Do not imply all dim conditions always fail. No baked-in result graphics.
```

## 照明の改善：最終プロンプト

```text
Use case: illustration-story. Original landscape 3:2 PNG for a beginner Japanese AI educational story. Reference images are ONLY character/pixel art style references, not edit targets. Match short dark brown hair, friendly simple face, dark green cap and green collared work uniform; muted green conveyors, brown cardboard with cream tape, warm cream industrial interior. Same chunky square pixel outlines and pixel density, limited muted shading. Large uncluttered subjects recognizable on a 320px phone. No text, letters, numbers, box IDs, verdict symbols, graphs, logos, speech bubbles or arrows burned into image. Scene: new composition at a single inspection line. SAME green-uniform inspector carefully adjusts the angle and brightness control of a safely reachable low mounted inspection lamp beside the camera (no ladder, no electrical repair). Light now falls clearly onto the dented front of a cardboard box under the camera; a second dented box waits behind with space between. Inspector thoughtful and relieved. Show lamp, camera and box in a clear visual relationship. Do not depict a result screen, result numbers, 'perfect' symbols or infographics. Different camera angle and pose from reference.
```

## AIの公平性・人の確認：最終プロンプト

```text
Use case: illustration-story. Original landscape 3:2 PNG for a beginner AI ethics education scene. Input images are pixel-art STYLE references only. Same square chunky dark outlines, low pixel density, muted sage greens, cream, brown, limited shading as reference. NEW setting, NOT a factory: a quiet meeting desk with a human reviewer and another colleague thoughtfully checking a computer's proposed decision against plain paper records while a person affected by the decision sits across the desk and participates in the discussion. Three adults with varied hairstyles and neutral everyday clothes, equal respectful posture and similar scale. Monitor shows only simple neutral empty panels, no judgments or scores. Convey human review, listening and a decision affecting someone's opportunities; no smiling robot, no scales-of-justice icon, no handcuffs, no good/bad group stereotypes. Large readable people and monitor for mobile. No text, letters, digits, labels, box IDs, verdicts, logos or speech bubbles. Cream indoor palette and green accents, same pixel art density as factory characters, entirely new composition.
```
