import { describe, it, expect } from "vitest";
import {
  brightTraining,
  brightEvaluation,
  darkEvaluation,
  lightingFactors,
  fairnessQuestions,
  fairnessSources,
  fairnessSyllabus,
  fairnessStoryStages,
} from "../data/fairness";
import { fitConditionModel, evaluateCondition } from "./fairness";
import {
  emptyBackup,
  beginEvaluation,
  beginGeneralization,
  beginFairness,
  completeFairness,
  validateBackup,
  mergeBackups,
  completionRecords,
  restartLesson,
  grade,
  reviewFor,
} from "./learning";
import { questions } from "../data/content";
import { evaluationQuestions } from "../data/evaluation";
import "fake-indexeddb/auto";
import { saveState, loadState } from "./storage";
const model = fitConditionModel(brightTraining);
describe("L006 numerical condition experiment", () => {
  it("fits 0.5 from bright training only, with 30 unique training/evaluation IDs", () => {
    expect(model).toEqual({ maxGood: 0.2, minBad: 0.8, threshold: 0.5 });
    expect(brightTraining.filter((b) => b.actual === "良品")).toHaveLength(6);
    expect(brightTraining.filter((b) => b.actual === "不良")).toHaveLength(4);
    expect(
      new Set(
        [...brightTraining, ...brightEvaluation, ...darkEvaluation].map(
          (b) => b.id,
        ),
      ).size,
    ).toBe(30);
    const altered = brightTraining.map((b) => ({
      ...b,
      baseFeature: b.actual === "良品" ? 0.3 : 0.9,
    }));
    expect(fitConditionModel(altered).threshold).toBeCloseTo(0.6);
  });
  it("aggregates bright 10/10, dark 8/10, total 18/20 from actual predictions", () => {
    const b = evaluateCondition(
        model,
        brightEvaluation,
        lightingFactors.bright,
      ),
      d = evaluateCondition(model, darkEvaluation, lightingFactors.dark);
    expect([b.correct, b.total, b.missed.length]).toEqual([10, 10, 0]);
    expect([d.correct, d.total, d.missed.length]).toEqual([8, 10, 2]);
    expect(b.correct + d.correct).toBe(18);
    expect(d.missed.map((r) => r.id)).toEqual(["D09", "D10"]);
    for (const r of d.rows) {
      expect(r.observed).toBeCloseTo(r.baseFeature * 0.45);
      expect(r.predicted).toBe(r.observed >= model.threshold ? "不良" : "良品");
    }
    expect(
      d.missed.every((r) => r.actual === "不良" && r.predicted === "良品"),
    ).toBe(true);
  });
  it("recalculates the same ten IDs after changing lighting, with only D09 and D10 changing", () => {
    const before = evaluateCondition(model, darkEvaluation, 0.45),
      after = evaluateCondition(model, darkEvaluation, 1);
    expect(after.correct).toBe(10);
    expect(after.missed).toHaveLength(0);
    expect(after.rows.map((r) => r.id)).toEqual(before.rows.map((r) => r.id));
    expect(
      before.rows
        .filter((r, i) => r.predicted !== after.rows[i].predicted)
        .map((r) => r.id),
    ).toEqual(["D09", "D10"]);
    expect(after.rows.map((r) => r.actual)).toEqual(
      before.rows.map((r) => r.actual),
    );
  });
  it("uses evaluation only for comparison and responds to data/lighting changes without guaranteeing success", () => {
    const original = structuredClone(model),
      data = structuredClone(darkEvaluation);
    const changed = darkEvaluation.map((r) => ({ ...r, baseFeature: 0.4 }));
    expect(evaluateCondition(model, changed, 1).correct).toBe(8); // Improved lighting alone does not universally fix arbitrary data.
    expect(evaluateCondition(model, darkEvaluation, 0.8).correct).toBe(10);
    expect(model).toEqual(original);
    expect(fitConditionModel(brightTraining)).toEqual(original);
    expect(darkEvaluation).toEqual(data);
    expect(() => evaluateCondition(model, data, 0)).toThrow();
    expect(() => fitConditionModel([])).toThrow();
  });
});
describe("L006 optional exercises and source mapping", () => {
  it("grades every option in all four questions, with explanations and valid sources", () => {
    expect(fairnessQuestions).toHaveLength(4);
    for (const q of fairnessQuestions) {
      expect(q.options).toHaveLength(4);
      q.options.forEach((o, i) => {
        expect(o.explanation.length).toBeGreaterThan(25);
        expect(grade(q.id, i, "session", fairnessQuestions).correct).toBe(
          i === q.answer,
        );
      });
      q.sourceIds.forEach((id) =>
        expect(fairnessSources.some((s) => s.id === id)).toBe(true),
      );
    }
    expect(fairnessSyllabus).toHaveLength(3);
    for (const item of fairnessSyllabus)
      expect(fairnessSources.some((s) => s.id === item.sourceId)).toBe(true);
  });
});
const oldState = () => {
  let b = beginGeneralization(beginEvaluation(emptyBackup()));
  b.progress.started = true;
  b.progress.storySampleAdded = true;
  b.progress.introStage = "sorting";
  b.generalization!.stage = "refined";
  b.generalization!.visited = ["intro", "practice", "refined"];
  b.generalization!.prediction = "refined";
  const a = grade(questions[0].id, 0, b.progress.sessionId);
  b.attempts = [a];
  b.reviews = [reviewFor(a)];
  b.evaluationAttempts = [
    grade("L004-Q01", 1, b.evaluation!.sessionId, evaluationQuestions),
  ];
  b.completions = ["L003", "L004", "L005"].map((lessonId) => ({
    id: `completion-${lessonId}-past-${lessonId}`,
    lessonId,
    sessionId: `past-${lessonId}`,
    recordedAt: "2026-11-01T00:00:00.000Z",
  }));
  return b;
};
// Use a v0.1.8-shaped state without new optional fields.
const legacy = () => {
  const b = oldState();

  return b;
};
describe("L006 compatible independent saves", () => {
  it("accepts legacy data and preserves all three lessons, history, reviews, settings and completions", () => {
    const old = legacy(),
      next = beginFairness(old);
    expect(validateBackup(old)).toEqual(old);
    for (const key of [
      "progress",
      "evaluation",
      "generalization",
      "attempts",
      "reviews",
      "settings",
      "evaluationAttempts",
    ] as const)
      expect(next[key]).toEqual(old[key]);
    expect(beginFairness(next)).toBe(next);
    expect(restartLesson(next).fairness).toEqual(next.fairness);
    expect(beginEvaluation(next, true).fairness).toEqual(next.fairness);
    expect(beginGeneralization(next, true).fairness).toEqual(next.fairness);
  });
  it("finishes with no exercise answers and restarts only the current L006 session", () => {
    const b = beginFairness(legacy());
    expect(() => completeFairness(b)).toThrow();
    b.fairness!.stage = "ending";
    b.fairness!.visited = [...fairnessStoryStages];
    b.fairness!.lightingAdjusted = true;
    const done = completeFairness(b),
      restart = beginFairness(done, true);
    expect(validateBackup(done)).toEqual(done);
    expect(done.fairnessAttempts).toBeUndefined();
    expect(restart.fairness?.sessionId).not.toBe(done.fairness?.sessionId);
    expect(restart.fairness?.stage).toBe("intro");
    expect(restart.fairness?.lightingAdjusted).toBe(false);
    expect(
      completionRecords(restart).filter((c) => c.lessonId === "L006"),
    ).toHaveLength(1);
    for (const key of [
      "progress",
      "evaluation",
      "generalization",
      "attempts",
      "reviews",
      "settings",
      "evaluationAttempts",
    ] as const)
      expect(restart[key]).toEqual(b[key]);
  });
  it("round trips persisted adjusted state and all four exercise histories, retaining them after restart", async () => {
    const b = beginFairness(legacy());
    Object.assign(b.fairness!, {
      stage: "quiz",
      visited: [...fairnessStoryStages, "quiz"],
      lightingAdjusted: true,
      questionIndex: 3,
    });
    b.fairnessAttempts = fairnessQuestions.map((q) =>
      grade(q.id, q.answer, b.fairness!.sessionId, fairnessQuestions),
    );
    await saveState(b);
    expect(await loadState()).toEqual(b);
    expect(validateBackup(JSON.parse(JSON.stringify(b)))).toEqual(b);
    expect(beginFairness(b, true).fairnessAttempts).toEqual(b.fairnessAttempts);
  });
  it("merges per-lesson timestamps and answer IDs; old backups do not erase L006; conflicting history is rejected", () => {
    const old = legacy(),
      a = beginFairness(old),
      b = structuredClone(a);
    Object.assign(b.fairness!, {
      updatedAt: "2099-01-01T00:00:00.000Z",
      stage: "lighting",
      visited: ["intro", "results", "investigation", "lighting"],
      lightingAdjusted: true,
    });
    b.fairnessAttempts = [
      grade(
        fairnessQuestions[0].id,
        1,
        b.fairness!.sessionId,
        fairnessQuestions,
      ),
    ];
    expect(mergeBackups(a, b).fairness).toEqual(b.fairness);
    expect(mergeBackups(b, old).fairness).toEqual(b.fairness);
    expect(mergeBackups(old, b).fairnessAttempts).toEqual(b.fairnessAttempts);
    const conflict = structuredClone(b);
    conflict.fairnessAttempts![0].selected = 0;
    conflict.fairnessAttempts![0].correct = false;
    expect(() => mergeBackups(b, conflict)).toThrow("同じ履歴ID");
  });
  it("rejects skipped scenes, invalid lighting, premature completion and forged answers", () => {
    const b = beginFairness(legacy());
    for (const patch of [
      { stage: "ending" },
      { lightingAdjusted: true },
      { completed: true },
      { questionIndex: 4 },
      { stage: "unknown" },
    ]) {
      const bad = structuredClone(b);
      Object.assign(bad.fairness!, patch);
      expect(() => validateBackup(bad)).toThrow();
    }
    b.fairnessAttempts = [
      grade(
        fairnessQuestions[0].id,
        0,
        b.fairness!.sessionId,
        fairnessQuestions,
      ),
    ];
    b.fairnessAttempts[0].correct = true;
    expect(() => validateBackup(b)).toThrow();
  });
});
