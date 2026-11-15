export type BoxState = "良品" | "不良";
export interface LearningBox {
  id: string;
  lot: string;
  dent: number;
  actual: BoxState;
}
// These sets never share IDs; duplicated features still describe separate boxes.
export const practiceBoxes: readonly LearningBox[] = [
  { id: "P01", lot: "A", dent: 0, actual: "良品" },
  { id: "P02", lot: "B", dent: 0, actual: "不良" },
  { id: "P03", lot: "A", dent: 1, actual: "良品" },
  { id: "P04", lot: "C", dent: 1, actual: "良品" },
  { id: "P05", lot: "A", dent: 2, actual: "不良" },
  { id: "P06", lot: "B", dent: 2, actual: "不良" },
  { id: "P07", lot: "B", dent: 3, actual: "不良" },
  { id: "P08", lot: "C", dent: 3, actual: "不良" },
];
export const freshBoxes: readonly LearningBox[] = [
  { id: "N01", lot: "B", dent: 0, actual: "良品" },
  { id: "N02", lot: "B", dent: 0, actual: "良品" },
  { id: "N03", lot: "A", dent: 0, actual: "良品" },
  { id: "N04", lot: "C", dent: 1, actual: "良品" },
  { id: "N05", lot: "A", dent: 1, actual: "良品" },
  { id: "N06", lot: "A", dent: 2, actual: "不良" },
  { id: "N07", lot: "B", dent: 2, actual: "不良" },
  { id: "N08", lot: "C", dent: 3, actual: "不良" },
];
export const generalizationStages = [
  "intro",
  "practice",
  "refined",
  "comparison",
  "ending",
] as const;
export const generalizationTitles = {
  intro: "練習では満点。新しい箱では、なぜ間違えた？",
  practice: "練習で、ひと箱だけ見逃した。",
  refined: "練習用の箱では、全部合った。",
  comparison: "初めて見る箱で、結果が逆転した。",
  ending: "どの箱で、確かめた成績？",
};
