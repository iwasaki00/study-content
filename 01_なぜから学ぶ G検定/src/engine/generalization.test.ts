import { describe, it, expect } from "vitest";
import {
  practiceBoxes,
  freshBoxes,
  generalizationStages,
} from "../data/generalization";
import { trainRules, evaluateBoxes } from "./generalization";
import {
  emptyBackup,
  beginGeneralization,
  completeGeneralization,
  validateBackup,
  mergeBackups,
  beginEvaluation,
  restartLesson,
  grade,
  reviewFor,
  completionRecords,
} from "./learning";
import { questions } from "../data/content";
const model = trainRules(practiceBoxes);
describe("L005: practice-only training and unseen evaluation", () => {
  it("compares all five thresholds and derives the exception from the one practice error", () => {
    expect(model.trials.map((t) => [t.threshold, t.correct])).toEqual([
      [0, 5],
      [1, 5],
      [2, 7],
      [3, 5],
      [4, 3],
    ]);
    expect(model.basic).toEqual({ threshold: 2, exceptions: [] });
    expect(model.refined).toEqual({
      threshold: 2,
      exceptions: [{ lot: "B", dent: 0, actual: "不良" }],
    });
    expect(evaluateBoxes(model.basic, practiceBoxes).correct).toBe(7);
    expect(
      evaluateBoxes(model.basic, practiceBoxes).missed.map((r) => r.id),
    ).toEqual(["P02"]);
    expect(evaluateBoxes(model.refined, practiceBoxes).correct).toBe(8);
  });
  it("reverses on identical unseen boxes and counts duplicate features as separate IDs", () => {
    expect(evaluateBoxes(model.basic, freshBoxes).correct).toBe(8);
    const r = evaluateBoxes(model.refined, freshBoxes);
    expect(r.correct).toBe(6);
    expect(r.total).toBe(8);
    expect(r.overstopped.map((r) => r.id)).toEqual(["N01", "N02"]);
    expect(
      new Set([...practiceBoxes, ...freshBoxes].map((b) => b.id)).size,
    ).toBe(16);
  });
  it("evaluation never retrains or mutates the model, even when unseen labels and features change", () => {
    const before = structuredClone(model),
      practiceBefore = structuredClone(practiceBoxes);
    const changed = freshBoxes.map((b) => ({
      ...b,
      lot: "B",
      dent: 0,
      actual: "不良" as const,
    }));
    expect(evaluateBoxes(model.refined, changed).correct).toBe(8);
    expect(model).toEqual(before);
    expect(trainRules(practiceBoxes)).toEqual(before);
    expect(practiceBoxes).toEqual(practiceBefore);
    // Rule changes are driven by changed practice data, not constant output.
    const alternate = practiceBoxes.map((b) => ({
      ...b,
      actual: b.dent >= 3 ? ("不良" as const) : ("良品" as const),
    }));
    expect(trainRules(alternate).basic.threshold).toBe(3);
    expect(trainRules(alternate).refined.exceptions).toEqual([]);
  });
});
describe("L005 isolated progress and compatible backup", () => {
  const old = () => {
    const b = beginEvaluation(emptyBackup());
    b.progress.started = true;
    b.progress.storySampleAdded = true;
    b.progress.introStage = "sorting";
    const a = grade(questions[0].id, 0, b.progress.sessionId);
    b.attempts = [a];
    b.reviews = [reviewFor(a)];
    b.settings.speed = 2;
    return b;
  };
  it("accepts old data unchanged and keeps both older lessons, answers, reviews and settings on start/restart", () => {
    const b = old(),
      g = beginGeneralization(b);
    expect(validateBackup(b)).toEqual(b);
    for (const key of [
      "progress",
      "evaluation",
      "attempts",
      "reviews",
      "settings",
    ] as const)
      expect(g[key]).toEqual(b[key]);
    expect(beginGeneralization(g)).toBe(g);
    expect(beginGeneralization(g, true).generalization?.sessionId).not.toBe(
      g.generalization?.sessionId,
    );
    expect(restartLesson(g).generalization).toEqual(g.generalization);
    expect(beginEvaluation(g, true).generalization).toEqual(g.generalization);
  });
  it("finishes without quiz, archives completion and preserves it when restarting", () => {
    const b = beginGeneralization(old());
    expect(() => completeGeneralization(b)).toThrow();
    b.generalization!.stage = "ending";
    b.generalization!.visited = [...generalizationStages];
    const done = completeGeneralization(b),
      restarted = beginGeneralization(done, true);
    expect(validateBackup(done)).toEqual(done);
    expect(restarted.generalization?.stage).toBe("intro");
    expect(restarted.generalization?.prediction).toBe(null);
    expect(restarted.generalization?.completed).toBe(false);
    expect(
      completionRecords(restarted).filter((c) => c.lessonId === "L005"),
    ).toHaveLength(1);
    expect(restarted.attempts).toEqual(b.attempts);
  });
  it("round trips backup, merges by each lesson's timestamp, and retains L005 when importing older data", () => {
    const b = beginGeneralization(old());
    b.generalization!.prediction = "refined";
    b.generalization!.stage = "refined";
    b.generalization!.visited = ["intro", "practice", "refined"];
    const imported = validateBackup(JSON.parse(JSON.stringify(b)));
    expect(imported).toEqual(b);
    expect(mergeBackups(b, old()).generalization).toEqual(b.generalization);
    const newer = structuredClone(b);
    newer.generalization!.updatedAt = "2099-01-01T00:00:00.000Z";
    newer.generalization!.stage = "comparison";
    newer.generalization!.visited.push("comparison");
    expect(mergeBackups(b, newer).generalization).toEqual(newer.generalization);
    expect(mergeBackups(newer, b).generalization).toEqual(newer.generalization);
  });
  it("rejects broken stage, missing visits, invalid prediction or premature completion", () => {
    const b = beginGeneralization(old());
    for (const change of [
      { stage: "unknown" },
      { stage: "comparison" },
      { completed: true },
      { prediction: "wrong" },
      { visited: [] },
      { visited: ["intro", "intro"] },
    ]) {
      const invalid = structuredClone(b);
      Object.assign(invalid.generalization!, change);
      expect(() => validateBackup(invalid)).toThrow();
    }
  });
});
