import { describe, it, expect } from "vitest";
import { convolve3x3, fixedFilters, grayscale, pixelAt } from "./deepLearning";
import {
  deepQuestions,
  deepConcepts,
  deepSources,
  deepDives,
  deepStoryStages,
} from "../data/deepLearning";
import {
  beginDeepLearning,
  completeDeepLearning,
  beginEvaluation,
  beginGeneralization,
  beginFairness,
  emptyBackup,
  validateBackup,
  mergeBackups,
  grade,
  reviewFor,
  restartLesson,
} from "./learning";
import "fake-indexeddb/auto";
import { loadState, saveState } from "./storage";
const legacy = () => {
  const b = beginFairness(beginGeneralization(beginEvaluation(emptyBackup())));
  b.progress.started = true;
  b.progress.storySampleAdded = true;
  b.generalization!.stage = "refined";
  b.generalization!.visited = ["intro", "practice", "refined"];
  b.fairness!.stage = "lighting";
  b.fairness!.visited = ["intro", "results", "investigation", "lighting"];
  b.fairness!.lightingAdjusted = true;
  const a = grade("L003-Q01", 0, b.progress.sessionId);
  b.attempts = [a];
  b.reviews = [reviewFor(a)];
  return b;
};
const ended = () => {
  const b = beginDeepLearning(legacy()),
    d = b.deepLearning!;
  Object.assign(d, {
    stage: "ending",
    visited: [...deepStoryStages],
    animal: 3,
    examplesShown: true,
    pixelExpanded: true,
    networkStep: 4,
    networkSeen: true,
  });
  return b;
};
describe("L007 real pixel and fixed filter calculation", () => {
  it("reads exact RGBA positions, including black and white, without fabricated colors", () => {
    const data = [
      12, 34, 56, 255, 0, 0, 0, 255, 255, 255, 255, 255, 98, 76, 54, 255,
    ];
    expect(pixelAt(data, 2, 0, 0)).toEqual([12, 34, 56]);
    expect(pixelAt(data, 2, 1, 1)).toEqual([98, 76, 54]);
    expect(grayscale(data)).toEqual([31, 0, 255, 79]);
    for (const pos of [
      [-1, 0],
      [2, 1],
      [1, 2],
      [0.5, 0],
    ])
      expect(() => pixelAt(data, 2, ...(pos as [number, number]))).toThrow();
  });
  it("performs actual valid 3x3 filtering on 8x8: independent loop reference for every output", () => {
    const input = Array.from({ length: 64 }, (_, i) => (i * 3) % 256);
    for (const f of Object.values(fixedFilters)) {
      const output = convolve3x3(input, 8, f);
      expect(output).toHaveLength(36);
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 6; x++) {
          let expected = 0;
          for (let j = 0; j < 3; j++)
            for (let k = 0; k < 3; k++)
              expected += input[(y + j) * 8 + x + k] * f[j * 3 + k];
          expect(output[y * 6 + x]).toBeCloseTo(expected);
        }
    }
    expect(convolve3x3(Array(64).fill(20), 8, fixedFilters.edge)).toEqual(
      Array(36).fill(0),
    );
    expect(convolve3x3(Array(64).fill(9), 8, fixedFilters.average)).toEqual(
      Array(36).fill(9),
    );
    expect(() => convolve3x3([], 8, fixedFilters.edge)).toThrow();
    expect(() =>
      convolve3x3(Array(64).fill(NaN), 8, fixedFilters.edge),
    ).toThrow();
  });
});
describe("L007 exercises and sourced optional explanations", () => {
  it("all five questions grade all twenty options with unique IDs, clues, concepts and sources", () => {
    expect(deepQuestions).toHaveLength(5);
    expect(new Set(deepQuestions.map((q) => q.id)).size).toBe(5);
    for (const q of deepQuestions) {
      expect(q.options).toHaveLength(4);
      expect(q.clue.length).toBeGreaterThan(10);
      q.options.forEach((o, i) => {
        expect(o.explanation.length).toBeGreaterThan(20);
        expect(grade(q.id, i, "test", deepQuestions).correct).toBe(
          i === q.answer,
        );
      });
      q.conceptIds.forEach((id) =>
        expect(deepConcepts.some((c) => c.id === id)).toBe(true),
      );
      q.sourceIds.forEach((id) =>
        expect(deepSources.some((s) => s.id === id)).toBe(true),
      );
    }
  });
  it("five deep dives each provide easy/example/diagram/technical explanation/concepts/sources", () => {
    expect(deepDives).toHaveLength(5);
    for (const d of deepDives) {
      for (const text of [d.easy, d.example, d.detail])
        expect(text.length).toBeGreaterThan(25);
      expect(d.diagram.length).toBeGreaterThan(1);
      d.sourceIds.forEach((id) =>
        expect(deepSources.some((s) => s.id === id)).toBe(true),
      );
      d.conceptIds.forEach((id) =>
        expect(deepConcepts.some((c) => c.id === id)).toBe(true),
      );
    }
  });
});
describe("L007 independent, backward-compatible saves", () => {
  it("keeps four old lessons, attempts, settings, and reviews through begin/resume/reset", () => {
    const old = legacy(),
      next = beginDeepLearning(old);
    expect(validateBackup(old)).toEqual(old);
    expect(beginDeepLearning(next)).toBe(next);
    const restarted = beginDeepLearning(next, true);
    expect(restarted.deepLearning!.sessionId).not.toBe(
      next.deepLearning!.sessionId,
    );
    for (const key of [
      "progress",
      "evaluation",
      "generalization",
      "fairness",
      "attempts",
      "reviews",
      "settings",
    ] as const) {
      expect(next[key]).toEqual(old[key]);
      expect(restarted[key]).toEqual(old[key]);
    }
    expect(restartLesson(next).deepLearning).toEqual(next.deepLearning);
    expect(beginFairness(next, true).deepLearning).toEqual(next.deepLearning);
  });
  it("finishes without quizzes/details, archives completion on reset, retains historical answers", () => {
    expect(() => completeDeepLearning(beginDeepLearning(legacy()))).toThrow();
    const b = ended();
    b.deepLearningAttempts = [
      grade(deepQuestions[0].id, 0, b.deepLearning!.sessionId, deepQuestions),
    ];
    const done = completeDeepLearning(b),
      again = beginDeepLearning(done, true);
    expect(validateBackup(done)).toEqual(done);
    expect(again.completions).toEqual(done.completions);
    expect(again.deepLearningAttempts).toEqual(b.deepLearningAttempts);
    expect(again.deepLearning!.stage).toBe("intro");
    expect(again.deepLearning!.pixelExpanded).toBe(false);
    expect(done.deepLearning!.visited).not.toContain("quiz");
    expect(done.deepLearning!.visited).not.toContain("details");
    done.deepLearning!.stage = "layers";
    done.deepLearning!.networkStep = 0;
    expect(validateBackup(done)).toEqual(done); // A completed learner may review a diagram from its start.
  });
  it("rejects inconsistent completion, out-of-range coordinates, invalid history and skipped main scenes", () => {
    for (const change of [
      { pixelX: 32 },
      { networkStep: -1 },
      { visited: ["intro", "ending"] },
      { networkSeen: false },
      { animal: null },
    ]) {
      const b = ended();
      Object.assign(b.deepLearning!, change);
      expect(() => validateBackup(b)).toThrow();
    }
    const b = ended();
    b.deepLearningAttempts = [
      { ...grade(deepQuestions[0].id, 0, "s", deepQuestions), correct: true },
    ];
    expect(() => validateBackup(b)).toThrow();
  });
  it("merges old backups without erasing L007 and independently selects newest progress/history", () => {
    const old = legacy(),
      b = ended();
    b.deepLearningAttempts = [
      grade(deepQuestions[0].id, 1, "s", deepQuestions),
    ];
    expect(mergeBackups(b, old).deepLearning).toEqual(b.deepLearning);
    expect(mergeBackups(old, b).deepLearningAttempts).toEqual(
      b.deepLearningAttempts,
    );
    const conflict = structuredClone(b);
    conflict.deepLearningAttempts![0].selected = 0;
    conflict.deepLearningAttempts![0].correct = false;
    expect(() => mergeBackups(b, conflict)).toThrow(/同じ履歴ID/);
  });
  it("round trips real IndexedDB state, including current pixel and inference mode", async () => {
    const b = ended();
    Object.assign(b.deepLearning!, { pixelX: 7, pixelY: 9, flow: "inference" });
    await saveState(b);
    expect(await loadState()).toEqual(b);
  });
});
