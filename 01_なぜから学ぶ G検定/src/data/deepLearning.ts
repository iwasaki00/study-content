import type { DeepLearningProgress, Question } from "../types";
export const deepStoryStages = [
  "intro",
  "photos",
  "pixels",
  "layers",
  "training",
  "uses",
  "ending",
] as const;
export const deepStages: DeepLearningProgress["stage"][] = [
  ...deepStoryStages,
  "quiz",
  "details",
];
export const deepTitles: Record<DeepLearningProgress["stage"], string> = {
  intro: "写真がいっぱい！",
  photos: "人間は何を見ている？",
  pixels: "コンピューターにとっての写真",
  layers: "たくさんの層で情報を処理する",
  training: "AIはどうやって特徴を学ぶ？",
  uses: "ディープラーニングが得意なこと",
  ending: "人の確認といっしょに、次へ",
  quiz: "第5話の任意演習",
  details: "第5話をもう少し詳しく",
};
export const pixelSource = "illustrations/l007/cat-pixel-source.png";
export const networkLabels = [
  "入力画像",
  "入力データ",
  "中間層 1",
  "中間層 2",
  "出力（猫・犬の予測）",
];
export const networkExplanations = [
  "まず、写真を入力します。ここでは同じ猫の絵を使います。",
  "写真の色や明るさなどを、コンピューターが扱える数値にします。",
  "数値を組み合わせたり変換したりして、判定に役立つ情報を作ります。",
  "前の層の情報をさらに組み合わせます。各層が決まった部位だけを担当するわけではありません。",
  "最後に予測を出す構造です。この図では猫・犬の判定計算はしていません。",
];
export const animals = [
  {
    name: "猫の写真",
    file: "animal-photos",
    count: 2,
    index: 0,
    clue: "この絵では、耳の形・ひげ・短い口元などが見えます。複数の手がかりを合わせて見ています。",
  },
  {
    name: "犬の写真",
    file: "animal-photos",
    count: 2,
    index: 1,
    clue: "この絵では、垂れた耳・前に伸びた口元・鼻などが見えます。この特徴だけで全ての犬を決めるわけではありません。",
  },
  {
    name: "耳が垂れた猫",
    file: "varied-animals",
    count: 3,
    index: 0,
    clue: "耳が垂れた猫もいます。この絵では、丸い顔・ひげ・短い口元も見えます。",
  },
  {
    name: "耳が立った犬",
    file: "varied-animals",
    count: 3,
    index: 1,
    clue: "耳が立った犬もいます。長めの口元・鼻など、ほかの手がかりも合わせて見ます。",
  },
  {
    name: "顔の一部が隠れた猫",
    file: "varied-animals",
    count: 3,
    index: 2,
    clue: "クッションで片目と口元の一部が見えません。見える手がかりが少ない写真は、人にもAIにも難しい場合があります。",
  },
] as const;
export const deepSources = [
  {
    id: "L007-S-DL-PDF",
    title: "Deep learning · 著者の大学公開PDF",
    url: "https://www.cs.toronto.edu/~hinton/absps/NatureDeepReview.pdf",
    checkedAt: "2026-11-21",
    supports: "2015年論文の本文（多層表現・教師あり学習・畳み込み）",
  },
  {
    id: "L007-S-JDLA",
    title: "JDLA G検定・公式シラバス",
    url: "https://www.jdla.org/certificate/general/",
    checkedAt: "2026-11-21",
    supports:
      "ディープラーニングの概要（ニューラルネットワーク・活性化関数・誤差逆伝播法）、要素技術（畳み込み層）、応用例",
  },
  {
    id: "L007-S-NN",
    title: "Google MLCC · Neural networks",
    url: "https://developers.google.com/machine-learning/crash-course/neural-networks",
    checkedAt: "2026-11-21",
    supports: "ニューラルネットワークの構造と学習",
  },
  {
    id: "L007-S-LAYERS",
    title: "Google MLCC · Nodes and hidden layers",
    url: "https://developers.google.com/machine-learning/crash-course/neural-networks/nodes-hidden-layers",
    checkedAt: "2026-11-21",
    supports: "層・重み・バイアス",
  },
  {
    id: "L007-S-ACT",
    title: "Google MLCC · Activation functions",
    url: "https://developers.google.com/machine-learning/crash-course/neural-networks/activation-functions",
    checkedAt: "2026-11-21",
    supports: "非線形変換と活性化関数",
  },
  {
    id: "L007-S-BP",
    title: "Google MLCC · Training using backpropagation",
    url: "https://developers.google.com/machine-learning/crash-course/neural-networks/backpropagation",
    checkedAt: "2026-11-21",
    supports: "損失・勾配・重みの更新",
  },
  {
    id: "L007-S-DL",
    title: "LeCun, Bengio, Hinton（2015）Deep learning",
    url: "https://doi.org/10.1038/nature14539",
    checkedAt: "2026-11-21",
    supports:
      "多層の表現学習と画像・音声・言語への応用。出版社の検索索引で要旨を確認。本文は著者の大学公開版を参照。",
  },
  {
    id: "L007-S-MP",
    title: "McCulloch & Pitts（1943）原論文・大学公開PDF",
    url: "https://www.cs.cmu.edu/~cdm/resources/McCullochPitts1943.pdf",
    checkedAt: "2026-11-21",
    supports:
      "神経活動の論理的なモデル化という初期の研究。現在の深層学習と同一ではない",
  },
];
export const deepConcepts = [
  {
    id: "L007-K01",
    name: "AI・機械学習・ディープラーニング",
    definition: "AIの中に機械学習があり、その一種がディープラーニング。",
  },
  {
    id: "L007-K02",
    name: "ニューラルネットワーク",
    definition:
      "つながった計算の単位を層として組み合わせ、数値を処理する仕組み。脳と完全に同じものではありません。",
  },
  {
    id: "L007-K03",
    name: "学習と推論",
    definition:
      "学習はデータから重みなどを調整する段階。推論は調整済みのモデルで新しい入力の予測を出す段階。",
  },
  {
    id: "L007-K04",
    name: "特徴表現",
    definition:
      "入力から作られる、判定などに役立つ情報の表し方。多層の仕組みはこれをデータから学べます。",
  },
  {
    id: "L007-K05",
    name: "画素・画像認識",
    definition:
      "画像を構成する小さな点の色などを入力として、画像の内容を予測する。予測には誤りもあります。",
  },
];
export const deepDives = [
  {
    id: "L007-D01",
    title: "ニューラルネットワークはなぜ生まれた？",
    easy: "単純な計算の単位をつないで、複雑な働きを表せないか、という研究が積み重なりました。",
    example:
      "写真整理はこの教材の架空の物語です。研究史の出発点がこの施設だった、という意味ではありません。",
    diagram: ["複数の入力", "単純化した計算の単位", "出力"],
    detail:
      "1943年、McCullochとPittsは神経活動を論理で扱うモデルを報告しました。初期の研究の一例です。現在のニューラルネットワークはこの研究だけで完成したものでも、脳の完全な再現でもありません。",
    conceptIds: ["L007-K02"],
    sourceIds: ["L007-S-MP", "L007-S-NN"],
  },
  {
    id: "L007-D02",
    title: "ニューラルネットワークの層と重みとは？",
    easy: "重みは、入力の影響の大きさや向きを調整する値です。層では複数の値を受け取り、計算した結果を次へ渡します。",
    example:
      "猫の写真の色の値などを組み合わせます。学習では、正解とのずれを手がかりに重みなどを調整します。",
    diagram: ["入力の数値", "重みを掛けて組み合わせる", "変換して次の層へ"],
    detail:
      "一般的な層では重み付きの和にバイアスを加え、活性化関数などで変換します。入力層・中間層・出力層には異なる役割があります。層を増やすだけで必ず性能が上がるわけではありません。",
    conceptIds: ["L007-K02", "L007-K04"],
    sourceIds: ["L007-S-LAYERS"],
  },
  {
    id: "L007-D03",
    title: "活性化関数とは何か？",
    easy: "組み合わせた数値を、次へ渡す前に変換する仕組みです。単なる足し算の繰り返しでは表しにくい関係を扱う助けになります。",
    example:
      "ReLUという関数なら、負の値を0にし、正の値はそのまま通します。猫の耳を直接検出する決まった関数、という意味ではありません。",
    diagram: ["組み合わせた値", "非線形な変換", "次の層へ"],
    detail:
      "線形な変換だけを重ねても全体は線形のままです。ReLU・シグモイドなどの非線形な活性化関数を挟むことで、より複雑な関係を表せます。用途や層により使い分けます。",
    conceptIds: ["L007-K02", "L007-K04"],
    sourceIds: ["L007-S-ACT"],
  },
  {
    id: "L007-D04",
    title: "誤差逆伝播法は何をしているのか？",
    easy: "予測と正解のずれを減らすには、内部の値をどちらへ変えるとよいか。その手がかりを、出力側から順に求めます。",
    example:
      "犬の正解ラベルがある写真で予測がずれたら、そのずれに各重みがどう影響したかを調べるイメージです。",
    diagram: [
      "予測と正解のずれ",
      "出力側から勾配を計算",
      "最適化手法で重みを更新",
    ],
    detail:
      "損失（ずれを測る値）に対する各パラメータの勾配を、連鎖律で効率よく計算します。重みの更新自体は勾配降下法などの最適化手法が行います。このアプリで訓練を実行しているわけではありません。",
    conceptIds: ["L007-K03", "L007-K04"],
    sourceIds: ["L007-S-BP"],
  },
  {
    id: "L007-D05",
    title: "CNN（畳み込みニューラルネットワーク）とは？",
    easy: "画像の小さな範囲を同じフィルタで順に調べ、局所的な模様などの情報を取り出す仕組みを使うネットワークです。",
    example:
      "下の実験は、同じ猫の絵を8×8に縮小した明るさの値に、固定した3×3のフィルタを適用します。猫・犬の分類はしません。",
    diagram: ["画像の小さな範囲", "同じフィルタで計算", "位置ごとの結果"],
    detail:
      "CNNでは一般にフィルタの重みもデータから学びます。ここでは比較のため固定値を使い、学習されたフィルタではありません。端への追加なし・移動幅1なので出力は6×6。深層学習で畳み込みと呼ぶ、フィルタを反転しない相互相関を計算しています。",
    conceptIds: ["L007-K04", "L007-K05"],
    sourceIds: ["L007-S-DL"],
  },
];
function question(
  n: number,
  text: string,
  answer: number,
  options: [string, string][],
  clue: string,
  conceptIds: string[],
  sourceIds: string[],
): Question {
  return {
    id: `L007-Q0${n}`,
    version: 1,
    text,
    answer,
    options: options.map(([text, explanation]) => ({ text, explanation })),
    clue,
    conceptIds,
    sourceIds,
  };
}
export const deepQuestions: Question[] = [
  question(
    1,
    "AI・機械学習・ディープラーニングの関係として適切なのは？",
    1,
    [
      [
        "すべてのAIはディープラーニングである",
        "人が決めたルールを使うAIもあります。第0章の大きな枠には機械学習以外も含みます。",
      ],
      [
        "ディープラーニングは機械学習の一種である",
        "写真の例で見た多層の学び方は、データから学ぶ機械学習に含まれます。",
      ],
      [
        "機械学習はディープラーニングに含まれる",
        "包含関係が逆です。機械学習には多層のネットワークを使わない方法もあります。",
      ],
      [
        "3つは同じ意味の別名である",
        "範囲が異なります。AIの中に機械学習があり、その中にディープラーニングがあります。",
      ],
    ],
    "大きな枠の中に小さな枠が入る関係。",
    ["L007-K01"],
    ["L007-S-JDLA", "L007-S-DL"],
  ),
  question(
    2,
    "ニューラルネットワークの中間層の説明として適切なのは？",
    0,
    [
      [
        "受け取った数値を組み合わせたり変換したりして次へ渡す",
        "模式図で情報が層を進んだように、入力された数値に処理を重ねます。",
      ],
      [
        "最初の層は必ず耳だけを担当する",
        "各層の役割を固定した部位に決める説明はできません。図も耳や鼻の担当表ではありません。",
      ],
      [
        "層を増やせば必ず正解率が上がる",
        "データや学習方法などにも左右されます。層の数だけで性能は保証できません。",
      ],
      [
        "人の脳と完全に同じ仕組みで動く",
        "神経系に着想を得た面はありますが、数値を扱うモデルであり脳そのものの再現ではありません。",
      ],
    ],
    "中間層は数値を受け取り、処理して次へ渡す。",
    ["L007-K02"],
    ["L007-S-LAYERS"],
  ),
  question(
    3,
    "写真分類の学習と推論の違いとして適切なのは？",
    2,
    [
      [
        "推論は正解ラベルで重みを調整する段階だけを指す",
        "正解とのずれを使って重みを調整するのは学習の説明です。",
      ],
      [
        "学習と推論はいつも同時で区別できない",
        "場面の2つの図のように、モデルを調整する段階と利用する段階を分けて考えられます。",
      ],
      [
        "学習は重みなどを調整し、推論は学習済みモデルで新しい入力を予測する",
        "写真と正解を使う流れと、新しい写真から予測する流れは別でした。",
      ],
      [
        "推論では毎回、新しい写真の正解を必ず入力する",
        "未知の写真の予測を出すため、正解を入力として与える必要はありません。評価時には後で照合します。",
      ],
    ],
    "内部を調整するのが学習、使って予測するのが推論。",
    ["L007-K03"],
    ["L007-S-NN", "L007-S-BP"],
  ),
  question(
    4,
    "多層構造と特徴表現について適切なのは？",
    3,
    [
      [
        "普通の機械学習では特徴を自動で学ぶことは一切ない",
        "ディープラーニング以外にも特徴を自動的に学ぶ方法はあります。",
      ],
      [
        "深層学習はすべての特徴を人が事前に列挙する必要がある",
        "写真から判定に役立つ表現を学習できることが重要です。",
      ],
      [
        "どの画像でも各層が全く同じ意味の特徴だけを表す",
        "表現はデータやモデル、学習に依存します。層ごとの意味を決め付けられません。",
      ],
      [
        "学習により、複数の層で判定などに役立つ表現を獲得できる",
        "写真の数値を段階的に変換する仕組みの重みなどを学習して、役立つ表現を得ます。",
      ],
    ],
    "特徴表現もデータから学べる。ただし深層学習だけの専売ではない。",
    ["L007-K04"],
    ["L007-S-DL", "L007-S-NN"],
  ),
  question(
    5,
    "画像認識にディープラーニングを使うときの説明として適切なのは？",
    1,
    [
      [
        "写真を入力すれば、人による確認は一切不要になる",
        "誤認識や偏りがあり得ます。施設でも最終確認を人が行う設定でした。",
      ],
      [
        "画素の色などを入力として学べるが、予測は常に正しいとは限らない",
        "拡大した猫の絵は色の集まりでした。それを扱うモデルにも誤りがあり、人の確認や評価が必要です。",
      ],
      [
        "画像以外の音声や文章には利用できない",
        "本編で見たように、音声認識・文章処理・生成などにも利用されます。",
      ],
      [
        "小さな固定フィルタを試しただけで猫と犬の学習が完了する",
        "深掘りの固定フィルタ実験は局所的な計算です。分類器を学習させたわけではありません。",
      ],
    ],
    "入力は画像の数値。結果は予測であり保証ではない。",
    ["L007-K05"],
    ["L007-S-DL"],
  ),
];
