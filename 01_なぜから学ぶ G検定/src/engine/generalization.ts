import type { BoxState, LearningBox } from "../data/generalization";
import { generalizationStages } from "../data/generalization";
import type { GeneralizationProgress } from "../types";
export interface Rule {
  threshold: number;
  exceptions: { lot: string; dent: number; actual: BoxState }[];
}
export function predictBox(
  rule: Rule,
  box: Pick<LearningBox, "lot" | "dent">,
): BoxState {
  return (
    rule.exceptions.find((e) => e.lot === box.lot && e.dent === box.dent)
      ?.actual ?? (box.dent >= rule.threshold ? "不良" : "良品")
  );
}
export function evaluateBoxes(rule: Rule, boxes: readonly LearningBox[]) {
  const rows = boxes.map((box) => ({
    ...box,
    predicted: predictBox(rule, box),
  }));
  return {
    rows,
    total: rows.length,
    correct: rows.filter((r) => r.actual === r.predicted).length,
    missed: rows.filter((r) => r.actual === "不良" && r.predicted === "良品"),
    overstopped: rows.filter(
      (r) => r.actual === "良品" && r.predicted === "不良",
    ),
  };
}
// Only practice data enters training. Evaluation has a separate, read-only API.
export function trainRules(practice: readonly LearningBox[]) {
  if (!practice.length) throw Error("練習用データが必要です");
  const trials = Array.from({ length: 5 }, (_, threshold) => ({
    threshold,
    ...evaluateBoxes({ threshold, exceptions: [] }, practice),
  }));
  // Equal scores keep the first (smallest) threshold, for deterministic replay.
  const best = trials.reduce((a, b) => (b.correct > a.correct ? b : a));
  const basic: Rule = { threshold: best.threshold, exceptions: [] };
  const exceptions: Rule["exceptions"] = [];
  for (const box of practice) {
    if (predictBox(basic, box) === box.actual) continue;
    const previous = exceptions.find(
      (e) => e.lot === box.lot && e.dent === box.dent,
    );
    if (previous && previous.actual !== box.actual)
      throw Error("同じ特徴に異なる答えがあります");
    if (!previous)
      exceptions.push({ lot: box.lot, dent: box.dent, actual: box.actual });
  }
  return {
    basic,
    refined: { threshold: best.threshold, exceptions } satisfies Rule,
    trials,
  };
}
export const newGeneralizationProgress = (): GeneralizationProgress => ({
  id: "progress-L005",
  lessonId: "L005",
  stage: "intro",
  visited: ["intro"],
  prediction: null,
  sessionId: crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  completed: false,
});
export const generalizationFinished = (p: GeneralizationProgress) =>
  generalizationStages.every((stage) => p.visited.includes(stage));
