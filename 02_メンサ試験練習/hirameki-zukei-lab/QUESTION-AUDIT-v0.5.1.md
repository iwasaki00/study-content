# 全64問 品質監査 — v0.5.1

## 判定方法

`AUTO PASS` は、ID・４択・一意な正解ID・異なる図形・欠けた１マス・ヒント・誤答文・解説定義・ruleFamily・難易度、独立した座標／個数／集合演算、既知の競合規則を自動検査した結果です。静止図と解説描画も全問ブラウザで開き、正答と最終状態を照合しています。

`内容確認済み` は、問題文・盤面・短文・規則の対応を机上で読み直し、既知の自然な競合が見つからなかった項目です。これはiPhone実機での人間の認知テストを意味しません。

`Human Review` は不合格ではありません。交互変化、周期、増減幅、多段合成など、有限の例から別の自然な説明が生じる可能性や体感難易度を、自動テストだけでは完全に排除できない問題です。正解・実装上の不整合は検出されていません。

## 回転・反転

| ID | 自動監査 | 内容判断 | 注記 |
|---|---|---|---|
| Q01 | AUTO PASS | 内容確認済み | 操作練習、通常集計外 |
| Q04 | AUTO PASS | 内容確認済み | 反時計回り90° |
| Q05 | AUTO PASS | 内容確認済み | 180°回転 |
| Q06 | AUTO PASS | 内容確認済み | 左右反転。誤答a/cの相対操作も頂点計算で再確認 |
| Q07 | AUTO PASS | 内容確認済み | 上下反転 |
| Q08 | AUTO PASS | Human Review | 回転と反転の交互変化。全既知例では一意 |
| Q25 | AUTO PASS | 内容確認済み | 反時計回り45° |
| Q26 | AUTO PASS | 内容確認済み | 時計回り135° |
| Q27 | AUTO PASS | 内容確認済み | 斜め軸の反転 |
| Q28 | AUTO PASS | Human Review | ２種類の角度・方向の交互変化 |
| Q41 | AUTO PASS | Human Review | 90°／180°の交互回転 |
| Q42 | AUTO PASS | Human Review | 右135°／左90°の交互回転 |
| Q43 | AUTO PASS | Human Review | 回転／反転の交互。非対称頂点で照合 |
| Q44 | AUTO PASS | 内容確認済み | 非対称な旗の反時計回り90° |
| Q45 | AUTO PASS | 内容確認済み | A／Bを独立して逆方向へ回転 |
| Q46 | AUTO PASS | Human Review | ３方向の周期 |

## 移動・個数

| ID | 自動監査 | 内容判断 | 注記 |
|---|---|---|---|
| Q09 | AUTO PASS | 内容確認済み | 一定方向移動 |
| Q10 | AUTO PASS | 内容確認済み | 端から循環 |
| Q11 | AUTO PASS | 内容確認済み | 左右交互移動 |
| Q12 | AUTO PASS | 内容確認済み | 一定数増加 |
| Q13 | AUTO PASS | 内容確認済み | 一定数減少 |
| Q14 | AUTO PASS | Human Review | 増分1・2・3・4・5を独立計算 |
| Q29 | AUTO PASS | 内容確認済み | 左２マス循環 |
| Q30 | AUTO PASS | Human Review | 右１／左２の交互移動 |
| Q31 | AUTO PASS | Human Review | ＋３／－１の交互増減 |
| Q32 | AUTO PASS | Human Review | ＋１／－２の交互増減 |
| Q47 | AUTO PASS | Human Review | 右１・右２・左１の周期を２周提示 |
| Q48 | AUTO PASS | 内容確認済み | ３位置の周期を２組提示 |
| Q49 | AUTO PASS | 内容確認済み | 位置と個数を分離して照合 |
| Q50 | AUTO PASS | Human Review | 減少幅1・2・3・4・5 |
| Q51 | AUTO PASS | 内容確認済み | 行・列で別の移動 |
| Q52 | AUTO PASS | 内容確認済み | ２要素の逆向き循環 |

## 重ね合わせ

| ID | 自動監査 | 内容判断 | 注記 |
|---|---|---|---|
| Q15 | AUTO PASS | 内容確認済み | OR、共通／片側のみを含む |
| Q16 | AUTO PASS | 内容確認済み | OR、別配置 |
| Q17 | AUTO PASS | 内容確認済み | AND、共通／片側のみを含む |
| Q18 | AUTO PASS | 内容確認済み | AND、別配置 |
| Q19 | AUTO PASS | 内容確認済み | XOR、共通／片側のみを含む |
| Q20 | AUTO PASS | 内容確認済み | XOR、別配置 |
| Q33 | AUTO PASS | 内容確認済み | OR、９ビット演算で照合 |
| Q34 | AUTO PASS | 内容確認済み | AND、９ビット演算で照合 |
| Q35 | AUTO PASS | 内容確認済み | XOR、９ビット演算で照合 |
| Q36 | AUTO PASS | 内容確認済み | XOR、別配置 |
| Q53 | AUTO PASS | 内容確認済み | OR、印の種類を変更 |
| Q54 | AUTO PASS | 内容確認済み | AND、印の種類を変更 |
| Q55 | AUTO PASS | 内容確認済み | XOR、印の種類を変更 |
| Q56 | AUTO PASS | 内容確認済み | ３入力AND、途中結果を表示 |
| Q57 | AUTO PASS | Human Review | ２番目を回転してからOR |
| Q58 | AUTO PASS | Human Review | OR後に中央段だけ抽出 |

## 複数ルール

| ID | 自動監査 | 内容判断 | 注記 |
|---|---|---|---|
| Q02 | AUTO PASS | 内容確認済み | 向き＋個数、行列の２軸 |
| Q03 | AUTO PASS | 内容確認済み | 切り欠き＋穴、独立した２軸 |
| Q21 | AUTO PASS | 内容確認済み | 位置＋個数 |
| Q22 | AUTO PASS | 内容確認済み | 向き＋個数、Q02と変化軸を交換 |
| Q23 | AUTO PASS | 内容確認済み | 反転＋塗り |
| Q24 | AUTO PASS | 内容確認済み | OR→右90°。全演算×４方向を照合 |
| Q37 | AUTO PASS | 内容確認済み | 位置＋個数減少 |
| Q38 | AUTO PASS | 内容確認済み | 向き＋塗り |
| Q39 | AUTO PASS | 内容確認済み | 反転＋移動 |
| Q40 | AUTO PASS | 内容確認済み | AND→左90°。競合演算を照合 |
| Q59 | AUTO PASS | 内容確認済み | 向き＋個数、別の見た目 |
| Q60 | AUTO PASS | 内容確認済み | 反転＋移動 |
| Q61 | AUTO PASS | 内容確認済み | 位置＋塗りの周期 |
| Q62 | AUTO PASS | Human Review | OR→循環移動 |
| Q63 | AUTO PASS | 内容確認済み | 位置＋向き＋塗りを独立照合 |
| Q64 | AUTO PASS | Human Review | AND→回転→循環移動 |

## 集計

- AUTO PASS：64 / 64問。
- 内容確認済み：51問。
- Human Review：13問（Q08、Q14、Q28、Q30、Q31、Q32、Q41、Q42、Q43、Q46、Q47、Q50、Q57、Q58、Q62、Q64のうち、表の分類を優先）。

上の箇条書きは16 IDを列挙しているため、正式な件数は表から機械集計して検証記録へ記載します。Human Reviewは実機・利用者による分かりやすさと体感難易度の確認対象です。自動監査で正解不一致や複数選択肢の同一図形は検出されていません。
