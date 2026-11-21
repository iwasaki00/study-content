import type { Question } from "../types";
export type InspectionState = "良品" | "不良";
export interface ConditionBox {
  id: string;
  actual: InspectionState;
  baseFeature: number;
}
const batch = (
  prefix: string,
  good: number,
  bad: number,
): readonly ConditionBox[] =>
  Array.from({ length: good + bad }, (_, i) => ({
    id: `${prefix}${String(i + 1).padStart(2, "0")}`,
    actual: i < good ? "良品" : "不良",
    baseFeature: i < good ? 0.2 : 0.8,
  }));
export const brightTraining = batch("T", 6, 4);
export const brightEvaluation = batch("B", 8, 2);
export const darkEvaluation = batch("D", 8, 2);
export const lightingFactors = { bright: 1, dark: 0.45, adjusted: 1 } as const;
export const fairnessStoryStages = [
  "intro",
  "results",
  "investigation",
  "lighting",
  "bias",
  "fairness",
  "ending",
] as const;
export const fairnessStages = [
  ...fairnessStoryStages,
  "quiz",
  "details",
] as const;
export const fairnessTitles = {
  intro: "同じ箱なのに、場所が変わるとAIが間違える？",
  results: "同じAIなのに、暗いラインで見逃した。",
  investigation: "何が違うのか、見比べよう。",
  lighting: "暗いラインの照明を変えてみる。",
  bias: "用意したデータは、どんな条件だった？",
  fairness: "箱の判定から、人に関わる判断へ。",
  ending: "使う場所と、影響を受ける人を見る。",
  quiz: "第4話を、問題で振り返る。",
  details: "偏りと公平性を、もう少し詳しく。",
};
export const fairnessSources = [
  {
    id: "L006-JDLA",
    title: "JDLA G検定公式・試験範囲",
    url: "https://www.jdla.org/certificate/general/",
    checkedAt: "2026-11-21",
    version: "G2024#6〜適用／公式ページ掲載の項目",
    supports: "モデルの選択・評価、データの収集・加工・分析・学習、公平性",
  },
  {
    id: "L006-FAIR",
    title: "Google ML Crash Course: Fairness",
    url: "https://developers.google.com/machine-learning/crash-course/fairness/",
    checkedAt: "2026-11-21",
    supports: "データと判断結果に含まれる偏りの確認",
  },
  {
    id: "L006-TYPES",
    title: "Google ML Crash Course: Types of bias",
    url: "https://developers.google.com/machine-learning/crash-course/fairness/types-of-bias",
    checkedAt: "2026-11-21",
    supports: "データの選び方、過去の不公平、自動化バイアス",
  },
  {
    id: "L006-MONITOR",
    title: "Google ML Crash Course: Monitoring pipelines",
    url: "https://developers.google.com/machine-learning/crash-course/production-ml-systems/monitoring",
    checkedAt: "2026-11-21",
    supports: "条件別の性能、学習時と利用時の違いの監視",
  },
  {
    id: "L006-EVAL",
    title: "Google ML Crash Course: Evaluating for bias",
    url: "https://developers.google.com/machine-learning/crash-course/fairness/evaluating-for-bias",
    checkedAt: "2026-11-21",
    supports: "全体指標の限界と複数の公平性の考え方",
  },
];
export const fairnessSyllabus = [
  {
    id: "L006-SY-EVAL",
    section: "機械学習の概要",
    item: "モデルの選択・評価",
    sourceId: "L006-JDLA",
  },
  {
    id: "L006-SY-DATA",
    section: "AIの社会実装に向けて",
    item: "データの収集・加工・分析・学習",
    sourceId: "L006-JDLA",
  },
  {
    id: "L006-SY-FAIR",
    section: "AI倫理・AIガバナンス",
    item: "公平性",
    sourceId: "L006-JDLA",
  },
];
export const fairnessTerms = [
  {
    name: "学習データの偏り",
    definition:
      "学習に使う事例が、ある条件や人々に偏り、必要な状況を十分に含んでいないこと。",
  },
  {
    name: "サンプリングバイアス",
    definition:
      "データの集め方・選び方によって、集めた事例が対象全体をうまく代表しなくなる偏り。",
  },
  {
    name: "データ分布の違い",
    definition:
      "データに現れる特徴や条件の傾向が、学習時と利用時などで異なること。",
  },
  {
    name: "環境が変わった場合の性能低下",
    definition:
      "調整した条件と使う条件が違い、学んだ判定がうまく通用しなくなる場合があること。必ず起きるわけではありません。",
  },
];
export const fairnessDeepDives = [
  {
    id: "data",
    title: "A. データの偏りはなぜ起こるのか",
    easy: "集めやすい事例ばかりにすると、ほかの状況が抜けることがあります。",
    example:
      "この工場では、明るいラインで集めた箱だけで調整しました。暗い条件を試す材料がありませんでした。",
    detail:
      "データは選ぶ人、測定方法、記録する場所や時期の影響を受けます。必要な条件が含まれるか、状態の答えが適切かを確認します。偏りは意図しなくても生じます。",
    definition: "学習データの偏り：学ぶ事例が特定の条件に寄ること。",
    sourceIds: ["L006-FAIR", "L006-TYPES"],
  },
  {
    id: "sampling",
    title: "B. サンプリングバイアスとは何か",
    easy: "全体を知りたいのに、一部からしか事例を集めないと、判断材料が偏ることがあります。",
    example:
      "昼の明るい時間にだけ撮影し、夜の暗いラインでも使おうとすると、使う条件を十分に代表できません。",
    detail:
      "誰・どこ・いつから選んだかを確認します。件数を増やしても、同じ条件だけ増やせば不足は残ります。対象に合った集め方と、条件別の評価が必要です。",
    definition:
      "サンプリングバイアス：事例の抽出方法が対象全体を代表しない偏り。",
    sourceIds: ["L006-TYPES"],
  },
  {
    id: "shift",
    title: "C. 学習時と実際の利用時でデータが違うとどうなるか",
    easy: "練習した場面と使う場面が違うと、同じ判定でもうまくいかないことがあります。",
    example:
      "この簡易モデルでは、照明が弱いと観測する特徴値が小さくなり、不良箱が良品側に入ります。",
    detail:
      "撮影機器、照明、対象の種類、時期などの違いを確認します。暗い条件のデータも用意し、利用前と利用後に条件ごとの成績を確かめます。今回の再判定で新しいモデルを学習したわけではありません。",
    definition: "データ分布の違い：特徴や条件が現れる傾向の違い。",
    sourceIds: ["L006-MONITOR"],
  },
  {
    id: "fair",
    title: "D. AIの公平性とは何か",
    easy: "人に関わる判断では、誰かが不当に不利になっていないかを考えます。",
    example:
      "架空の採用AIが過去の偏った採用結果を学んだら、十分な能力のある人の機会まで狭めるかもしれません。",
    detail:
      "採用・融資・教育などでは、誰にどんな影響があるかを確かめます。機会の偏りや誤判定による不利益など、公平性には複数の見方があります。一つの数字だけでは決められず、目的や当事者の状況も踏まえて検討します。工場の照明実験は、社会的公平性を証明する実験ではありません。",
    definition:
      "公平性：不当な偏りや不利益を避けるため、判断の基準・機会・影響を検討する考え方。",
    sourceIds: ["L006-EVAL", "L006-TYPES", "L006-JDLA"],
  },
  {
    id: "human",
    title: "E. AIの判断に人間の確認が必要なのはなぜか",
    easy: "AIが合っているとは限らず、その判断が人の生活に影響することがあるからです。",
    example:
      "採用の候補から外れた人について、担当者が根拠や入力の誤りを調べ、本人の説明も聞ける運用を考えます。",
    detail:
      "重要な判断をAIだけに任せず、人が確かめ、訂正や再検討につなぐ仕組みを考えます。人間も偏るため、単に承認ボタンを押すだけでは十分ではありません。確認者の責任、判断理由の記録、問題を申し出られる経路も検討します。",
    definition: "自動化バイアス：自動の出力というだけで過信してしまう傾向。",
    sourceIds: ["L006-TYPES", "L006-FAIR"],
  },
];
export const fairnessQuestions: Question[] = [
  {
    id: "L006-Q01",
    version: 1,
    text: "明るい場所の箱だけで調整したAIを、暗いラインでも使いたい。学習データについて確かめることは？",
    answer: 1,
    options: [
      {
        text: "明るい箱だけ、同じ条件の件数を増やせば十分",
        explanation:
          "件数を増やしても、暗い条件が含まれない不足は残ります。今回の見逃しは全体の件数だけでは防げません。",
      },
      {
        text: "暗い条件も含め、実際に使う状況を十分に含んでいるか",
        explanation:
          "この工場では明るい条件に偏っていました。使う条件を見直してデータを用意し、条件別にも評価します。",
      },
      {
        text: "学習用と評価用の箱のIDを同じにすればよい",
        explanation:
          "IDをそろえても条件への対応は改善しません。学習用と評価用を区別して確かめる必要があります。",
      },
      {
        text: "人が検査した答えは、いつでも公平で正しい",
        explanation:
          "検査の誤りや、人の判断の偏りが含まれる可能性もあります。答えの付け方も確かめます。",
      },
    ],
    clue: "何箱あるかだけでなく、どんな条件が含まれるかを見る。",
    conceptIds: ["data-bias"],
    sourceIds: ["L006-TYPES", "L006-MONITOR"],
  },
  {
    id: "L006-Q02",
    version: 1,
    text: "同じAIなのに暗いラインだけ見逃した。この教材の結果をどう理解する？",
    answer: 2,
    options: [
      {
        text: "暗い場所なら、どのAIも必ず失敗する",
        explanation:
          "暗さで必ず失敗するわけではありません。この教材の設定が暗い条件に対応していなかった例です。",
      },
      {
        text: "照明を変えれば、今後の誤判定は必ずゼロ",
        explanation:
          "今回の同じ10箱では改善しましたが、すべての環境や箱での性能を保証しません。",
      },
      {
        text: "調整したときと使うときの条件の違いを調べる",
        explanation:
          "ルールと箱の種類は同じでも、照明で観測特徴値が変わりました。AIだけでなく利用環境も確認します。",
      },
      {
        text: "暗いラインだけ、評価用の答えを学習に混ぜる",
        explanation:
          "答えを混ぜて同じ箱だけに合わせると、独立した評価になりません。条件に合う学習用データと別の評価を用意します。",
      },
    ],
    clue: "学習時と利用時の違いは、性能が変わる手がかり。",
    conceptIds: ["distribution-shift"],
    sourceIds: ["L006-MONITOR"],
  },
  {
    id: "L006-Q03",
    version: 1,
    text: "全体では18/20箱で正解だった。見逃しに気づくには、どう確かめる？",
    answer: 0,
    options: [
      {
        text: "明るい・暗い条件ごとに、人の確認とAIの判定を照合する",
        explanation:
          "全体の成績だけでなく、暗いラインの8/10と不良品2箱の見逃しを確認すると、どこで困っているか分かります。",
      },
      {
        text: "全体が9割なら、条件ごとの確認は不要",
        explanation:
          "全体の9割という数字に、暗いラインの見逃しが隠れています。目的に合う誤りも確認します。",
      },
      {
        text: "明るいラインの満点を、暗いラインにも当てはめる",
        explanation:
          "同じAIでも利用条件で結果が違いました。別の条件の成績をそのまま使えません。",
      },
      {
        text: "誤判定した箱を評価の集計から外す",
        explanation:
          "失敗した箱を外すと、実際の性能が分からなくなります。同じ評価用10箱を保って比較します。",
      },
    ],
    clue: "全体の成績と、条件ごとの成績・間違いを併せて見る。",
    conceptIds: ["sliced-evaluation"],
    sourceIds: ["L006-MONITOR", "L006-EVAL"],
  },
  {
    id: "L006-Q04",
    version: 1,
    text: "過去の採用結果を学んだAIを使うとき、公平性と人の確認について適切なのは？",
    answer: 3,
    options: [
      {
        text: "過去の記録から学んだAIなら、自動的に公平になる",
        explanation:
          "過去のデータには当時の不公平な判断が含まれることもあります。AIがその偏りまで引き継ぐ可能性があります。",
      },
      {
        text: "工場の照明実験で満点なら、採用AIの公平性も証明できる",
        explanation:
          "工場は撮影条件の技術的な実験です。人の権利や機会に関わる公平性とは、検討する影響が異なります。",
      },
      {
        text: "一つの公平性指標と、人の承認ボタンだけで十分",
        explanation:
          "公平性には複数の考え方があります。人も偏り得るので、根拠の確認や再検討の運用まで考えます。",
      },
      {
        text: "誰に不利益が生じるか調べ、重要な判断をAIだけに任せない運用を考える",
        explanation:
          "全体の正解率だけでなく、影響を受ける人、機会、誤った不利益を確認します。公平性の複数の見方と、人による実質的な確認が必要です。",
      },
    ],
    clue: "人への影響を確かめ、過信せず、見直せる運用を考える。",
    conceptIds: ["fairness", "human-oversight"],
    sourceIds: ["L006-JDLA", "L006-TYPES", "L006-EVAL"],
  },
];
