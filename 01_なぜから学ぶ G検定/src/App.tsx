import type { CnnProgress } from "./types";
import { beginCnn, completeCnn } from "./engine/learning";
import { cnnQuestions } from "./data/cnn";
import { CnnEpisode } from "./components/CnnEpisode";
import type { TrainingProgress } from "./types";
import { beginTraining, completeTraining } from "./engine/learning";
import { learn, freshTrainingState } from "./engine/training";
import { trainingQuestions, trainingStages } from "./data/training";
import { TrainingEpisode } from "./components/TrainingEpisode";
import type { DeepLearningProgress } from "./types";
import { beginDeepLearning, completeDeepLearning } from "./engine/learning";
import { DeepLearningEpisode } from "./components/DeepLearningEpisode";
import { deepQuestions } from "./data/deepLearning";
import { useEffect, useRef, useState } from "react";
import type {
  Backup,
  LearningProgress,
  EvaluationProgress,
  GeneralizationProgress,
  FairnessProgress,
} from "./types";
import {
  course,
  lesson,
  scenes,
  prologueScene,
  questions,
  comparisons,
  syllabus,
} from "./data/content";
import {
  emptyBackup,
  beginEvaluation,
  beginGeneralization,
  beginFairness,
  completeFairness,
  completeGeneralization,
  completeEvaluation,
  grade,
  reviewFor,
  validateBackup,
  mergeBackups,
  hasLearningRecord,
  storyVisited,
  restartLesson,
  completeLesson,
  completionRecords,
} from "./engine/learning";
import { loadState, saveState } from "./engine/storage";
import {
  Supervised,
  Unsupervised,
  Reinforcement,
} from "./components/Simulations";
import { KnowledgeMap, Quiz } from "./components/Learning";
import { ShippingStory } from "./components/ShippingStory";
import { EpisodeScene, episodeTitles } from "./components/Episode";
import { ShippingTrial, ShippingPrologue } from "./components/ShippingPrologue";
import { shippingTrial } from "./data/shippingStory";
import { EvaluationEpisode } from "./components/EvaluationEpisode";
import { evaluationQuestions } from "./data/evaluation";
import { BeginnerGuide } from "./components/BeginnerGuide";
import { GeneralizationEpisode } from "./components/GeneralizationEpisode";
import { FairnessEpisode } from "./components/FairnessEpisode";
import { fairnessQuestions } from "./data/fairness";
const nav = [
  ["⌂", "ホーム"],
  ["▤", "コース"],
  ["✎", "演習"],
  ["⌘", "知識マップ"],
  ["◷", "記録"],
];
export default function App() {
  const [snapshot, setSnapshot] = useState<Backup>(() => emptyBackup()),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("記録を読み込み中"),
    [loadError, setLoadError] = useState(false),
    [tab, setTab] = useState(0),
    [inLesson, setInLesson] = useState(false),
    [guideOpen, setGuideOpen] = useState(false),
    [activeLesson, setActiveLesson] = useState<
      "L003" | "L004" | "L005" | "L006" | "L007" | "L008" | "L009"
    >("L003"),
    [origin, setOrigin] = useState(0),
    [online, setOnline] = useState(navigator.onLine),
    [offlineReady, setOfflineReady] = useState(false),
    [pending, setPending] = useState<Backup | null>(null),
    [mode, setMode] = useState("merge"),
    [importMessage, setImportMessage] = useState(""),
    [saving, setSaving] = useState(false);
  const guideReturn = useRef({
    scroll: 0,
    element: null as HTMLElement | null,
  });
  const [guideSection, setGuideSection] = useState<string>();
  function openGuide(
    event?: { currentTarget: EventTarget | null },
    section?: string,
  ) {
    setGuideSection(section);
    guideReturn.current = {
      scroll: window.scrollY,
      element:
        event?.currentTarget instanceof HTMLElement
          ? event.currentTarget
          : (document.activeElement as HTMLElement),
    };
    setGuideOpen(true);
  }
  function closeGuide() {
    setGuideOpen(false);
    requestAnimationFrame(() => {
      window.scrollTo({ top: guideReturn.current.scroll, behavior: "instant" });
      guideReturn.current.element?.focus({ preventScroll: true });
    });
  }
  function guideLesson(id: "L003" | "L004" | "L007" | "L008" | "L009") {
    if (inLesson && activeLesson === id) {
      closeGuide();
      return;
    }
    setGuideOpen(false);
    if (id === "L003") enter();
    else if (id === "L007") enterDeepLearning();
    else if (id === "L008") enterTraining();
    else if (id === "L009") enterCnn();
    else enterEvaluation();
  }
  const ref = useRef(snapshot),
    queue = useRef(Promise.resolve()),
    writeId = useRef(0),
    heading = useRef<HTMLHeadingElement>(null);
  async function load() {
    setLoadError(false);
    try {
      const data = await loadState();
      ref.current = data;
      setSnapshot(data);
      setReady(true);
      setStatus("記録を読み込みました");
    } catch {
      setLoadError(true);
      setStatus("記録を読み込めません。保存を再試行してください。");
    }
  }
  useEffect(() => {
    void load();
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    let disposed = false;
    const check = async () => {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.active && "caches" in window) {
          const keys = await caches.keys();
          if (!disposed)
            setOfflineReady(keys.some((k) => k.startsWith("why-g-")));
        }
      }
    };
    void check();
    const t = setInterval(() => void check(), 3000);
    return () => {
      disposed = true;
      clearInterval(t);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  const totalAttempts =
    snapshot.attempts.length +
    (snapshot.evaluationAttempts?.length ?? 0) +
    (snapshot.fairnessAttempts?.length ?? 0) +
    (snapshot.deepLearningAttempts?.length ?? 0) +
    (snapshot.trainingAttempts?.length ?? 0) +
    (snapshot.cnnAttempts?.length ?? 0);
  const p = snapshot.progress;
  const resumeEvaluation =
    !!snapshot.evaluation &&
    (!hasLearningRecord(snapshot) ||
      snapshot.evaluation.updatedAt > p.updatedAt);
  const resumeGeneralization =
    !!snapshot.generalization &&
    (!hasLearningRecord(snapshot) ||
      snapshot.generalization.updatedAt > p.updatedAt) &&
    (!snapshot.evaluation ||
      snapshot.generalization.updatedAt > snapshot.evaluation.updatedAt);
  const resumeFairness =
    !!snapshot.fairness &&
    (!hasLearningRecord(snapshot) ||
      snapshot.fairness.updatedAt > p.updatedAt) &&
    (!snapshot.evaluation ||
      snapshot.fairness.updatedAt > snapshot.evaluation.updatedAt) &&
    (!snapshot.generalization ||
      snapshot.fairness.updatedAt > snapshot.generalization.updatedAt);
  const resumeDeepLearning =
    !!snapshot.deepLearning &&
    [
      hasLearningRecord(snapshot) ? p : undefined,
      snapshot.evaluation,
      snapshot.generalization,
      snapshot.fairness,
    ].every((old) => !old || snapshot.deepLearning!.updatedAt >= old.updatedAt);
  const resumeTraining =
    !!snapshot.training &&
    [
      hasLearningRecord(snapshot) ? p : undefined,
      snapshot.evaluation,
      snapshot.generalization,
      snapshot.fairness,
      snapshot.deepLearning,
    ].every((old) => !old || snapshot.training!.updatedAt >= old.updatedAt);
  const resumeCnn =
    !!snapshot.cnn &&
    [
      hasLearningRecord(snapshot) ? p : undefined,
      snapshot.evaluation,
      snapshot.generalization,
      snapshot.fairness,
      snapshot.deepLearning,
      snapshot.training,
    ].every((old) => !old || snapshot.cnn!.updatedAt >= old.updatedAt);
  const trainingLock = useRef(false);
  const episodeCount =
    Number(!!p.storySampleAdded) +
    Number(!!p.episode?.grouped) +
    Number(!!p.episode?.compared);
  const isPrologue = p.scene === 0 && p.introStage === "prologue";
  const pastCompletions = completionRecords(snapshot);
  useEffect(() => {
    if (inLesson && activeLesson === "L003") {
      heading.current?.focus({ preventScroll: true });
      window.scrollTo({
        top: isPrologue ? (p.prologueScroll ?? 0) : 0,
        behavior: "instant",
      });
    }
  }, [inLesson, activeLesson, p.scene, p.introStage, p.episode?.stage]);
  useEffect(() => {
    if (guideOpen || !inLesson || activeLesson !== "L003" || !isPrologue)
      return;
    let timer: ReturnType<typeof setTimeout>;
    const savePosition = () => {
      clearTimeout(timer);
      const position = window.scrollY;
      timer = setTimeout(
        () => updateProgress({ prologueScroll: position }),
        180,
      );
    };
    window.addEventListener("scroll", savePosition);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", savePosition);
    };
  }, [inLesson, activeLesson, isPrologue, guideOpen]);
  function commit(next: Backup) {
    if (!ready) return;
    ref.current = next;
    setSnapshot(next);
    setSaving(true);
    setStatus("保存中…");
    const id = ++writeId.current;
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveState(next))
      .then(() => {
        if (id === writeId.current) {
          setStatus("端末に保存済み");
          setSaving(false);
        }
      })
      .catch(() => {
        if (id === writeId.current) {
          setStatus(
            "保存に失敗しました。再試行またはバックアップを保存してください。",
          );
          setSaving(false);
        }
      });
  }
  function updateProgress(change: Partial<LearningProgress>) {
    const current = ref.current;
    commit({
      ...current,
      ...(current.progress.completed
        ? { completions: completionRecords(current) }
        : {}),
      progress: {
        ...current.progress,
        ...change,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function enter(scene?: number) {
    setActiveLesson("L003");
    setOrigin(tab);
    const current = ref.current.progress;
    updateProgress({
      started: true,
      ...(!hasLearningRecord(ref.current)
        ? {
            episode: {
              stage: "sorting",
              grouped: false,
              compared: false,
              priority: "speed",
            } as const,
          }
        : {}),
      ...(scene === undefined
        ? {}
        : { scene, visited: [...new Set([...current.visited, scene])] }),
    });
    setInLesson(true);
  }
  function startOver() {
    setActiveLesson("L003");
    commit(restartLesson(ref.current));
    setOrigin(tab);
    setInLesson(true);
  }
  function enterEvaluation(restart = false) {
    const next = beginEvaluation(ref.current, restart);
    commit({
      ...next,
      completions: completionRecords(next),
      evaluation: { ...next.evaluation!, updatedAt: new Date().toISOString() },
    });
    setOrigin(tab);
    setActiveLesson("L004");
    setInLesson(true);
  }
  function updateEvaluation(change: Partial<EvaluationProgress>) {
    const current = ref.current;
    if (!current.evaluation) return;
    commit({
      ...current,
      completions: completionRecords(current),
      evaluation: {
        ...current.evaluation,
        ...change,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function moveEvaluation(stage: EvaluationProgress["stage"]) {
    const e = ref.current.evaluation!;
    updateEvaluation({ stage, visited: [...new Set([...e.visited, stage])] });
  }
  function answerEvaluation(choice: number) {
    const current = ref.current,
      e = current.evaluation!;
    const a = grade(
      evaluationQuestions[e.questionIndex].id,
      choice,
      e.sessionId,
      evaluationQuestions,
    );
    commit({
      ...current,
      completions: completionRecords(current),
      evaluationAttempts: [...(current.evaluationAttempts ?? []), a],
      evaluation: { ...e, updatedAt: a.answeredAt },
    });
  }
  function finishEvaluation() {
    if (!ref.current.evaluation?.completed)
      commit(completeEvaluation(ref.current));
    setInLesson(false);
    setTab(origin);
  }
  function enterGeneralization(restart = false) {
    const next = beginGeneralization(ref.current, restart);
    commit({
      ...next,
      completions: completionRecords(next),
      generalization: {
        ...next.generalization!,
        updatedAt: new Date().toISOString(),
      },
    });
    setOrigin(tab);
    setActiveLesson("L005");
    setInLesson(true);
  }
  function updateGeneralization(change: Partial<GeneralizationProgress>) {
    const current = ref.current;
    if (!current.generalization) return;
    commit({
      ...current,
      completions: completionRecords(current),
      generalization: {
        ...current.generalization,
        ...change,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function moveGeneralization(stage: GeneralizationProgress["stage"]) {
    updateGeneralization({
      stage,
      visited: [...new Set([...ref.current.generalization!.visited, stage])],
    });
  }
  function finishGeneralization() {
    if (!ref.current.generalization?.completed)
      commit(completeGeneralization(ref.current));
    setInLesson(false);
    setTab(origin);
  }
  function enterFairness(restart = false, quiz = false) {
    const next = beginFairness(ref.current, restart);
    const f = next.fairness!;
    commit({
      ...next,
      completions: completionRecords(next),
      fairness: {
        ...f,
        ...(quiz && f.visited.includes("ending")
          ? {
              stage: "quiz" as const,
              visited: [...new Set([...f.visited, "quiz" as const])],
            }
          : {}),
        updatedAt: new Date().toISOString(),
      },
    });
    setOrigin(tab);
    setActiveLesson("L006");
    setInLesson(true);
  }
  function updateFairness(change: Partial<FairnessProgress>) {
    const current = ref.current;
    if (!current.fairness) return;
    commit({
      ...current,
      completions: completionRecords(current),
      fairness: {
        ...current.fairness,
        ...change,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function moveFairness(stage: FairnessProgress["stage"]) {
    updateFairness({
      stage,
      visited: [...new Set([...ref.current.fairness!.visited, stage])],
    });
  }
  function answerFairness(choice: number) {
    const current = ref.current,
      f = current.fairness!;
    const a = grade(
      fairnessQuestions[f.questionIndex].id,
      choice,
      f.sessionId,
      fairnessQuestions,
    );
    commit({
      ...current,
      completions: completionRecords(current),
      fairnessAttempts: [...(current.fairnessAttempts ?? []), a],
      fairness: { ...f, updatedAt: a.answeredAt },
    });
  }
  function finishFairness() {
    if (!ref.current.fairness?.completed) commit(completeFairness(ref.current));
    setInLesson(false);
    setTab(origin);
  }

  function enterDeepLearning(restart = false, quiz = false) {
    const next = beginDeepLearning(ref.current, restart),
      d = next.deepLearning!;
    commit({
      ...next,
      completions: completionRecords(next),
      deepLearning: {
        ...d,
        ...(quiz && d.visited.includes("ending")
          ? {
              stage: "quiz" as const,
              visited: [...new Set([...d.visited, "quiz" as const])],
            }
          : {}),
        updatedAt: new Date().toISOString(),
      },
    });
    setOrigin(tab);
    setActiveLesson("L007");
    setInLesson(true);
  }
  function updateDeepLearning(change: Partial<DeepLearningProgress>) {
    const b = ref.current;
    if (!b.deepLearning) return;
    commit({
      ...b,
      completions: completionRecords(b),
      deepLearning: {
        ...b.deepLearning,
        ...change,
        ...(change.networkStep === 4 ? { networkSeen: true } : {}),
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function moveDeepLearning(stage: DeepLearningProgress["stage"]) {
    updateDeepLearning({
      stage,
      visited: [...new Set([...ref.current.deepLearning!.visited, stage])],
    });
  }
  function answerDeepLearning(choice: number) {
    const b = ref.current,
      d = b.deepLearning!;
    const a = grade(
      deepQuestions[d.questionIndex].id,
      choice,
      d.sessionId,
      deepQuestions,
    );
    commit({
      ...b,
      completions: completionRecords(b),
      deepLearningAttempts: [...(b.deepLearningAttempts ?? []), a],
      deepLearning: { ...d, updatedAt: a.answeredAt },
    });
  }
  function finishDeepLearning() {
    if (!ref.current.deepLearning?.completed)
      commit(completeDeepLearning(ref.current));
    setInLesson(false);
    setTab(origin);
  }

  function enterTraining(restart = false, quiz = false) {
    const next = beginTraining(ref.current, restart),
      t = next.training!;
    commit({
      ...next,
      completions: completionRecords(next),
      training: {
        ...t,
        ...(quiz && t.visited.includes("ending")
          ? {
              stage: "quiz" as const,
              visited: [...new Set([...t.visited, "quiz" as const])],
            }
          : {}),
        updatedAt: new Date().toISOString(),
      },
    });
    setOrigin(tab);
    setActiveLesson("L008");
    setInLesson(true);
  }
  function updateTraining(change: Partial<TrainingProgress>) {
    const b = ref.current;
    if (!b.training) return;
    commit({
      ...b,
      completions: completionRecords(b),
      training: {
        ...b.training,
        ...change,
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function moveTraining(stage: TrainingProgress["stage"]) {
    updateTraining({
      stage,
      visited: [...new Set([...ref.current.training!.visited, stage])],
    });
  }
  function answerTraining(choice: number) {
    const b = ref.current,
      t = b.training!,
      a = grade(
        trainingQuestions[t.questionIndex].id,
        choice,
        t.sessionId,
        trainingQuestions,
      );
    commit({
      ...b,
      completions: completionRecords(b),
      trainingAttempts: [...(b.trainingAttempts ?? []), a],
      training: { ...t, updatedAt: a.answeredAt },
    });
  }
  function finishTraining() {
    if (!ref.current.training?.completed) commit(completeTraining(ref.current));
    setInLesson(false);
    setTab(origin);
  }
  function trainUpdates(count: number) {
    if (trainingLock.current || saving) return;
    trainingLock.current = true;
    try {
      updateTraining(learn(ref.current.training!, count));
    } finally {
      void queue.current.finally(() => {
        trainingLock.current = false;
      });
    }
  }
  function resetTraining() {
    if (trainingLock.current || saving) return;
    updateTraining({
      ...freshTrainingState(),
      trainedOnce: false,
      evaluated: false,
      completed: false,
      stage: "practice",
      visited: trainingStages.slice(0, 5),
    });
  }

  function enterCnn(restart = false, quiz = false) {
    const next = beginCnn(ref.current, restart),
      c = next.cnn!;
    commit({
      ...next,
      completions: completionRecords(next),
      cnn: {
        ...c,
        ...(quiz && c.visited.includes("ending")
          ? {
              stage: "quiz" as const,
              visited: [...new Set([...c.visited, "quiz" as const])],
            }
          : {}),
        updatedAt: new Date().toISOString(),
      },
    });
    setOrigin(tab);
    setActiveLesson("L009");
    setInLesson(true);
  }
  function updateCnn(change: Partial<CnnProgress>) {
    const b = ref.current;
    if (!b.cnn) return;
    commit({
      ...b,
      completions: completionRecords(b),
      cnn: {
        ...b.cnn,
        ...change,
        ...(change.poolStage === 3 ? { poolDone: true } : {}),
        updatedAt: new Date().toISOString(),
      },
    });
  }
  function moveCnn(stage: CnnProgress["stage"]) {
    updateCnn({
      stage,
      visited: [...new Set([...ref.current.cnn!.visited, stage])],
    });
  }
  function answerCnn(choice: number) {
    const b = ref.current,
      c = b.cnn!,
      a = grade(
        cnnQuestions[c.questionIndex].id,
        choice,
        c.sessionId,
        cnnQuestions,
      );
    commit({
      ...b,
      completions: completionRecords(b),
      cnnAttempts: [...(b.cnnAttempts ?? []), a],
      cnn: { ...c, updatedAt: a.answeredAt },
    });
  }
  function finishCnn() {
    if (!ref.current.cnn?.completed) commit(completeCnn(ref.current));
    setInLesson(false);
    setTab(origin);
  }

  function move(scene: number) {
    updateProgress({
      scene,
      visited: [...new Set([...ref.current.progress.visited, scene])],
    });
  }
  function answer(choice: number) {
    const current = ref.current,
      a = grade(
        questions[current.progress.questionIndex].id,
        choice,
        current.progress.sessionId,
      ),
      review = reviewFor(a);
    commit({
      ...current,
      attempts: [...current.attempts, a],
      reviews: [...current.reviews.filter((r) => r.id !== review.id), review],
      progress: { ...current.progress, updatedAt: a.answeredAt },
    });
  }
  function manualReviews() {
    const current = ref.current,
      now = new Date().toISOString();
    commit({
      ...current,
      reviews: questions.map((q) => ({
        id: `review-${q.id}`,
        questionId: q.id,
        dueAt: now,
        reason: "manual",
        updatedAt: now,
      })),
    });
  }
  function exportBackup() {
    const data = { ...ref.current, exportedAt: new Date().toISOString() },
      blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `why-learn-g-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function readBackup(file?: File) {
    setPending(null);
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error("10MB以下のバックアップを指定してください");
      const next = validateBackup(JSON.parse(await file.text()));
      setPending(next);
      setImportMessage(
        `${next.attempts.length}件の回答履歴、場面${next.progress.scene + 1}を読み込みました。まだ適用していません。`,
      );
    } catch (e) {
      setImportMessage(
        e instanceof Error ? e.message : "読み込みに失敗しました",
      );
    }
  }
  function applyBackup() {
    if (!pending) return;
    try {
      const next =
        mode === "merge" ? mergeBackups(ref.current, pending) : pending;
      if (
        mode === "replace" &&
        !window.confirm(
          "現在の端末の記録を、このバックアップで置き換えますか？",
        )
      )
        return;
      commit(next);
      setPending(null);
      setImportMessage(
        "復元内容を適用しました。上部の保存状態を確認し、ホームから再開できます。",
      );
    } catch (e) {
      setImportMessage((e as Error).message);
    }
  }
  const sessionAttempts = snapshot.attempts.filter(
      (a) => a.sessionId === p.sessionId,
    ),
    answered = questions.filter((q) =>
      sessionAttempts.some((a) => a.questionId === q.id),
    ).length,
    correct = questions.filter(
      (q) =>
        sessionAttempts.filter((a) => a.questionId === q.id).at(-1)?.correct,
    ).length;
  const due = snapshot.reviews.filter((r) => Date.parse(r.dueAt) <= Date.now());
  const startQuiz = () => {
    setActiveLesson("L003");
    const current = ref.current;
    commit({
      ...current,
      completions: completionRecords(current),
      progress: {
        ...current.progress,
        scene: 7,
        questionIndex: 0,
        sessionId: crypto.randomUUID(),
        completed: false,
        visited: [...new Set([...current.progress.visited, 7])],
        updatedAt: new Date().toISOString(),
      },
    });
    setOrigin(tab);
    setInLesson(true);
  };
  function comparison() {
    return (
      <>
        <table className="comparison-table">
          <caption className="sr-only">3方式の比較</caption>
          <thead>
            <tr>
              <th scope="col">比べる観点</th>
              {comparisons.map((c) => (
                <th scope="col" key={c.name}>
                  <h3>{c.name}</h3>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["必要なデータ", "data"],
                ["正解ラベル", "label"],
                ["仕組み", "mechanism"],
                ["代表的な用途", "use"],
                ["使い分けの決め手", "key"],
              ] as const
            ).map(([name, key]) => (
              <tr key={key}>
                <th scope="row">{name}</th>
                {comparisons.map((c) => (
                  <td key={c.name}>{c[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="comparison comparison-cards">
          {comparisons.map((c, i) => (
            <article className="mini-card" key={c.name}>
              <span className="eyebrow">0{i + 1}</span>
              <h3>{c.name}</h3>
              <dl>
                <dt>必要なデータ</dt>
                <dd>{c.data}</dd>
                <dt>正解ラベル</dt>
                <dd>{c.label}</dd>
                <dt>仕組み</dt>
                <dd>{c.mechanism}</dd>
                <dt>用途</dt>
                <dd>{c.use}</dd>
                <dt>判断の決め手</dt>
                <dd>{c.key}</dd>
              </dl>
            </article>
          ))}
        </div>
      </>
    );
  }
  const sceneBody = () => {
    switch (p.scene) {
      case 0:
        if (p.episode && p.episode.stage !== "sorting")
          return (
            <EpisodeScene
              progress={p}
              speed={snapshot.settings.speed}
              onChange={(episode) => updateProgress({ episode })}
              onFinish={() => {
                if (!ref.current.progress.completed)
                  commit(completeLesson(ref.current));
                setInLesson(false);
                setTab(origin);
              }}
              onQuiz={() => move(7)}
              onReference={move}
              onNext={() => enterEvaluation()}
            />
          );
        if (isPrologue)
          return (
            <ShippingPrologue
              onContinue={() => updateProgress({ introStage: "ai-trial" })}
            />
          );
        if (p.introStage === "ai-trial")
          return (
            <ShippingTrial
              onContinue={() => updateProgress({ introStage: "sorting" })}
            />
          );
        return (
          <ShippingStory
            sampleAdded={!!p.storySampleAdded}
            onAdd={() => updateProgress({ storySampleAdded: true })}
            onContinue={() =>
              p.episode
                ? updateProgress({
                    episode: { ...p.episode, stage: "records" },
                  })
                : move(1)
            }
            continueLabel={p.episode ? "搬送の様子を見る" : undefined}
            details={
              p.episode ? (
                <details className="episode-details">
                  <summary>仕組みを詳しく見る</summary>
                  <Supervised withShippingSample />
                  <button onClick={() => move(1)}>詳しい分類教材へ</button>
                </details>
              ) : undefined
            }
          />
        );
      case 1:
        return <Supervised withShippingSample={!!p.storySampleAdded} />;
      case 2:
        return <Unsupervised speed={snapshot.settings.speed} />;
      case 3:
        return <Reinforcement speed={snapshot.settings.speed} />;
      case 4:
        return (
          <>
            {comparison()}
            <p className="notice">
              分類・回帰は教師あり学習の代表的な課題。クラスタリングは教師なし学習の代表例です。すべての学習がこの3つだけに収まるわけではありません。
            </p>
          </>
        );
      case 5:
        return (
          <>
            <p>
              製品の外観データが届きました。目的と検査結果の有無を切り替えて、方法を選んでください。
            </p>
            <label className="option">
              <input
                type="checkbox"
                checked={p.challengeLabelled}
                onChange={(e) =>
                  updateProgress({
                    challengeLabelled: e.target.checked,
                    challenge: null,
                  })
                }
              />
              検査結果あり・新しい製品の不良を予測したい
            </label>
            <div className="notice">
              {p.challengeLabelled
                ? "正解つきの過去データから、良品／不良を判定する。"
                : "正解ラベルなしで、似た外観の製品のまとまりを探したい。"}
            </div>
            <div className="controls">
              {comparisons.map((c, i) => (
                <button
                  className={p.challenge === i ? "active" : ""}
                  key={i}
                  onClick={() => updateProgress({ challenge: i })}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {p.challenge !== null && (
              <div className="feedback" role="status">
                {p.challenge === (p.challengeLabelled ? 0 : 1)
                  ? "その判断で考えられます。"
                  : "手がかりをもう一度確認しましょう。"}{" "}
                {p.challengeLabelled
                  ? "正解の検査結果を使って、新しい入力のカテゴリを予測するので教師あり分類が候補です。"
                  : "正解を予測するのではなく、特徴のまとまりを発見するので教師なし学習が候補です。"}
                <p>
                  配送ロボットの行動を報酬から改善するなら、強化学習が候補です。
                </p>
              </div>
            )}
          </>
        );
      case 6:
        return (
          <>
            <KnowledgeMap />
            <div className="optional-exam">
              <p>
                ここまでの体験を、試験形式でも確かめられます。演習はあとからでも取り組めます。
              </p>
              <button onClick={() => move(7)}>試験問題で確認する</button>
            </div>
          </>
        );
      case 7:
        return (
          <Quiz
            key={p.sessionId}
            index={p.questionIndex}
            attempts={snapshot.attempts}
            sessionId={p.sessionId}
            onAnswer={answer}
            onIndex={(questionIndex) => updateProgress({ questionIndex })}
            busy={saving}
          />
        );
      case 8:
        return (
          <>
            <div className="summary-score">
              {answered === 0 ? (
                <p>
                  ここまで、物語と体験をふり返りました。試験問題はあとからでも取り組めます。
                </p>
              ) : (
                <>
                  <strong>
                    {correct}
                    <span> / {answered}</span>
                  </strong>
                  <p>今回の正解数 / 回答済み問題数（全12問）</p>
                </>
              )}
            </div>
            {comparison()}
            <p>
              正答率だけでは習得の完了は判断できません。「どんな手がかりを使うか」を自分の言葉で説明し、未知の事例でも使い分けてみましょう。
            </p>
            <div className="controls">
              <button onClick={manualReviews}>12問を復習候補に登録</button>
              <button onClick={() => move(7)}>試験問題で確認する</button>
            </div>
            <div className="evaluation-entry">
              <h3>第2話：モデル評価</h3>
              <button onClick={() => enterEvaluation()}>第2話を開く</button>
            </div>
            {p.completed ? (
              <p className="notice">
                このレッスンを最後まで学習した記録があります。習得を保証する評価ではありません。
              </p>
            ) : (
              <>
                <button
                  className="primary"
                  disabled={!storyVisited(p)}
                  onClick={() => commit(completeLesson(ref.current))}
                >
                  レッスンを最後まで学習したと記録
                </button>
                {!storyVisited(p) && (
                  <p className="muted">
                    演習以外の8場面を閲覧すると記録できます。問題への回答は任意です。
                  </p>
                )}
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };
  return (
    <div className={inLesson || guideOpen ? "app learning" : "app"}>
      {!inLesson && !guideOpen && (
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setTab(0);
            }}
          >
            <span className="brand-mark">
              w<span>?</span>
            </span>
            <strong>
              WHY LEARN G<small>なぜから学ぶ G検定</small>
            </strong>
          </a>
          <p className="sidebar-label">LEARNING SPACE</p>
          <nav aria-label="メインナビゲーション">
            {nav.map(([icon, name], i) => (
              <button
                aria-current={tab === i ? "page" : undefined}
                className={tab === i ? "active" : ""}
                key={name}
                onClick={() => setTab(i)}
              >
                <span aria-hidden="true">{icon}</span>
                {name}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span className="tag">BEGINNER GUIDE</span>
            <p>
              小さな「なぜ」が、
              <br />
              理解のはじまり。
            </p>
            <small>v0.2.2 · この端末に保存</small>
          </div>
        </aside>
      )}
      <main>
        <header className="topbar">
          {guideOpen ? (
            <button onClick={closeGuide}>← 第0章を閉じて戻る</button>
          ) : inLesson ? (
            <button
              onClick={() => {
                setInLesson(false);
                setTab(origin);
              }}
            >
              ← 戻る・途中終了
            </button>
          ) : (
            <span>
              なぜから学ぶ G検定 <small>/ 学びの研究所</small>
            </span>
          )}
          <span className="connection">
            <i className={online ? "" : "offline"} />
            {online ? "オンライン" : "オフライン"}
          </span>
        </header>
        <div className="savebar">
          <span role="status">{status}</span>
          {status.includes("失敗") && (
            <button onClick={() => commit(ref.current)}>保存を再試行</button>
          )}
          <span>
            {offlineReady
              ? "オフライン教材：準備済み"
              : "オフライン教材：初回取得中（本番ビルド時）"}
          </span>
        </div>
        {guideOpen && (
          <BeginnerGuide onLesson={guideLesson} initialSection={guideSection} />
        )}
        <div hidden={guideOpen}>
          {!ready ? (
            <section className="card">
              <h1>{loadError ? "記録を確認できません" : "学びの準備中…"}</h1>
              {loadError && (
                <button onClick={() => void load()}>読み込みを再試行</button>
              )}
            </section>
          ) : inLesson && activeLesson === "L009" && snapshot.cnn ? (
            <CnnEpisode
              progress={snapshot.cnn}
              attempts={snapshot.cnnAttempts ?? []}
              onChange={updateCnn}
              onMove={moveCnn}
              onAnswer={answerCnn}
              onFinish={finishCnn}
              onGuide={(e) => openGuide(e, "guide-dl")}
              busy={saving}
              suspended={guideOpen}
            />
          ) : inLesson && activeLesson === "L008" && snapshot.training ? (
            <TrainingEpisode
              onNext={() => enterCnn()}
              progress={snapshot.training}
              attempts={snapshot.trainingAttempts ?? []}
              onChange={updateTraining}
              onMove={moveTraining}
              onLearn={trainUpdates}
              onReset={resetTraining}
              onAnswer={answerTraining}
              onFinish={finishTraining}
              onGuide={(e) => openGuide(e, "guide-dl")}
              busy={saving}
            />
          ) : inLesson && activeLesson === "L007" && snapshot.deepLearning ? (
            <DeepLearningEpisode
              onNext={() => enterTraining()}
              progress={snapshot.deepLearning}
              attempts={snapshot.deepLearningAttempts ?? []}
              onChange={updateDeepLearning}
              onMove={moveDeepLearning}
              onAnswer={answerDeepLearning}
              onFinish={finishDeepLearning}
              onGuide={(e) => openGuide(e, "guide-dl")}
              busy={saving}
              suspended={guideOpen}
            />
          ) : inLesson && activeLesson === "L006" && snapshot.fairness ? (
            <FairnessEpisode
              progress={snapshot.fairness}
              attempts={snapshot.fairnessAttempts ?? []}
              onMove={moveFairness}
              onNext={() => enterDeepLearning()}
              onAdjust={() => updateFairness({ lightingAdjusted: true })}
              onIndex={(questionIndex) => updateFairness({ questionIndex })}
              onAnswer={answerFairness}
              onFinish={finishFairness}
              onGuide={(event) => openGuide(event, "guide-exam")}
              busy={saving}
            />
          ) : inLesson && activeLesson === "L005" && snapshot.generalization ? (
            <GeneralizationEpisode
              progress={snapshot.generalization}
              onMove={moveGeneralization}
              onPrediction={(prediction) =>
                updateGeneralization({ prediction })
              }
              onFinish={finishGeneralization}
              onNext={() => enterFairness()}
              onGuide={openGuide}
            />
          ) : inLesson && activeLesson === "L004" && snapshot.evaluation ? (
            <EvaluationEpisode
              progress={snapshot.evaluation}
              attempts={snapshot.evaluationAttempts ?? []}
              onMove={moveEvaluation}
              onIndex={(questionIndex) => updateEvaluation({ questionIndex })}
              onAnswer={answerEvaluation}
              onFinish={finishEvaluation}
              onNext={() => enterGeneralization()}
              busy={saving}
              onGuide={openGuide}
            />
          ) : inLesson ? (
            <div
              className={`lesson-wrap ${p.scene === 0 ? "story-intro" : ""}`}
            >
              <button className="guide-link" onClick={openGuide}>
                第0章で用語を確認
              </button>
              {p.scene !== 0 && p.episode && (
                <button className="episode-return" onClick={() => move(0)}>
                  出荷の物語に戻る
                </button>
              )}
              {p.scene !== 0 && (
                <div className="lesson-meta">
                  <span className="eyebrow">
                    LESSON 003 / {scenes[p.scene].eyebrow}
                  </span>
                  <label>
                    再生速度
                    <select
                      value={snapshot.settings.speed}
                      onChange={(e) =>
                        commit({
                          ...ref.current,
                          settings: { id: "settings", speed: +e.target.value },
                        })
                      }
                    >
                      <option value="0.5">0.5倍</option>
                      <option value="1">1倍</option>
                      <option value="2">2倍</option>
                    </select>
                  </label>
                </div>
              )}
              {p.scene !== 0 && (
                <div className="scene-progress" aria-label="レッスンの場面">
                  {scenes.map((s, i) => (
                    <button
                      aria-label={`場面${i + 1} ${s.title}`}
                      aria-current={p.scene === i ? "step" : undefined}
                      className={
                        p.scene === i
                          ? "active"
                          : p.visited.includes(i)
                            ? "visited"
                            : ""
                      }
                      key={s.id}
                      onClick={() => move(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <h1 ref={heading} tabIndex={-1}>
                {isPrologue
                  ? prologueScene.prompt
                  : p.scene === 0 && p.introStage === "ai-trial"
                    ? shippingTrial.title
                    : p.scene === 0 &&
                        p.episode &&
                        p.episode.stage !== "sorting"
                      ? episodeTitles[p.episode.stage]
                      : scenes[p.scene].prompt}
              </h1>
              <section className="card scene-body">{sceneBody()}</section>
              {p.scene !== 0 && (
                <footer className="lesson-footer">
                  <button
                    disabled={p.scene === 0}
                    onClick={() =>
                      move(
                        p.scene === 8 && !p.visited.includes(7)
                          ? 6
                          : p.scene - 1,
                      )
                    }
                  >
                    ← 前へ
                  </button>
                  <span>
                    {String(p.scene + 1).padStart(2, "0")} / 09 ·{" "}
                    {scenes[p.scene].title}
                  </span>
                  {p.scene < 8 ? (
                    <button
                      className="primary"
                      onClick={() => move(p.scene === 6 ? 8 : p.scene + 1)}
                    >
                      {p.scene === 6 ? "まとめへ →" : "次へ →"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setInLesson(false);
                        setTab(origin);
                      }}
                    >
                      学習を閉じる
                    </button>
                  )}
                </footer>
              )}
            </div>
          ) : (
            <div className="content">
              <div className="page-heading">
                <span className="eyebrow">
                  {
                    [
                      "YOUR LEARNING JOURNEY",
                      "COURSE LIBRARY",
                      "PRACTICE ROOM",
                      "KNOWLEDGE CONNECTIONS",
                      "LEARNING RECORD",
                    ][tab]
                  }
                </span>
                <h1>
                  {
                    [
                      "「なぜ？」から、はじめよう。",
                      "コースを探す",
                      "理由から考える演習",
                      "理解を、つなげよう。",
                      "学びの足あと",
                    ][tab]
                  }
                </h1>
                <p>
                  {
                    [
                      "操作して、気づいて、自分の言葉に。今日も理解をひとつずつ。",
                      "まずは機械学習の3つの学び方を体験しましょう。",
                      "答えを選んだら、判断の決め手を確認しましょう。",
                      "用語を覚える、その先へ。概念どうしの関係をたどる。",
                      "このブラウザに保存した記録と、次の復習候補を確認できます。",
                    ][tab]
                  }
                </p>
              </div>
              {tab === 0 && (
                <>
                  <section className="hero">
                    <div>
                      <span className="hero-label">
                        BEGINNER GUIDE <span>第0章から</span>
                      </span>
                      <p className="lesson-number">
                        {resumeCnn
                          ? "再開する教材：第7話 · 画像とフィルタ"
                          : resumeTraining
                            ? "再開する教材：第6話 · 間違いから学ぶ"
                            : resumeDeepLearning
                              ? "再開する教材：第5話 · 写真と層の仕組み"
                              : resumeFairness
                                ? "再開する教材：第4話 · 条件の違いと公平性"
                                : resumeGeneralization
                                  ? "再開する教材：第3話 · どの箱で確かめるか"
                                  : resumeEvaluation
                                    ? "再開する教材：第2話 · モデル評価"
                                    : hasLearningRecord(snapshot)
                                      ? "再開する教材：第1話 · AIの3つの学び方"
                                      : "AIの入り口 · 工場と動物保護施設で体験"}
                      </p>
                      <h2>
                        まずは、
                        <br />
                        AIの全体像から。
                      </h2>
                      <p>
                        G検定って何を学ぶ試験？
                        AI・機械学習・ディープラーニングの違いから見てみましょう
                      </p>
                      <div className="hero-bottom">
                        <button
                          className="cream"
                          onClick={(event) => {
                            if (resumeCnn) enterCnn();
                            else if (resumeTraining) enterTraining();
                            else if (resumeDeepLearning) enterDeepLearning();
                            else if (resumeFairness) enterFairness();
                            else if (resumeGeneralization)
                              enterGeneralization();
                            else if (resumeEvaluation) enterEvaluation();
                            else if (hasLearningRecord(snapshot)) enter();
                            else openGuide(event);
                          }}
                        >
                          {hasLearningRecord(snapshot) ||
                          snapshot.evaluation ||
                          snapshot.generalization ||
                          snapshot.fairness ||
                          snapshot.deepLearning ||
                          snapshot.training ||
                          snapshot.cnn
                            ? "続きから学ぶ"
                            : "3分で全体像を見る"}{" "}
                          <span>↗</span>
                        </button>
                        <span>全体像 → 気になるところ → 物語で体験</span>
                        <button className="hero-revisit" onClick={openGuide}>
                          第0章を見る
                        </button>
                        {(hasLearningRecord(snapshot) ||
                          snapshot.evaluation ||
                          snapshot.generalization ||
                          snapshot.fairness ||
                          snapshot.deepLearning ||
                          snapshot.training ||
                          snapshot.cnn) && (
                          <button
                            className="hero-revisit"
                            onClick={() =>
                              resumeCnn
                                ? enterCnn(true)
                                : resumeTraining
                                  ? enterTraining(true)
                                  : resumeDeepLearning
                                    ? enterDeepLearning(true)
                                    : resumeFairness
                                      ? enterFairness(true)
                                      : resumeGeneralization
                                        ? enterGeneralization(true)
                                        : resumeEvaluation
                                          ? enterEvaluation(true)
                                          : startOver()
                            }
                          >
                            最初から学ぶ
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="hero-art guide-home-art" aria-hidden="true">
                      <img
                        src={`${import.meta.env.BASE_URL}illustrations/ml-inspected-samples.png`}
                        alt=""
                        width="1536"
                        height="1024"
                      />
                    </div>
                  </section>
                  <div className="stats-row">
                    <article>
                      <span>
                        {p.episode ? "体験した学び方" : "学習の進み具合"}
                      </span>
                      <strong>
                        {p.episode ? episodeCount : p.visited.length}
                        <small>{p.episode ? " / 3 方式" : " / 9 場面"}</small>
                      </strong>
                      <progress
                        value={p.episode ? episodeCount : p.visited.length}
                        max={p.episode ? 3 : 9}
                      />
                    </article>
                    <article>
                      <span>問題に向き合った回数</span>
                      <strong>
                        {totalAttempts}
                        <small> 回</small>
                      </strong>
                      <p>解き直しも履歴に残ります</p>
                    </article>
                    <article>
                      <span>今日までの復習候補</span>
                      <strong>
                        {due.length}
                        <small> 問</small>
                      </strong>
                      <button className="text-button" onClick={() => setTab(4)}>
                        記録を見る ↗
                      </button>
                    </article>
                  </div>
                  <div className="section-heading">
                    <h2>今日の学び方</h2>
                    <span className="muted">小さく試して、深く理解する</span>
                  </div>
                  <div className="three-col">
                    {[
                      [
                        "01",
                        "体験する",
                        "出荷現場の物語から、AIの学び方にふれる。",
                        0,
                      ],
                      [
                        "02",
                        "つなげる",
                        "知識マップで、概念の関係をたどる。",
                        6,
                      ],
                      [
                        "03",
                        "確かめる",
                        "事例を読み、使い分けの理由を考える。",
                        7,
                      ],
                    ].map(([n, title, desc, scene]) => (
                      <button
                        className="activity"
                        key={n}
                        onClick={() => enter(+scene)}
                      >
                        <span className="activity-number">{n}</span>
                        <h3>
                          {title}
                          <span>↗</span>
                        </h3>
                        <p>{desc}</p>
                      </button>
                    ))}
                  </div>
                  <div className="note-strip">
                    <span>✦</span>
                    <p>
                      <strong>暗記の前に、ひとつの疑問を。</strong>
                      <br />
                      「この方法は、何を手がかりに学ぶんだろう？」
                    </p>
                    <span className="eyebrow">THINK FIRST</span>
                  </div>
                </>
              )}
              {tab === 1 && (
                <>
                  <section className="card">
                    <span className="tag">推奨の入口 · 第0章</span>
                    <h2>G検定とAIの全体像</h2>
                    <p>
                      概要を知り、気になる項目を深掘りしてから、工場で体験します。第0章を読まなくても各話を始められます。
                    </p>
                    <button onClick={openGuide}>第0章を見る</button>
                  </section>
                  <h2 className="course-group">機械学習の基礎編 · 工場の4話</h2>
                  <section className="card">
                    <span className="tag">基礎編 · 第1話</span>
                    <h2>{course.title}</h2>
                    <h3>L003 {lesson.title}</h3>
                    <p>教師あり学習 / 教師なし学習 / 強化学習</p>
                    <p>
                      {p.completed
                        ? "最後まで学習した記録あり"
                        : p.episode && p.scene === 0
                          ? `再開位置：${p.episode.stage === "sorting" ? (isPrologue ? "プロローグ" : p.introStage === "ai-trial" ? "AIを試す" : "箱の仕分け") : episodeTitles[p.episode.stage]}`
                          : `再開位置：場面 ${p.scene + 1} ${scenes[p.scene].title}`}
                    </p>
                    <button className="primary" onClick={() => enter()}>
                      レッスンを開く →
                    </button>
                  </section>
                  <section
                    className="card evaluation-course"
                    data-lesson="L004"
                  >
                    <span className="tag">第2話 · L004 モデル評価</span>
                    <h2>正解率99％なのに、不良品を見逃した</h2>
                    <p>
                      同じ100箱を2つの設定で確かめ、何を間違えたかを見比べます。第1話を読んでいなくても始められます。
                    </p>
                    <p>
                      {snapshot.evaluation?.completed
                        ? "最後まで学習した記録あり"
                        : snapshot.evaluation
                          ? "途中の場面から再開できます。"
                          : "演習は最後に選べます。"}
                    </p>
                    <div className="controls">
                      <button
                        className="primary"
                        onClick={() => enterEvaluation()}
                      >
                        {snapshot.evaluation ? "続きから学ぶ" : "第2話を始める"}
                      </button>
                      {snapshot.evaluation && (
                        <button onClick={() => enterEvaluation(true)}>
                          最初から学ぶ
                        </button>
                      )}
                    </div>
                  </section>
                  <section
                    className="card generalization-course"
                    data-lesson="L005"
                  >
                    <span className="tag">第3話 · L005 どの箱で確かめるか</span>
                    <h2>練習では満点。新しい箱では、なぜ間違えた？</h2>
                    <p>
                      練習で判定を直してから、初めて見る箱でも確かめます。第2話の「何を数えるか」に続き、今回は「どの箱で確かめるか」を体験します。
                    </p>
                    <p>
                      {snapshot.generalization?.completed
                        ? "最後まで学習した記録あり"
                        : snapshot.generalization
                          ? "途中の場面から再開できます。"
                          : "予想は任意。答えなくても最後まで進めます。"}
                    </p>
                    <div className="controls">
                      <button
                        className="primary"
                        onClick={() => enterGeneralization()}
                      >
                        {snapshot.generalization
                          ? "続きから学ぶ"
                          : "第3話を始める"}
                      </button>
                      {snapshot.generalization && (
                        <button onClick={() => enterGeneralization(true)}>
                          最初から学ぶ
                        </button>
                      )}
                    </div>
                  </section>
                  <section className="card fairness-course" data-lesson="L006">
                    <span className="tag">第4話 · L006</span>
                    <h2>同じ箱なのに、場所が変わるとAIが間違える？</h2>
                    <p>
                      別の検査ラインで同じAIを試し、照明を変えて結果を見比べます。使う条件と、人に関わる公平性を考える物語です。
                    </p>
                    <p>
                      {snapshot.fairness?.completed
                        ? "最後まで学習した記録あり"
                        : snapshot.fairness
                          ? "途中の場面から再開できます。"
                          : "専門用語は体験のあと。4問の演習は任意です。"}
                    </p>
                    <div className="controls">
                      <button
                        className="primary"
                        onClick={() => enterFairness()}
                      >
                        {snapshot.fairness ? "続きから学ぶ" : "第4話を始める"}
                      </button>
                      {snapshot.fairness && (
                        <button onClick={() => enterFairness(true)}>
                          最初から学ぶ
                        </button>
                      )}
                    </div>
                  </section>

                  <h2 className="course-group">
                    ディープラーニング編 · 写真から広がる学び
                  </h2>
                  <section className="card deep-course" data-lesson="L007">
                    <span className="tag">第5話 · L007</span>
                    <h2>AIはどうやって猫と犬を見分けるの？</h2>
                    <p>
                      動物保護施設で写真整理を手伝い、画素を拡大したり、層の流れを動かしたりして仕組みをつかみます。専門知識は不要。演習は最後に選べます。
                    </p>
                    <p>
                      {snapshot.deepLearning?.completed
                        ? "最後まで学習した記録あり"
                        : snapshot.deepLearning
                          ? "途中の場面と操作状態から再開できます。"
                          : "第0章や工場編を読まずに始めても大丈夫です。"}
                    </p>
                    <div className="controls">
                      <button
                        className="primary"
                        onClick={() => enterDeepLearning()}
                      >
                        {snapshot.deepLearning
                          ? "続きから学ぶ"
                          : "第5話を始める"}
                      </button>
                      {snapshot.deepLearning && (
                        <button onClick={() => enterDeepLearning(true)}>
                          最初から学ぶ
                        </button>
                      )}
                    </div>
                  </section>
                  <section className="card training-course" data-lesson="L008">
                    <span className="tag">第6話 · L008</span>
                    <h2>AIはどうやって間違いから学ぶの？</h2>
                    <p>
                      同じ施設で、予測と正解のずれを調べ、小さなネットワークを実際に学習させます。数式は任意。演習は最後に選べます。
                    </p>
                    <p>
                      {snapshot.training?.completed
                        ? "最後まで学習した記録あり"
                        : snapshot.training
                          ? "途中の場面と操作状態から再開できます。"
                          : "第0章や工場編を読まずに始めても大丈夫です。"}
                    </p>
                    <div className="controls">
                      <button
                        className="primary"
                        onClick={() => enterTraining()}
                      >
                        {snapshot.training ? "続きから学ぶ" : "第6話を始める"}
                      </button>
                      {snapshot.training && (
                        <button onClick={() => enterTraining(true)}>
                          最初から学ぶ
                        </button>
                      )}
                    </div>
                  </section>
                  <section className="card cnn-course" data-lesson="L009">
                    <span className="tag">第7話 · L009</span>
                    <h2>AIは写真のどこを見ているの？</h2>
                    <p>
                      同じ施設で、16×16の画像に小さなフィルタを動かし、輪郭や模様を計算する仕組みを体験します。演習は最後に選べます。
                    </p>
                    <p>
                      {snapshot.cnn?.completed
                        ? "最後まで学習した記録あり"
                        : snapshot.cnn
                          ? "途中の場面と操作状態から再開できます。"
                          : "第0章や工場編を読まずに始めても大丈夫です。"}
                    </p>
                    <div className="controls">
                      <button className="primary" onClick={() => enterCnn()}>
                        {snapshot.cnn ? "続きから学ぶ" : "第7話を始める"}
                      </button>
                      {snapshot.cnn && (
                        <button onClick={() => enterCnn(true)}>
                          最初から学ぶ
                        </button>
                      )}
                    </div>
                  </section>
                </>
              )}
              {tab === 2 && (
                <>
                  <section className="card">
                    <span className="tag">L003 / オリジナル12問</span>
                    <h2>学習方式を使い分けよう</h2>
                    <p>
                      理由理解・比較判断・事例応用の12問。各選択肢に解説を用意しました。新しい演習を始めても過去の回答履歴は残ります。
                    </p>
                    <div className="controls">
                      <button className="primary" onClick={startQuiz}>
                        新しい演習を始める
                      </button>
                      <button onClick={() => enter(7)}>
                        現在の演習を続ける
                      </button>
                    </div>
                    <p>
                      今回の回答：{answered} / 12問 · 正解 {correct}問
                    </p>
                  </section>
                </>
              )}
              {tab === 2 && (
                <section className="card fairness-exercise">
                  <h2>第4話 · データの偏りと公平性</h2>
                  <p>物語のあとに選べるオリジナル4問です。</p>
                  <button onClick={() => enterFairness(false, true)}>
                    {snapshot.fairness?.visited.includes("ending")
                      ? "第4話の演習を開く"
                      : "第4話を体験してから演習へ"}
                  </button>
                </section>
              )}
              {tab === 2 && (
                <section className="card deep-exercise">
                  <h2>第5話 · 写真とディープラーニング</h2>
                  <p>本編のあとに選べるオリジナル5問です。</p>
                  <button onClick={() => enterDeepLearning(false, true)}>
                    {snapshot.deepLearning?.visited.includes("ending")
                      ? "第5話の演習を開く"
                      : "第5話を体験してから演習へ"}
                  </button>
                </section>
              )}
              {tab === 2 && (
                <section className="card training-exercise">
                  <h2>第6話 · 間違いから学ぶ仕組み</h2>
                  <p>物語のあとに選べる独自問題5問です。</p>
                  <button onClick={() => enterTraining(false, true)}>
                    {snapshot.training?.visited.includes("ending")
                      ? "第6話の演習を開く"
                      : "第6話を体験してから演習へ"}
                  </button>
                </section>
              )}
              {tab === 2 && (
                <section className="card cnn-exercise">
                  <h2>第7話 · 画像とフィルタ</h2>
                  <p>物語のあとに選べるオリジナル5問です。</p>
                  <button onClick={() => enterCnn(false, true)}>
                    {snapshot.cnn?.visited.includes("ending")
                      ? "第7話の演習を開く"
                      : "第7話を体験してから演習へ"}
                  </button>
                </section>
              )}
              {tab === 3 && (
                <section className="card">
                  <KnowledgeMap />
                </section>
              )}
              {tab === 4 && (
                <>
                  <div className="stats-row">
                    <article>
                      <span>全回答履歴</span>
                      <strong>
                        {totalAttempts}
                        <small>件</small>
                      </strong>
                    </article>
                    <article>
                      <span>復習候補</span>
                      <strong>
                        {snapshot.reviews.length}
                        <small>問</small>
                      </strong>
                    </article>
                    <article>
                      <span>L003の記録</span>
                      <strong className="status-label">
                        {p.completed ? "最後まで学習" : "学習中"}
                      </strong>
                    </article>
                  </div>
                  <section className="card completion-history">
                    <h2>これまでの完了記録</h2>
                    {pastCompletions.length ? (
                      <ul>
                        {pastCompletions.map((c) => (
                          <li key={c.id}>
                            {c.lessonId} 完了 ·{" "}
                            {new Date(c.recordedAt).toLocaleString("ja-JP")}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>完了した記録はまだありません。</p>
                    )}
                  </section>
                  <section className="card">
                    <h2>復習の候補</h2>
                    <p className="muted">
                      正解は3日後、不正解は翌日を候補日にします。習得を判定する仕組みではありません。
                    </p>
                    {snapshot.reviews.length === 0 ? (
                      <p>問題に回答すると、ここに候補が表示されます。</p>
                    ) : (
                      <ul className="record-list">
                        {snapshot.reviews.map((r) => (
                          <li key={r.id}>
                            <div>
                              <strong>{r.questionId}</strong>
                              <small>
                                {r.reason === "manual"
                                  ? "自分で登録"
                                  : r.reason === "correct"
                                    ? "正解からの振り返り"
                                    : "もう一度確かめたい問題"}{" "}
                                ·{" "}
                                {new Date(r.dueAt).toLocaleDateString("ja-JP")}
                              </small>
                            </div>
                            <button
                              onClick={() => {
                                updateProgress({
                                  questionIndex: questions.findIndex(
                                    (q) => q.id === r.questionId,
                                  ),
                                });
                                enter(7);
                              }}
                            >
                              問題を見る
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section className="card evaluation-history">
                    <h2>L004の記録</h2>
                    <p>
                      {snapshot.evaluation?.completed
                        ? "最後まで学習"
                        : snapshot.evaluation
                          ? "学習中"
                          : "未開始"}{" "}
                      · 回答履歴 {(snapshot.evaluationAttempts ?? []).length}件
                    </p>
                    <ul>
                      {[...(snapshot.evaluationAttempts ?? [])]
                        .reverse()
                        .map((a) => (
                          <li key={a.id}>
                            {a.questionId} v{a.version} · {"ABCD"[a.selected]} ·{" "}
                            {a.correct ? "正解" : "不正解"} ·{" "}
                            {new Date(a.answeredAt).toLocaleString("ja-JP")}
                          </li>
                        ))}
                    </ul>
                  </section>
                  <section className="card cnn-history">
                    <h2>L009の記録</h2>
                    <p>
                      {snapshot.cnn?.completed
                        ? "最後まで学習"
                        : snapshot.cnn
                          ? "学習中"
                          : "未開始"}{" "}
                      · 回答履歴 {snapshot.cnnAttempts?.length ?? 0}件
                    </p>
                    <ul>
                      {[...(snapshot.cnnAttempts ?? [])].reverse().map((a) => (
                        <li key={a.id}>
                          {a.questionId} · {"ABCD"[a.selected]} ·{" "}
                          {a.correct ? "正解" : "不正解"}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="card training-history">
                    <h2>L008の記録</h2>
                    <p>
                      {snapshot.training?.completed
                        ? "最後まで学習"
                        : snapshot.training
                          ? "学習中"
                          : "未開始"}{" "}
                      · 回答履歴 {snapshot.trainingAttempts?.length ?? 0}件
                    </p>
                    <ul>
                      {[...(snapshot.trainingAttempts ?? [])]
                        .reverse()
                        .map((a) => (
                          <li key={a.id}>
                            {a.questionId} · {"ABCD"[a.selected]} ·{" "}
                            {a.correct ? "正解" : "不正解"}
                          </li>
                        ))}
                    </ul>
                  </section>
                  <section className="card deep-history">
                    <h2>L007の記録</h2>
                    <p>
                      {snapshot.deepLearning?.completed
                        ? "最後まで学習"
                        : snapshot.deepLearning
                          ? "学習中"
                          : "未開始"}{" "}
                      · 回答履歴 {snapshot.deepLearningAttempts?.length ?? 0}件
                    </p>
                    <ul>
                      {[...(snapshot.deepLearningAttempts ?? [])]
                        .reverse()
                        .map((a) => (
                          <li key={a.id}>
                            {a.questionId} v{a.version} · {"ABCD"[a.selected]} ·{" "}
                            {a.correct ? "正解" : "不正解"} ·{" "}
                            {new Date(a.answeredAt).toLocaleString("ja-JP")}
                          </li>
                        ))}
                    </ul>
                  </section>
                  <section className="card fairness-history">
                    <h2>L006の記録</h2>
                    <p>
                      {snapshot.fairness?.completed
                        ? "最後まで学習"
                        : snapshot.fairness || snapshot.deepLearning
                          ? "学習中"
                          : "未開始"}{" "}
                      · 回答履歴 {(snapshot.fairnessAttempts ?? []).length}件
                    </p>
                    <ul>
                      {[...(snapshot.fairnessAttempts ?? [])]
                        .reverse()
                        .map((a) => (
                          <li key={a.id}>
                            {a.questionId} v{a.version} · {"ABCD"[a.selected]} ·{" "}
                            {a.correct ? "正解" : "不正解"} ·{" "}
                            {new Date(a.answeredAt).toLocaleString("ja-JP")}
                          </li>
                        ))}
                    </ul>
                  </section>
                  <section className="card">
                    <h2>バックアップ</h2>
                    <p>
                      記録はこのブラウザ内に保存されます。ブラウザのデータ消去などで失われることがあるため、定期的にJSONを保存してください。
                    </p>
                    <button onClick={exportBackup}>JSONをエクスポート</button>
                    <label>
                      JSONから復元
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => void readBackup(e.target.files?.[0])}
                      />
                    </label>
                    <p role="status">{importMessage}</p>
                    {pending && (
                      <div className="notice">
                        <label>
                          復元方法
                          <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                          >
                            <option value="merge">
                              統合（履歴IDで重複を除く）
                            </option>
                            <option value="replace">
                              置換（確認後に上書き）
                            </option>
                          </select>
                        </label>
                        <button disabled={saving} onClick={applyBackup}>
                          この内容を復元
                        </button>
                        <button onClick={() => setPending(null)}>
                          キャンセル
                        </button>
                      </div>
                    )}
                  </section>
                  <details className="card">
                    <summary>
                      L003の回答履歴（{snapshot.attempts.length}件）
                    </summary>
                    <ul className="history">
                      {[...snapshot.attempts].reverse().map((a) => (
                        <li key={a.id}>
                          {a.questionId} v{a.version} · {"ABCD"[a.selected]} ·{" "}
                          {a.correct ? "正解" : "不正解"} ·{" "}
                          {new Date(a.answeredAt).toLocaleString("ja-JP")}
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
              <footer className="page-footer">
                <span>WHY LEARN G · v0.2.2</span>
                <details>
                  <summary>教材の参照情報</summary>
                  <p>
                    JDLA公式シラバスの機械学習の概要を参照。
                    {syllabus[0].checkedAt}
                    確認。本アプリは独自教材で、JDLA公式教材ではありません。
                  </p>
                  <a href={syllabus[0].source} target="_blank" rel="noreferrer">
                    JDLA公式シラバス ↗（オンライン）
                  </a>
                </details>
              </footer>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
