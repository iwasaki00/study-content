import type { TrainingProgress, TrainingRow } from "../types";
import { trainingAnimals, trainingStages } from "../data/training";
export const initialParameters = [
  0.15, -0.2, 0.3, -0.3, 0.2, 0.1, 0.02, -0.05, 0.02, -0.25, 0.2, -0.3, -0.05,
] as const;
export const parameterNames = [
  "耳→中1",
  "耳→中2",
  "耳→中3",
  "鼻先→中1",
  "鼻先→中2",
  "鼻先→中3",
  "中1バイアス",
  "中2バイアス",
  "中3バイアス",
  "中1→出力",
  "中2→出力",
  "中3→出力",
  "出力バイアス",
];
export const maxUpdates = 1000;
export const sigmoid = (x: number) =>
  x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
export function forward(p: readonly number[], x: readonly number[]) {
  if (
    p.length !== 13 ||
    x.length !== 2 ||
    [...p, ...x].some((v) => !Number.isFinite(v))
  )
    throw Error("有限なパラメータと2入力が必要です");
  const hidden = Array.from({ length: 3 }, (_, j) =>
    sigmoid(x[0] * p[j] + x[1] * p[3 + j] + p[6 + j]),
  );
  const logit = hidden.reduce((s, h, j) => s + h * p[9 + j], p[12]);
  if (!Number.isFinite(logit)) throw Error("計算結果が有限ではありません");
  return { hidden, logit, score: sigmoid(logit) };
}
export function binaryLoss(logit: number, label: number) {
  if (!Number.isFinite(logit) || ![0, 1].includes(label))
    throw Error("損失の入力が不正です");
  return (
    Math.max(logit, 0) - label * logit + Math.log1p(Math.exp(-Math.abs(logit)))
  );
}
export function evaluateNetwork(
  p: readonly number[],
  data: readonly TrainingRow[],
) {
  if (!data.length) throw Error("評価データが必要です");
  const rows = data.map((d) => {
    const f = forward(p, [d.ear, d.nose]),
      predicted = f.score >= 0.5 ? 1 : 0;
    return {
      ...d,
      ...f,
      predicted,
      correct: predicted === d.label,
      loss: binaryLoss(f.logit, d.label),
    };
  });
  return {
    rows,
    loss: rows.reduce((s, r) => s + r.loss, 0) / rows.length,
    correct: rows.filter((r) => r.correct).length,
    total: rows.length,
  };
}
export function gradients(
  p: readonly number[],
  data: readonly TrainingRow[] = trainingAnimals,
) {
  if (!data.length) throw Error("学習データが必要です");
  const g = Array(13).fill(0) as number[];
  for (const d of data) {
    const { hidden, score } = forward(p, [d.ear, d.nose]),
      dz = score - d.label;
    for (let j = 0; j < 3; j++) {
      g[9 + j] += dz * hidden[j];
      const dh = dz * p[9 + j] * hidden[j] * (1 - hidden[j]);
      g[j] += dh * d.ear;
      g[3 + j] += dh * d.nose;
      g[6 + j] += dh;
    }
    g[12] += dz;
  }
  return g.map((v) => v / data.length);
}
export function updateParameters(p: readonly number[], rate = 1) {
  if (!Number.isFinite(rate) || rate <= 0) throw Error("学習率が不正です");
  const g = gradients(p),
    next = p.map((v, i) => v - rate * g[i]);
  if (next.some((v) => !Number.isFinite(v)))
    throw Error("更新値が有限ではありません");
  return next;
}
export function trainingPoint(p: readonly number[], step: number) {
  const r = evaluateNetwork(p, trainingAnimals);
  return { step, loss: r.loss, correct: r.correct, catScore: r.rows[0].score };
}
export function freshTrainingState() {
  const parameters = [...initialParameters];
  return {
    parameters,
    previousParameters: [...parameters],
    updates: 0,
    history: [trainingPoint(parameters, 0)],
  };
}
export function learn(p: TrainingProgress, count: number): TrainingProgress {
  if (![1, 10, 50].includes(count) || p.updates + count > maxUpdates)
    throw Error("更新回数の上限を超えます");
  let parameters = [...p.parameters],
    previousParameters = parameters;
  const history = [...p.history];
  for (let i = 1; i <= count; i++) {
    previousParameters = parameters;
    parameters = updateParameters(parameters);
    history.push(trainingPoint(parameters, p.updates + i));
  }
  return {
    ...p,
    parameters,
    previousParameters,
    updates: p.updates + count,
    history,
    trainedOnce: true,
  };
}
export const newTrainingProgress = (): TrainingProgress => ({
  id: "progress-L008",
  lessonId: "L008",
  stage: "intro",
  visited: ["intro"],
  ...freshTrainingState(),
  trainedOnce: false,
  evaluated: false,
  openDives: [],
  modelDetails: false,
  questionIndex: 0,
  sessionId: crypto.randomUUID(),
  updatedAt: new Date().toISOString(),
  completed: false,
});
export const trainingFinished = (p: TrainingProgress) =>
  p.trainedOnce &&
  p.evaluated &&
  forward(p.parameters, [0.9, 0.2]).score >= 0.5 &&
  trainingStages.every((s) => p.visited.includes(s));
// Reject contradictory or tampered imported weights/count/history, not just their shape.
export function consistentTraining(p: TrainingProgress) {
  if (
    !Number.isInteger(p.updates) ||
    p.updates < 0 ||
    p.updates > maxUpdates ||
    !Array.isArray(p.history) ||
    p.history.length !== p.updates + 1
  )
    return false;
  if (
    ![p.parameters, p.previousParameters].every(
      (a) => Array.isArray(a) && a.length === 13 && a.every(Number.isFinite),
    )
  )
    return false;
  const close = (a: number, b: number) =>
    Number.isFinite(a) && Math.abs(a - b) <= 1e-10;
  let params = [...initialParameters] as number[],
    previous = params;
  for (let i = 0; i <= p.updates; i++) {
    const actual = trainingPoint(params, i),
      saved = p.history[i];
    if (
      !saved ||
      !Object.keys(actual).every((k) =>
        close(
          actual[k as keyof typeof actual],
          saved[k as keyof typeof actual],
        ),
      )
    )
      return false;
    if (i < p.updates) {
      previous = params;
      params = updateParameters(params);
    }
  }
  return (
    params.every((v, i) => close(v, p.parameters[i])) &&
    previous.every((v, i) => close(v, p.previousParameters[i]))
  );
}
