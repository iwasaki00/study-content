import type { DeepLearningProgress } from "../types";
import {
  deepStages,
  deepStoryStages,
  deepQuestions,
} from "../data/deepLearning";
import { newDeepLearningProgress, deepLearningFinished } from "./deepLearning";
import type {
  Backup,
  LearningProgress,
  LessonCompletion,
  QuestionAttempt,
  ReviewState,
} from "../types";
import { evaluationQuestions } from "../data/evaluation";
import { newEvaluationProgress, evaluationFinished } from "./evaluation";
import type { EvaluationProgress, GeneralizationProgress } from "../types";
import { generalizationStages } from "../data/generalization";
import {
  newGeneralizationProgress,
  generalizationFinished,
} from "./generalization";
import { questions } from "../data/content";
import type { FairnessProgress } from "../types";
import {
  fairnessStages,
  fairnessStoryStages,
  fairnessQuestions,
} from "../data/fairness";
import { newFairnessProgress, fairnessFinished } from "./fairness";
export const newProgress = (): LearningProgress => ({
  id: "progress-L003",
  lessonId: "L003",
  scene: 0,
  questionIndex: 0,
  completed: false,
  visited: [0],
  updatedAt: new Date().toISOString(),
  sessionId: crypto.randomUUID(),
  predictions: [-1, -1, -1],
  started: false,
  storySampleAdded: false,
  introStage: "prologue",
  prologueScroll: 0,
  challenge: null,
  challengeLabelled: true,
});
export const emptyBackup = (): Backup => ({
  formatVersion: 1,
  exportedAt: new Date().toISOString(),
  attempts: [],
  progress: newProgress(),
  reviews: [],
  settings: { id: "settings", speed: 1 },
});
export function grade(
  questionId: string,
  selected: number,
  sessionId: string,
  items = questions,
): QuestionAttempt {
  const q = items.find((q) => q.id === questionId);
  if (!q || !Number.isInteger(selected) || selected < 0 || selected > 3)
    throw Error("回答が不正です");
  return {
    id: crypto.randomUUID(),
    questionId,
    version: q.version,
    selected,
    correct: q.answer === selected,
    answeredAt: new Date().toISOString(),
    sessionId,
  };
}
export function reviewFor(a: QuestionAttempt): ReviewState {
  return {
    id: `review-${a.questionId}`,
    questionId: a.questionId,
    dueAt: new Date(
      Date.parse(a.answeredAt) + (a.correct ? 3 : 1) * 86400000,
    ).toISOString(),
    reason: a.correct ? "correct" : "incorrect",
    updatedAt: a.answeredAt,
  };
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString() === v;
const int = (v: unknown, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const str = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 200;
export function validateBackup(input: unknown): Backup {
  const fail = (): never => {
    throw Error(
      "バックアップの形式または整合性が不正です。保存内容は変更していません。",
    );
  };
  if (
    !record(input) ||
    input.formatVersion !== 1 ||
    !date(input.exportedAt) ||
    !Array.isArray(input.attempts) ||
    !Array.isArray(input.reviews) ||
    !record(input.progress) ||
    !record(input.settings)
  )
    return fail();
  if (input.attempts.length > 100000 || input.reviews.length > questions.length)
    return fail();
  const p = input.progress,
    s = input.settings;
  if (
    p.episode !== undefined &&
    (!record(p.episode) ||
      !["sorting", "records", "routes", "ending"].includes(
        p.episode.stage as string,
      ) ||
      typeof p.episode.grouped !== "boolean" ||
      typeof p.episode.compared !== "boolean" ||
      !["speed", "care"].includes(p.episode.priority as string))
  )
    return fail();
  if (
    record(p.episode) &&
    ((p.episode.stage !== "sorting" && !p.storySampleAdded) ||
      (["routes", "ending"].includes(p.episode.stage as string) &&
        !p.episode.grouped) ||
      (p.episode.stage === "ending" && !p.episode.compared) ||
      (p.episode.compared && !p.episode.grouped))
  )
    return fail();
  if (
    (p.prologueScroll !== undefined &&
      (typeof p.prologueScroll !== "number" ||
        !Number.isFinite(p.prologueScroll) ||
        p.prologueScroll < 0)) ||
    (p.introStage !== undefined &&
      !["prologue", "ai-trial", "sorting"].includes(p.introStage as string)) ||
    p.id !== "progress-L003" ||
    p.lessonId !== "L003" ||
    !int(p.scene, 8) ||
    !int(p.questionIndex, 11) ||
    typeof p.completed !== "boolean" ||
    (p.started !== undefined && typeof p.started !== "boolean") ||
    (p.storySampleAdded !== undefined &&
      typeof p.storySampleAdded !== "boolean") ||
    !date(p.updatedAt) ||
    !str(p.sessionId) ||
    !Array.isArray(p.visited) ||
    !p.visited.every((v) => int(v, 8)) ||
    new Set(p.visited).size !== p.visited.length ||
    !p.visited.includes(p.scene) ||
    !Array.isArray(p.predictions) ||
    p.predictions.length !== 3 ||
    !p.predictions.every((v) => v === -1 || int(v, 2)) ||
    !(p.challenge === null || int(p.challenge, 2)) ||
    typeof p.challengeLabelled !== "boolean" ||
    s.id !== "settings" ||
    ![0.5, 1, 2].includes(s.speed as number)
  )
    return fail();
  const ids = new Set<string>();
  for (const a of input.attempts) {
    if (
      !record(a) ||
      !str(a.id) ||
      ids.has(a.id) ||
      !str(a.sessionId) ||
      !date(a.answeredAt) ||
      !int(a.selected, 3)
    )
      return fail();
    const q = questions.find((q) => q.id === a.questionId);
    if (
      !q ||
      a.version !== q.version ||
      a.correct !== (a.selected === q.answer)
    )
      return fail();
    ids.add(a.id);
  }
  const reviewIds = new Set();
  for (const r of input.reviews) {
    if (
      !record(r) ||
      !questions.some((q) => q.id === r.questionId) ||
      r.id !== `review-${r.questionId}` ||
      reviewIds.has(r.id) ||
      !date(r.dueAt) ||
      !date(r.updatedAt) ||
      !["correct", "incorrect", "manual"].includes(r.reason as string)
    )
      return fail();
    reviewIds.add(r.id);
  }
  if (p.completed && !storyVisited(p as unknown as LearningProgress))
    return fail();
  if (input.completions !== undefined) {
    if (!Array.isArray(input.completions) || input.completions.length > 100000)
      return fail();
    const completionIds = new Set();
    for (const c of input.completions) {
      if (
        !record(c) ||
        !str(c.lessonId) ||
        !str(c.sessionId) ||
        c.id !== `completion-${c.lessonId}-${c.sessionId}` ||
        completionIds.has(c.id) ||
        !date(c.recordedAt)
      )
        return fail();
      completionIds.add(c.id);
    }
  }
  if (input.evaluation !== undefined) {
    const e = input.evaluation,
      stages = ["intro", "discovery", "comparison", "ending", "quiz"];
    if (
      !record(e) ||
      e.id !== "progress-L004" ||
      e.lessonId !== "L004" ||
      !stages.includes(e.stage as string) ||
      !int(e.questionIndex, 2) ||
      !str(e.sessionId) ||
      !date(e.updatedAt) ||
      typeof e.completed !== "boolean" ||
      !Array.isArray(e.visited) ||
      !e.visited.every((stage) => stages.includes(stage as string)) ||
      new Set(e.visited).size !== e.visited.length ||
      !e.visited.includes("intro") ||
      !e.visited.includes(e.stage)
    )
      return fail();
    const required = stages.slice(
      0,
      Math.min(stages.indexOf(e.stage as string) + 1, 4),
    );
    if (
      !required.every((stage) => (e.visited as string[]).includes(stage)) ||
      (e.completed && !evaluationFinished(e as unknown as EvaluationProgress))
    )
      return fail();
  }
  if (input.generalization !== undefined) {
    const g = input.generalization;
    if (
      !record(g) ||
      g.id !== "progress-L005" ||
      g.lessonId !== "L005" ||
      !generalizationStages.includes(
        g.stage as GeneralizationProgress["stage"],
      ) ||
      !str(g.sessionId) ||
      !date(g.updatedAt) ||
      typeof g.completed !== "boolean" ||
      ![null, "basic", "refined", "same"].includes(
        g.prediction as string | null,
      ) ||
      !Array.isArray(g.visited) ||
      !g.visited.every((s) =>
        generalizationStages.includes(s as GeneralizationProgress["stage"]),
      ) ||
      new Set(g.visited).size !== g.visited.length ||
      !g.visited.includes(g.stage)
    )
      return fail();
    const required = generalizationStages.slice(
      0,
      generalizationStages.indexOf(g.stage as GeneralizationProgress["stage"]) +
        1,
    );
    if (
      !required.every((s) => (g.visited as string[]).includes(s)) ||
      (g.completed &&
        !generalizationFinished(g as unknown as GeneralizationProgress))
    )
      return fail();
  }
  if (input.evaluationAttempts !== undefined) {
    if (
      !Array.isArray(input.evaluationAttempts) ||
      input.evaluationAttempts.length > 100000
    )
      return fail();
    const ids = new Set();
    for (const a of input.evaluationAttempts) {
      if (
        !record(a) ||
        !str(a.id) ||
        ids.has(a.id) ||
        !str(a.sessionId) ||
        !date(a.answeredAt) ||
        !int(a.selected, 3)
      )
        return fail();
      const q = evaluationQuestions.find((q) => q.id === a.questionId);
      if (
        !q ||
        a.version !== q.version ||
        a.correct !== (a.selected === q.answer)
      )
        return fail();
      ids.add(a.id);
    }
  }
  if (input.fairness !== undefined) {
    const f = input.fairness;
    if (
      !record(f) ||
      f.id !== "progress-L006" ||
      f.lessonId !== "L006" ||
      !fairnessStages.includes(f.stage as FairnessProgress["stage"]) ||
      !str(f.sessionId) ||
      !date(f.updatedAt) ||
      typeof f.completed !== "boolean" ||
      typeof f.lightingAdjusted !== "boolean" ||
      !int(f.questionIndex, 3) ||
      !Array.isArray(f.visited) ||
      !f.visited.every((s) =>
        fairnessStages.includes(s as FairnessProgress["stage"]),
      ) ||
      new Set(f.visited).size !== f.visited.length ||
      !f.visited.includes(f.stage)
    )
      return fail();
    const index = fairnessStages.indexOf(f.stage as FairnessProgress["stage"]);
    const required = fairnessStoryStages.slice(
      0,
      Math.min(index + 1, fairnessStoryStages.length),
    );
    if (
      !required.every((s) => (f.visited as string[]).includes(s)) ||
      (index >= 4 && !f.lightingAdjusted) ||
      (f.lightingAdjusted && !(f.visited as string[]).includes("lighting")) ||
      (f.completed && !fairnessFinished(f as unknown as FairnessProgress))
    )
      return fail();
  }
  if (input.fairnessAttempts !== undefined) {
    if (
      !Array.isArray(input.fairnessAttempts) ||
      input.fairnessAttempts.length > 100000
    )
      return fail();
    const ids = new Set();
    for (const a of input.fairnessAttempts) {
      if (
        !record(a) ||
        !str(a.id) ||
        ids.has(a.id) ||
        !str(a.sessionId) ||
        !date(a.answeredAt) ||
        !int(a.selected, 3)
      )
        return fail();
      const q = fairnessQuestions.find((q) => q.id === a.questionId);
      if (
        !q ||
        a.version !== q.version ||
        a.correct !== (a.selected === q.answer)
      )
        return fail();
      ids.add(a.id);
    }
  }

  if (input.deepLearning !== undefined) {
    const d = input.deepLearning;
    if (
      !record(d) ||
      d.id !== "progress-L007" ||
      d.lessonId !== "L007" ||
      !deepStages.includes(d.stage as DeepLearningProgress["stage"]) ||
      !str(d.sessionId) ||
      !date(d.updatedAt) ||
      typeof d.completed !== "boolean" ||
      typeof d.examplesShown !== "boolean" ||
      typeof d.pixelExpanded !== "boolean" ||
      !(d.animal === null || int(d.animal, 4)) ||
      !int(d.pixelX, 31) ||
      !int(d.pixelY, 31) ||
      typeof d.networkSeen !== "boolean" ||
      !int(d.networkStep, 4) ||
      !["training", "inference"].includes(d.flow as string) ||
      !int(d.questionIndex, 4) ||
      !Array.isArray(d.visited) ||
      !d.visited.every((v) =>
        deepStages.includes(v as DeepLearningProgress["stage"]),
      ) ||
      new Set(d.visited).size !== d.visited.length ||
      !d.visited.includes(d.stage)
    )
      return fail();
    const index = deepStages.indexOf(d.stage as DeepLearningProgress["stage"]);
    const required = deepStoryStages.slice(
      0,
      Math.min(index + 1, deepStoryStages.length),
    );
    if (
      !required.every((v) => (d.visited as string[]).includes(v)) ||
      (index >= 2 && (!d.examplesShown || d.animal === null)) ||
      (index >= 3 && !d.pixelExpanded) ||
      (index >= 4 && !d.networkSeen) ||
      (d.completed &&
        !deepLearningFinished(d as unknown as DeepLearningProgress))
    )
      return fail();
  }
  if (input.deepLearningAttempts !== undefined) {
    if (
      !Array.isArray(input.deepLearningAttempts) ||
      input.deepLearningAttempts.length > 100000
    )
      return fail();
    const seen = new Set();
    for (const a of input.deepLearningAttempts) {
      if (
        !record(a) ||
        !str(a.id) ||
        seen.has(a.id) ||
        !str(a.sessionId) ||
        !date(a.answeredAt) ||
        !int(a.selected, 3)
      )
        return fail();
      const q = deepQuestions.find((q) => q.id === a.questionId);
      if (
        !q ||
        a.version !== q.version ||
        a.correct !== (a.selected === q.answer)
      )
        return fail();
      seen.add(a.id);
    }
  }
  // Return a detached, validated snapshot; UI never mutates the imported object.
  return structuredClone(input) as unknown as Backup;
}
export function mergeBackups(current: Backup, incoming: Backup): Backup {
  const a = validateBackup(current),
    b = validateBackup(incoming);
  const attempts = new Map(a.attempts.map((v) => [v.id, v]));
  for (const item of b.attempts) {
    const old = attempts.get(item.id);
    if (
      old &&
      (
        [
          "id",
          "questionId",
          "version",
          "selected",
          "correct",
          "answeredAt",
          "sessionId",
        ] as const
      ).some((key) => old[key] !== item[key])
    )
      throw Error("同じ履歴IDに異なる内容があるため統合できません。");
    attempts.set(item.id, item);
  }
  const reviews = new Map(a.reviews.map((v) => [v.id, v]));
  for (const r of b.reviews) {
    const old = reviews.get(r.id);
    if (!old || r.updatedAt > old.updatedAt) reviews.set(r.id, r);
  }
  const completions = combineCompletions([
    ...completionRecords(a),
    ...completionRecords(b),
  ]);
  return validateBackup({
    ...a,
    ...(completions.length || a.completions || b.completions
      ? { completions }
      : {}),
    exportedAt: new Date().toISOString(),
    attempts: [...attempts.values()].sort((x, y) =>
      x.answeredAt.localeCompare(y.answeredAt),
    ),
    progress:
      b.progress.updatedAt > a.progress.updatedAt ? b.progress : a.progress,
    reviews: [...reviews.values()],
    ...mergeEvaluation(a, b),
    ...mergeFairness(a, b),
    ...mergeDeepLearning(a, b),
    ...(a.generalization || b.generalization
      ? {
          generalization: !a.generalization
            ? b.generalization
            : !b.generalization
              ? a.generalization
              : b.generalization.updatedAt > a.generalization.updatedAt
                ? b.generalization
                : a.generalization,
        }
      : {}),
  });
}

export const storyVisited = (p: LearningProgress) =>
  p.episode
    ? p.episode.stage === "ending" &&
      p.episode.grouped &&
      p.episode.compared &&
      !!p.storySampleAdded
    : [0, 1, 2, 3, 4, 5, 6, 8].every((scene) => p.visited.includes(scene));
export function hasLearningRecord(b: Backup): boolean {
  const p = b.progress;
  return (
    !!p.started ||
    !!p.storySampleAdded ||
    p.scene > 0 ||
    p.visited.length > 1 ||
    p.completed ||
    p.predictions.some((v) => v !== -1) ||
    b.attempts.length > 0 ||
    (b.completions?.some((c) => c.lessonId === "L003") ?? false)
  );
}

function combineCompletions(items: LessonCompletion[]): LessonCompletion[] {
  const unique = new Map<string, LessonCompletion>();
  for (const c of items) {
    const old = unique.get(c.id);
    if (!old || c.recordedAt < old.recordedAt) unique.set(c.id, c);
  }
  return [...unique.values()].sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );
}
export function completionRecords(b: Backup): LessonCompletion[] {
  const records = [...(b.completions ?? [])];
  for (const p of [
    b.progress,
    b.evaluation,
    b.generalization,
    b.fairness,
    b.deepLearning,
  ]) {
    if (!p?.completed) continue;
    const id = `completion-${p.lessonId}-${p.sessionId}`;
    if (!records.some((c) => c.id === id))
      records.push({
        id,
        lessonId: p.lessonId,
        sessionId: p.sessionId,
        recordedAt: p.updatedAt,
      });
  }
  return records;
}
export function beginEvaluation(b: Backup, restart = false): Backup {
  if (b.evaluation && !restart) return b;
  return {
    ...b,
    completions: completionRecords(b),
    evaluation: newEvaluationProgress(),
  };
}
export function completeEvaluation(b: Backup): Backup {
  if (!b.evaluation || !evaluationFinished(b.evaluation))
    throw Error("第2話の結末まで確認してください");
  const next = {
    ...b,
    completions: completionRecords(b),
    evaluation: {
      ...b.evaluation,
      completed: true,
      updatedAt: new Date().toISOString(),
    },
  };
  return { ...next, completions: completionRecords(next) };
}
function mergeEvaluation(a: Backup, b: Backup): Partial<Backup> {
  const result: Partial<Backup> = {};
  if (a.evaluation || b.evaluation)
    result.evaluation = !a.evaluation
      ? b.evaluation
      : !b.evaluation
        ? a.evaluation
        : b.evaluation.updatedAt > a.evaluation.updatedAt
          ? b.evaluation
          : a.evaluation;
  if (a.evaluationAttempts || b.evaluationAttempts) {
    const attempts = new Map(
      (a.evaluationAttempts ?? []).map((x) => [x.id, x]),
    );
    for (const item of b.evaluationAttempts ?? []) {
      const old = attempts.get(item.id);
      if (
        old &&
        (
          [
            "id",
            "questionId",
            "version",
            "selected",
            "correct",
            "answeredAt",
            "sessionId",
          ] as const
        ).some((key) => old[key] !== item[key])
      )
        throw Error("第2話の同じ履歴IDに異なる内容があるため統合できません。");
      attempts.set(item.id, item);
    }
    result.evaluationAttempts = [...attempts.values()].sort((x, y) =>
      x.answeredAt.localeCompare(y.answeredAt),
    );
  }
  return result;
}
export function restartLesson(b: Backup): Backup {
  return {
    ...b,
    completions: completionRecords(b),
    progress: {
      ...newProgress(),
      started: true,
      episode: {
        stage: "sorting",
        grouped: false,
        compared: false,
        priority: "speed",
      },
    },
  };
}
export function completeLesson(b: Backup): Backup {
  if (!storyVisited(b.progress)) throw Error("本編を最後まで確認してください");
  const next = {
    ...b,
    progress: {
      ...b.progress,
      completed: true,
      updatedAt: new Date().toISOString(),
    },
  };
  return { ...next, completions: completionRecords(next) };
}

export function beginGeneralization(b: Backup, restart = false): Backup {
  if (b.generalization && !restart) return b;
  return {
    ...b,
    completions: completionRecords(b),
    generalization: newGeneralizationProgress(),
  };
}
export function completeGeneralization(b: Backup): Backup {
  if (!b.generalization || !generalizationFinished(b.generalization))
    throw Error("第3話の結末まで確認してください");
  const next: Backup = {
    ...b,
    completions: completionRecords(b),
    generalization: {
      ...b.generalization,
      completed: true,
      updatedAt: new Date().toISOString(),
    },
  };
  return { ...next, completions: completionRecords(next) };
}

export function beginFairness(b: Backup, restart = false): Backup {
  if (b.fairness && !restart) return b;
  return {
    ...b,
    completions: completionRecords(b),
    fairness: newFairnessProgress(),
  };
}
export function completeFairness(b: Backup): Backup {
  if (!b.fairness || !fairnessFinished(b.fairness))
    throw Error("第4話の結末まで確認してください");
  const next: Backup = {
    ...b,
    completions: completionRecords(b),
    fairness: {
      ...b.fairness,
      completed: true,
      updatedAt: new Date().toISOString(),
    },
  };
  return { ...next, completions: completionRecords(next) };
}
function mergeFairness(a: Backup, b: Backup): Partial<Backup> {
  const result: Partial<Backup> = {};
  if (a.fairness || b.fairness)
    result.fairness = !a.fairness
      ? b.fairness
      : !b.fairness
        ? a.fairness
        : b.fairness.updatedAt > a.fairness.updatedAt
          ? b.fairness
          : a.fairness;
  if (a.fairnessAttempts || b.fairnessAttempts) {
    const attempts = new Map((a.fairnessAttempts ?? []).map((x) => [x.id, x]));
    for (const item of b.fairnessAttempts ?? []) {
      const old = attempts.get(item.id);
      if (
        old &&
        (
          [
            "id",
            "questionId",
            "version",
            "selected",
            "correct",
            "answeredAt",
            "sessionId",
          ] as const
        ).some((key) => old[key] !== item[key])
      )
        throw Error("第4話の同じ履歴IDに異なる内容があるため統合できません。");
      attempts.set(item.id, item);
    }
    result.fairnessAttempts = [...attempts.values()].sort((x, y) =>
      x.answeredAt.localeCompare(y.answeredAt),
    );
  }
  return result;
}

export function beginDeepLearning(b: Backup, restart = false): Backup {
  if (b.deepLearning && !restart) return b;
  return {
    ...b,
    completions: completionRecords(b),
    deepLearning: newDeepLearningProgress(),
  };
}
export function completeDeepLearning(b: Backup): Backup {
  if (!b.deepLearning || !deepLearningFinished(b.deepLearning))
    throw Error("第5話の体験と結末を確認してください");
  const next: Backup = {
    ...b,
    completions: completionRecords(b),
    deepLearning: {
      ...b.deepLearning,
      completed: true,
      updatedAt: new Date().toISOString(),
    },
  };
  return { ...next, completions: completionRecords(next) };
}
function mergeDeepLearning(a: Backup, b: Backup): Partial<Backup> {
  const result: Partial<Backup> = {};
  if (a.deepLearning || b.deepLearning)
    result.deepLearning = !a.deepLearning
      ? b.deepLearning
      : !b.deepLearning
        ? a.deepLearning
        : b.deepLearning.updatedAt > a.deepLearning.updatedAt
          ? b.deepLearning
          : a.deepLearning;
  if (a.deepLearningAttempts || b.deepLearningAttempts) {
    const attempts = new Map(
      (a.deepLearningAttempts ?? []).map((x) => [x.id, x]),
    );
    for (const item of b.deepLearningAttempts ?? []) {
      const old = attempts.get(item.id);
      if (
        old &&
        (
          [
            "id",
            "questionId",
            "version",
            "selected",
            "correct",
            "answeredAt",
            "sessionId",
          ] as const
        ).some((key) => old[key] !== item[key])
      )
        throw Error("第5話の同じ履歴IDに異なる内容があるため統合できません。");
      attempts.set(item.id, item);
    }
    result.deepLearningAttempts = [...attempts.values()].sort((x, y) =>
      x.answeredAt.localeCompare(y.answeredAt),
    );
  }
  return result;
}
