import type { ConditionBox, InspectionState } from "../data/fairness";
import { fairnessStoryStages } from "../data/fairness";
import type { FairnessProgress } from "../types";
export function fitConditionModel(training: readonly ConditionBox[]) {
  const good = training
    .filter((b) => b.actual === "良品")
    .map((b) => b.baseFeature);
  const bad = training
    .filter((b) => b.actual === "不良")
    .map((b) => b.baseFeature);
  if (
    !good.length ||
    !bad.length ||
    training.some((b) => !Number.isFinite(b.baseFeature))
  )
    throw Error("良品と不良の有限な特徴値が必要です");
  const maxGood = Math.max(...good),
    minBad = Math.min(...bad);
  if (maxGood >= minBad)
    throw Error("この簡易モデルでは良品と不良の特徴を分離できません");
  return { threshold: (maxGood + minBad) / 2, maxGood, minBad };
}
export function evaluateCondition(
  model: { threshold: number },
  boxes: readonly ConditionBox[],
  factor: number,
) {
  if (!Number.isFinite(factor) || factor <= 0)
    throw Error("照明係数が不正です");
  const rows = boxes.map((box) => {
    const observed = box.baseFeature * factor;
    const predicted: InspectionState =
      observed >= model.threshold ? "不良" : "良品";
    return { ...box, observed, predicted, correct: predicted === box.actual };
  });
  return {
    rows,
    total: rows.length,
    correct: rows.filter((r) => r.correct).length,
    missed: rows.filter((r) => r.actual === "不良" && r.predicted === "良品"),
    overstopped: rows.filter(
      (r) => r.actual === "良品" && r.predicted === "不良",
    ),
  };
}
export const newFairnessProgress = (): FairnessProgress => ({
  id: "progress-L006",
  lessonId: "L006",
  stage: "intro",
  visited: ["intro"],
  lightingAdjusted: false,
  questionIndex: 0,
  sessionId: crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  completed: false,
});
export const fairnessFinished = (p: FairnessProgress) =>
  p.lightingAdjusted &&
  fairnessStoryStages.every((stage) => p.visited.includes(stage));
