import { it, expect, describe } from "vitest";
import {
  initialParameters,
  newTrainingProgress,
  forward,
  binaryLoss,
  evaluateNetwork,
  gradients,
  learn,
  consistentTraining,
  freshTrainingState,
} from "./training";
import {
  trainingAnimals,
  evaluationAnimals,
  trainingQuestions,
  trainingDives,
  trainingSources,
  trainingStages,
} from "../data/training";
import {
  beginTraining,
  completeTraining,
  emptyBackup,
  beginEvaluation,
  beginGeneralization,
  beginFairness,
  beginDeepLearning,
  validateBackup,
  mergeBackups,
  grade,
  reviewFor,
  restartLesson,
} from "./learning";
import "fake-indexeddb/auto";
import { saveState, loadState } from "./storage";
const train = (n: number) => {
  let p = newTrainingProgress();
  for (let i = 0; i < n; i++) p = learn(p, 1);
  return p;
};
describe("2-3-1 neural network uses real backpropagation", () => {
  it("reproduces given initialization and 0/1/10/50/100 results, without changing the candidate settings", () => {
    const expected = [
      [0, 0.7097255860468702, 4, 0.4345108629457113],
      [1, 0.7032117669424153, 4, 0.46322850210197547],
      [10, 0.6953957952054276, 3, 0.49996825020528035],
      [50, 0.6495685300188079, 8, 0.5242965201122287],
      [100, 0.17044555424860666, 8, 0.8754395962562754],
    ];
    for (const [n, loss, correct, score] of expected) {
      const p = train(n),
        r = evaluateNetwork(p.parameters, trainingAnimals);
      expect(r.loss).toBeCloseTo(loss, 12);
      expect(r.correct).toBe(correct);
      expect(r.rows[0].score).toBeCloseTo(score, 12);
      expect(consistentTraining(p)).toBe(true);
    }
    expect(forward(initialParameters, [0.9, 0.2]).score).toBeLessThan(0.5);
  });
  it("BCE equals direct probability formula on moderate logits and stays finite for extreme logits", () => {
    for (const z of [-4, 0, 3])
      for (const y of [0, 1]) {
        const score = 1 / (1 + Math.exp(-z));
        expect(binaryLoss(z, y)).toBeCloseTo(
          -(y * Math.log(score) + (1 - y) * Math.log(1 - score)),
          12,
        );
      }
    for (const z of [-1000, 1000])
      for (const y of [0, 1])
        expect(Number.isFinite(binaryLoss(z, y))).toBe(true);
    expect(() => forward(Array(13).fill(1e308), [1e308, 1e308])).toThrow();
  });
  it("all 13 analytical gradients agree with central numerical differences, initially and after training", () => {
    for (const parameters of [[...initialParameters], train(50).parameters]) {
      const analytic = gradients(parameters),
        eps = 1e-5;
      parameters.forEach((_, i) => {
        const plus = [...parameters],
          minus = [...parameters];
        plus[i] += eps;
        minus[i] -= eps;
        const numerical =
          (evaluateNetwork(plus, trainingAnimals).loss -
            evaluateNetwork(minus, trainingAnimals).loss) /
          (2 * eps);
        expect(analytic[i]).toBeCloseTo(numerical, 8);
      });
    }
  });
  it("one simultaneous update uses the mean gradient across all eight examples and changes all parameters", () => {
    const p = newTrainingProgress(),
      g = gradients(p.parameters),
      next = learn(p, 1);
    next.parameters.forEach((v, i) => {
      expect(v).toBeCloseTo(p.parameters[i] - g[i], 14);
      expect(v).not.toBe(p.parameters[i]);
    });
    const summed = trainingAnimals.map((d) => gradients(p.parameters, [d]));
    g.forEach((v, i) =>
      expect(v).toBeCloseTo(
        summed.reduce((sum, row) => sum + row[i], 0) / 8,
        14,
      ),
    );
    expect(p.parameters).toEqual([...initialParameters]);
  });
  it("buttons' update counts, deterministic chunking and history agree with each actual forward evaluation", () => {
    let p = newTrainingProgress();
    p = learn(p, 1);
    p = learn(p, 10);
    p = learn(p, 50);
    expect(p.updates).toBe(61);
    expect(p).toMatchObject({
      history: train(61).history,
      parameters: train(61).parameters,
    });
    expect(p.history).toHaveLength(62);
    expect(p.history.at(-1)!.loss).toBe(
      evaluateNetwork(p.parameters, trainingAnimals).loss,
    );
    expect(train(100).parameters).toEqual(train(100).parameters);
    expect(freshTrainingState()).toMatchObject({
      updates: 0,
      parameters: [...initialParameters],
    });
  });
  it("aggregation comes from individual predictions, evaluation and changed test data never update weights", () => {
    const p = train(100),
      before = structuredClone(p);
    const r = evaluateNetwork(p.parameters, evaluationAnimals);
    expect(r.correct).toBe(4);
    expect(r.correct).toBe(
      r.rows.filter((row) => row.predicted === row.label).length,
    );
    evaluateNetwork(
      p.parameters,
      evaluationAnimals.map((d) => ({
        ...d,
        ear: 0,
        nose: 0,
        label: 1 - d.label,
      })),
    );
    expect(p).toEqual(before);
    expect(
      new Set([...trainingAnimals, ...evaluationAnimals].map((d) => d.id)).size,
    ).toBe(12);
  });
  it("does not assume loss or accuracy improves every update and detects corrupted imported models/history", () => {
    expect(train(10).history.at(-1)!.correct).toBe(3);
    for (const key of ["parameters", "previousParameters"] as const) {
      const p = train(10);
      p[key][0] += 0.001;
      expect(consistentTraining(p)).toBe(false);
    }
    const p = train(10);
    p.history[3].loss += 0.01;
    expect(consistentTraining(p)).toBe(false);
    p.updates = 11;
    expect(consistentTraining(p)).toBe(false);
    expect(() => learn(newTrainingProgress(), 2)).toThrow();
  });
});
const old = () => {
  const b = beginDeepLearning(
    beginFairness(beginGeneralization(beginEvaluation(emptyBackup()))),
  );
  b.progress.started = true;
  const a = grade("L003-Q01", 0, b.progress.sessionId);
  b.attempts = [a];
  b.reviews = [reviewFor(a)];
  return b;
};
it("saves weights/history/open details and resumes additional learning exactly, preserving all older lessons", async () => {
  const legacy = old(),
    b = beginTraining(legacy);
  b.training = learn(b.training!, 50);
  b.training.stage = "practice";
  b.training.visited = trainingStages.slice(0, 5);
  b.training.openDives = ["L008-D02"];
  b.training.modelDetails = true;
  await saveState(b);
  const read = await loadState();
  expect(read).toEqual(b);
  const continued = learn(read.training!, 50);
  expect(continued.parameters).toEqual(train(100).parameters);
  expect(continued.history).toEqual(train(100).history);
  const restarted = beginTraining(read, true);
  for (const key of [
    "progress",
    "evaluation",
    "generalization",
    "fairness",
    "deepLearning",
    "attempts",
    "reviews",
    "settings",
  ] as const)
    expect(restarted[key]).toEqual(legacy[key]);
  expect(restarted.training!.updates).toBe(0);
  expect(restartLesson(read).training).toEqual(read.training);
  expect(mergeBackups(read, legacy).training).toEqual(read.training);
});
it("finishes without quizzes, preserves past completion and attempts on restart; rejects contradictions", () => {
  const b = beginTraining(old());
  b.training = {
    ...train(100),
    stage: "ending",
    visited: [...trainingStages],
    evaluated: true,
  };
  b.trainingAttempts = [
    grade(trainingQuestions[0].id, 0, b.training.sessionId, trainingQuestions),
  ];
  const done = completeTraining(b),
    reset = beginTraining(done, true);
  expect(validateBackup(done)).toEqual(done);
  expect(reset.completions).toEqual(done.completions);
  expect(reset.trainingAttempts).toEqual(b.trainingAttempts);
  expect(reset.training!.sessionId).not.toBe(done.training!.sessionId);
  const bad = structuredClone(done);
  bad.training!.parameters[0] += 1;
  expect(() => validateBackup(bad)).toThrow();
  const other = structuredClone(done);
  other.trainingAttempts![0].selected = 1;
  other.trainingAttempts![0].correct = true;
  expect(() => mergeBackups(done, other)).toThrow();
});
it("all five questions grade all 20 options and all five deep dives keep sources", () => {
  expect(trainingQuestions).toHaveLength(5);
  for (const q of trainingQuestions) {
    expect(q.options).toHaveLength(4);
    q.options.forEach((o, i) => {
      expect(o.explanation.length).toBeGreaterThan(20);
      expect(grade(q.id, i, "test", trainingQuestions).correct).toBe(
        i === q.answer,
      );
    });
    q.sourceIds.forEach((id) =>
      expect(trainingSources.some((s) => s.id === id)).toBe(true),
    );
  }
  expect(trainingDives).toHaveLength(5);
  for (const d of trainingDives) {
    expect(d.diagram).toHaveLength(3);
    for (const value of [d.easy, d.example, d.detail])
      expect(value.length).toBeGreaterThan(20);
  }
});

it("bounded 1000-update sessions remain finite and reject one more batch", () => {
  let p = newTrainingProgress();
  for (let i = 0; i < 20; i++) p = learn(p, 50);
  expect(p.updates).toBe(1000);
  expect(p.parameters.every(Number.isFinite)).toBe(true);
  expect(
    p.history.every(
      (h) => Number.isFinite(h.loss) && Number.isFinite(h.catScore),
    ),
  ).toBe(true);
  expect(consistentTraining(p)).toBe(true);
  expect(() => learn(p, 1)).toThrow();
});
