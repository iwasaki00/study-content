import { useEffect, useMemo, useRef } from "react";
import type { TrainingProgress, QuestionAttempt } from "../types";
import {
  trainingAnimals,
  evaluationAnimals,
  trainingStages,
  trainingTitles,
  trainingDives,
  trainingTerms,
  trainingSources,
  trainingQuestions,
} from "../data/training";
import {
  evaluateNetwork,
  forward,
  gradients,
  initialParameters,
  parameterNames,
  maxUpdates,
} from "../engine/training";
import { Quiz } from "./Learning";
const base = import.meta.env.BASE_URL;
const fmt = (v: number) => v.toFixed(4);
const scoreFmt = (v: number) =>
  v < 0.5 && Number(v.toFixed(6)) >= 0.5 ? "< 0.500000" : v.toFixed(6);
function Picture({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="training-picture">
      <img
        src={`${base}illustrations/l008/${name}.png`}
        alt={alt}
        width={1536}
        height={1024}
      />
    </figure>
  );
}
function Staff({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="inspector-speech">
      <span>施設のスタッフ</span>
      <p>「{children}」</p>
    </blockquote>
  );
}
function Prediction({ parameters }: { parameters: readonly number[] }) {
  const r = evaluateNetwork(parameters, [trainingAnimals[0]]).rows[0];
  return (
    <div className="training-prediction" aria-live="polite">
      <img
        src={`${base}illustrations/l007/cat-pixel-source.png`}
        alt="最初に間違えた猫C01を表す絵"
        width={88}
        height={88}
      />
      <div>
        <strong>猫C01</strong>
        <p>人が付けた正解：猫</p>
        <p>
          AIの現在の判定：<b>{r.predicted === 1 ? "猫" : "犬"}</b> ·{" "}
          {r.correct ? "一致" : "不一致"}
        </p>
      </div>
    </div>
  );
}
function Network({ p }: { p: TrainingProgress }) {
  const links = Array.from({ length: 6 }, (_, i) => ({
    x1: 40,
    y1: i < 3 ? 55 : 155,
    x2: 155,
    y2: 30 + (i % 3) * 75,
    value: p.parameters[i],
    id: i,
  })).concat(
    Array.from({ length: 3 }, (_, j) => ({
      x1: 155,
      y1: 30 + j * 75,
      x2: 270,
      y2: 105,
      value: p.parameters[9 + j],
      id: 9 + j,
    })),
  );
  return (
    <figure className="training-network">
      <figcaption>実際の計算に対応するネットワーク</figcaption>
      <svg
        viewBox="0 0 310 220"
        role="img"
        aria-label="入力2、中間層3、出力1。線は現在の重みと連動します"
      >
        {links.map((l) => (
          <line
            key={l.id}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={l.value >= 0 ? "#276d66" : "#9c6235"}
            strokeWidth={1 + Math.min(Math.abs(l.value), 3) * 1.8}
            strokeDasharray={l.value < 0 ? "5 3" : undefined}
            data-parameter={l.id}
            data-value={l.value}
          />
        ))}
        {[
          { x: 40, ys: [55, 155] },
          { x: 155, ys: [30, 105, 180] },
          { x: 270, ys: [105] },
        ].map((c, i) =>
          c.ys.map((y, j) => (
            <circle
              key={i + "-" + j}
              cx={c.x}
              cy={y}
              r={17}
              fill={i === 1 ? "#e8c784" : "#dfead4"}
              stroke="#355b49"
              strokeWidth={2}
            />
          )),
        )}
        <text x={40} y={213} textAnchor="middle">
          入力層
        </text>
        <text x={155} y={213} textAnchor="middle">
          中間層
        </text>
        <text x={270} y={213} textAnchor="middle">
          出力層
        </text>
      </svg>
      <p className="muted">
        線の太さは重みの大きさと連動。実線は正、破線は負の重みです。バイアスも同時に更新します。図の丸は動物の部位を担当する印ではありません。
      </p>
    </figure>
  );
}
function Chart({ p }: { p: TrainingProgress }) {
  const max = Math.max(...p.history.map((h) => h.loss), 0.001) * 1.1,
    denom = Math.max(1, p.updates);
  const points = p.history
    .map((h) => `${30 + (h.step / denom) * 260},${160 - (h.loss / max) * 140}`)
    .join(" ");
  return (
    <figure className="training-chart">
      <figcaption>練習8例の平均損失の推移</figcaption>
      <svg
        viewBox="0 0 310 195"
        role="img"
        aria-label={`学習0回から${p.updates}回までの損失。現在${fmt(p.history.at(-1)!.loss)}`}
        data-updates={p.updates}
        data-loss={p.history.at(-1)!.loss}
      >
        <path d="M30 15 V160 H295" fill="none" stroke="#647862" />
        <polyline
          points={points}
          fill="none"
          stroke="#226e61"
          strokeWidth={3}
        />
        {p.history.map((h) => (
          <circle
            key={h.step}
            cx={30 + (h.step / denom) * 260}
            cy={160 - (h.loss / max) * 140}
            r={p.updates < 100 ? 2 : 1}
            fill="#226e61"
            data-step={h.step}
            data-loss={h.loss}
          />
        ))}
        <text x={30} y={182}>
          0回
        </text>
        <text x={290} y={182} textAnchor="end">
          {p.updates}回
        </text>
        <text x={4} y={12}>
          損失
        </text>
      </svg>
      <p>
        横は更新回数、縦は損失の大きさ。今回の推移であり、毎回の低下を保証するものではありません。
      </p>
    </figure>
  );
}
function ModelDetails({
  p,
  onChange,
}: {
  p: TrainingProgress;
  onChange: (v: Partial<TrainingProgress>) => void;
}) {
  const before = p.previousParameters,
    g = gradients(before),
    f = forward(p.parameters, [0.9, 0.2]);
  return (
    <details
      className="episode-details training-model"
      open={p.modelDetails}
      onToggle={(e) => {
        if (e.currentTarget.open !== p.modelDetails)
          onChange({ modelDetails: e.currentTarget.open });
      }}
    >
      <summary>学習の詳細：重み・バイアス・勾配を見る</summary>
      <p>
        2入力→中間層3→出力1。中間層は1層で、両層にSigmoidを使います。学習率1.0、練習8例の平均勾配を使うバッチ勾配降下法です。数値は丸めて表示します。判定は丸める前のスコアで計算します。
      </p>
      <p>
        これは人が設定した2つの特徴による小規模な学習デモです。写真の画素を入力する多層の画像認識モデルではありません。
      </p>
      <p>
        「直前」は最後の1回の更新直前です。10回・50回の操作も、内部では1回ずつ更新して履歴を残しています。
      </p>
      <p>
        猫C01の入力：0.9 / 0.2。現在の中間層：{f.hidden.map(fmt).join(" / ")}
        。出力スコア：{scoreFmt(f.score)}。
      </p>
      <ul className="training-parameters">
        {p.parameters.map((v, i) => (
          <li key={i}>
            <strong>{parameterNames[i]}</strong>
            <span>初期 {fmt(initialParameters[i])}</span>
            <span>
              直前 {fmt(before[i])} → 現在 {fmt(v)}
            </span>
            <span>
              更新に使った平均勾配{" "}
              {p.updates ? fmt(g[i]) : "まだ更新していません"}
            </span>
          </li>
        ))}
      </ul>
      <details>
        <summary>履歴の数値を読む</summary>
        <ul>
          {p.history.map((h) => (
            <li key={h.step}>
              {h.step}回：損失 {fmt(h.loss)} / {h.correct}/8正解 / 猫のスコア{" "}
              {scoreFmt(h.catScore)}
            </li>
          ))}
        </ul>
      </details>
    </details>
  );
}
function Rows({
  parameters,
  data,
}: {
  parameters: readonly number[];
  data: typeof trainingAnimals;
}) {
  const r = evaluateNetwork(parameters, data);
  return (
    <>
      <p className="training-result-total">
        {r.correct}/{r.total}例正解 · 平均損失 {fmt(r.loss)}
      </p>
      <ul className="training-results">
        {r.rows.map((row) => (
          <li key={row.id}>
            <strong>{row.id}</strong>
            <span>正解：{row.label === 1 ? "猫" : "犬"}</span>
            <span>
              判定：{row.predicted === 1 ? "猫" : "犬"} ·{" "}
              {row.correct ? "一致" : "不一致"}
            </span>
            <span>猫のスコア {scoreFmt(row.score)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
function Dive({
  item,
  p,
  onChange,
}: {
  item: (typeof trainingDives)[number];
  p: TrainingProgress;
  onChange: (v: Partial<TrainingProgress>) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null),
    position = useRef(0),
    isOpen = p.openDives.includes(item.id);
  function set(open: boolean) {
    if (open === isOpen) return;
    onChange({
      openDives: open
        ? [...p.openDives, item.id]
        : p.openDives.filter((id) => id !== item.id),
    });
  }
  return (
    <details
      ref={ref}
      className="episode-details training-dive"
      open={isOpen}
      onToggle={(e) => set(e.currentTarget.open)}
    >
      <summary
        onClick={() => {
          if (!isOpen) position.current = window.scrollY;
        }}
      >
        {item.id.slice(-3)}：{item.title}
      </summary>
      <h3>やさしい説明</h3>
      <p>{item.easy}</p>
      <h3>具体例</h3>
      <p>{item.example}</p>
      <h3>図解</h3>
      <ol className="deep-flow-diagram">
        {item.diagram.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <h3>技術的な説明</h3>
      <p>{item.detail}</p>
      <p className="training-formula">{item.formula}</p>
      <h3>関連するG検定用語</h3>
      <p>{item.terms}</p>
      <ul>
        {item.sourceIds.map((id) => {
          const s = trainingSources.find((s) => s.id === id)!;
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title} ↗（オンライン）
              </a>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => {
          set(false);
          requestAnimationFrame(() => {
            window.scrollTo({ top: position.current, behavior: "instant" });
            ref.current
              ?.querySelector("summary")
              ?.focus({ preventScroll: true });
          });
        }}
      >
        解説を閉じて元の項目に戻る
      </button>
    </details>
  );
}
export function TrainingEpisode({
  progress: p,
  attempts,
  onChange,
  onMove,
  onLearn,
  onReset,
  onAnswer,
  onFinish,
  onGuide,
  onNext,
  busy,
}: {
  progress: TrainingProgress;
  attempts: QuestionAttempt[];
  onChange: (v: Partial<TrainingProgress>) => void;
  onMove: (s: TrainingProgress["stage"]) => void;
  onLearn: (n: number) => void;
  onReset: () => void;
  onAnswer: (n: number) => void;
  onFinish: () => void;
  onNext: () => void;
  onGuide: (e: React.MouseEvent<HTMLButtonElement>) => void;
  busy: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [p.stage]);
  const result = useMemo(
      () => evaluateNetwork(p.parameters, trainingAnimals),
      [p.parameters],
    ),
    initial = evaluateNetwork(initialParameters, trainingAnimals),
    index = trainingStages.indexOf(p.stage as (typeof trainingStages)[number]),
    cat = result.rows[0];
  const next = (stage: TrainingProgress["stage"], text: string) => (
    <button
      className="primary story-action"
      disabled={busy}
      onClick={() => onMove(stage)}
    >
      {text}
    </button>
  );
  return (
    <div className="lesson-wrap story-intro training-lesson" data-lesson="L008">
      <button className="guide-link" onClick={onGuide}>
        第0章で関連説明を確認
      </button>
      <p className="eyebrow">
        第6話 · L008 · {index >= 0 ? `${index + 1} / 7 場面` : "任意の振り返り"}
      </p>
      <h1 tabIndex={-1} ref={heading}>
        {trainingTitles[p.stage]}
      </h1>
      <section className="card scene-body">
        {p.stage === "intro" && (
          <>
            <Picture
              name="mistaken-cat"
              alt="猫の写真と画面を見比べ、判定に困る第5話と同じスタッフ"
            />
            <p className="muted">学習前の初期状態の記録です。</p>
            <Prediction parameters={initialParameters} />
            <Staff>
              この子は猫なのに、犬になってる！どうしたらAIに正しく判断してもらえるんだろう？
            </Staff>
            <p>今日は小さな判定の仕組みを、実際に調整してみます。</p>
            {next("features", "間違いの理由を調べる")}
          </>
        )}
        {p.stage === "features" && (
          <>
            <Picture
              name="labelled-photos"
              alt="人が確認した猫と犬の見本写真を、記録と一緒に並べるスタッフ"
            />
            <p>
              今回は、耳の立ち具合と鼻先の長さを0〜1の数字にします。猫C01は「耳0.9・鼻先0.2」、犬D01は「耳0.2・鼻先0.85」です。
            </p>
            <p>正解付きの練習データ8例を用意しました。</p>
            <p className="notice">
              特徴値は教材用に人が設定した架空の数字です。実際の動物を必ず分けられる特徴ではありません。写真そのものを入力する画像認識や、写真から特徴表現を学ぶ仕組みの完全再現ではありません。
            </p>
            <details className="episode-details">
              <summary>練習8例の入力と正解を見る</summary>
              <ul>
                {trainingAnimals.map((d) => (
                  <li key={d.id}>
                    {d.id}：耳 {d.ear} / 鼻先 {d.nose} / 正解{" "}
                    {d.label === 1 ? "猫" : "犬"}
                  </li>
                ))}
              </ul>
            </details>
            {next("loss", "予測と正解を見比べる")}
          </>
        )}
        {p.stage === "loss" && (
          <>
            <Prediction parameters={initialParameters} />
            <div className="training-score">
              <p>
                猫C01の「猫のスコア」：
                <strong>{scoreFmt(initial.rows[0].score)}</strong>
              </p>
              <p>
                正解とのずれ：<strong>{fmt(initial.rows[0].loss)}</strong>
              </p>
            </div>
            <p>
              猫のスコアは0〜1。0.5以上なら猫、それより小さければ犬と判定します。これは簡易モデルのスコアで、実際の確率の正確さを保証する数字ではありません。
            </p>
            <h2>ずれを測るもの：損失関数</h2>
            <p>
              AIの予測と正解がどれくらい違うのかを数値で表すものです。今回は「二値交差エントロピー」を使い、練習8例の平均で調整します。式を覚える必要はありません。
            </p>
            {next("update", "内部の数字を調整してみる")}
          </>
        )}
        {p.stage === "update" && (
          <>
            <Picture
              name="network-investigation"
              alt="小さなネットワークの仕組みを、モニターとノートで調べるスタッフ"
            />
            <Network p={p} />
            <div className="training-comparison">
              <article>
                <h2>学習前</h2>
                <p>猫のスコア {scoreFmt(initial.rows[0].score)}</p>
                <p>平均損失 {fmt(initial.loss)}</p>
              </article>
              <article>
                <h2>現在：{p.updates}回</h2>
                <p>猫のスコア {scoreFmt(cat.score)}</p>
                <p>平均損失 {fmt(result.loss)}</p>
              </article>
            </div>
            {!p.trainedOnce ? (
              <button
                className="primary story-action"
                disabled={busy}
                onClick={() => onLearn(1)}
              >
                1回学習する
              </button>
            ) : (
              <>
                <p>
                  重みとバイアスが更新され、予測と損失が変わりました。1回ですぐ正解になるとは限りません。
                </p>
                {next("practice", "何度も学習してみる")}
              </>
            )}
            <ModelDetails p={p} onChange={onChange} />
          </>
        )}
        {p.stage === "practice" && (
          <>
            <Prediction parameters={p.parameters} />
            <div className="training-dashboard" aria-live="polite">
              <p>
                学習回数{" "}
                <strong data-testid="training-count">{p.updates}</strong>回
              </p>
              <p>
                練習 <strong>{result.correct}/8</strong>例正解
              </p>
              <p>
                平均損失{" "}
                <strong data-testid="training-loss">{fmt(result.loss)}</strong>
              </p>
              <p>初期の平均損失 {fmt(initial.loss)}</p>
            </div>
            <div className="training-controls" aria-label="学習を操作">
              {[1, 10, 50].map((n) => (
                <button
                  className={n === 50 ? "primary" : ""}
                  key={n}
                  disabled={busy || p.updates + n > maxUpdates}
                  onClick={() => onLearn(n)}
                >
                  {n}回学習
                </button>
              ))}
              <button disabled={busy} onClick={onReset}>
                最初からやり直す
              </button>
            </div>
            <p className="muted">
              ボタンの回数分、全8例で重みを更新します。自動学習や待つアニメーションはありません。保存後に次の操作ができます。
            </p>
            <Chart p={p} />
            <div className="training-change-message">
              <p>
                {cat.correct
                  ? "最初に間違えた猫C01も、今の重みでは猫と判定されています。"
                  : "まだ猫C01は犬という判定です。今回の設定では学習を進めると改善を確かめられます。50回学習も試してみましょう。"}
              </p>
            </div>
            <p>
              練習での改善は、どんなデータでも正解するという保証ではありません。損失や正解数が毎回よくなるとは限りません。
            </p>
            {p.updates >= maxUpdates && (
              <p>
                この教材で保存できる学習は1000回までです。初期値へ戻して繰り返し試せます。
              </p>
            )}
            <ModelDetails p={p} onChange={onChange} />
            {cat.correct &&
              p.trainedOnce &&
              next("evaluation", "新しい動物でも試す")}
          </>
        )}
        {p.stage === "evaluation" && (
          <>
            <Picture
              name="trained-review"
              alt="学習後の判定を、写真と人の記録で確かめるスタッフ"
            />
            <Staff>
              練習で正解するようになったね。でも、新しい動物でもうまくいくかな？
            </Staff>
            <section className="training-train-results">
              <h2>学習に使った8例</h2>
              <Rows parameters={p.parameters} data={trainingAnimals} />
            </section>
            {!p.evaluated ? (
              <button
                className="primary story-action"
                disabled={busy}
                onClick={() => onChange({ evaluated: true })}
              >
                学習に使っていない4例を確かめる
              </button>
            ) : (
              <>
                <section className="training-test-results">
                  <h2>初めて見る確認用4例</h2>
                  <Rows parameters={p.parameters} data={evaluationAnimals} />
                </section>
                <p>
                  確認だけでは重みを変えていません。第3話の「どの箱で確かめるか」と同じく、練習と初めて見るデータは分けます。4例の結果だけで、実際の動物写真の性能は保証できません。
                </p>
                {next("ending", "第6話をまとめる")}
              </>
            )}
          </>
        )}
        {p.stage === "ending" && (
          <>
            <Picture
              name="trained-review"
              alt="判定結果を人が確認しながら写真整理を進めるスタッフ"
            />
            <Staff>
              AIは正解を覚えるだけでなく、予測の間違いを手がかりに内部の数値を更新していくんだね
            </Staff>
            <Prediction parameters={p.parameters} />
            <dl>
              {trainingTerms.map(([term, definition]) => (
                <div key={term}>
                  <dt>
                    <strong>{term}</strong>
                  </dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
            <p>
              今回動かしたのは、架空の特徴値を入力する中間層1層の小規模なニューラルネットワークです。本格的な多層ディープラーニングの画像認識モデルではありません。
            </p>
            <div className="episode-end-actions">
              <button className="primary" onClick={onFinish} disabled={busy}>
                ここで終える
              </button>
              <button onClick={() => onMove("quiz")}>
                G検定の問題で確認する
              </button>
              <button onClick={() => onMove("details")}>
                もっと詳しく学ぶ
              </button>
            </div>
          </>
        )}
        {p.stage === "ending" && (
          <aside className="notice">
            <h2>次は、画像から情報を取り出す仕組みへ</h2>
            <button onClick={onNext}>
              第7話へ：AIは写真のどこを見ているの？
            </button>
          </aside>
        )}
        {p.stage === "quiz" && (
          <>
            <p>
              第6話の独自問題5問です。公式試験問題ではありません。回答は任意です。
            </p>
            <Quiz
              key={p.sessionId}
              index={p.questionIndex}
              attempts={attempts}
              sessionId={p.sessionId}
              onAnswer={onAnswer}
              onIndex={(questionIndex) => onChange({ questionIndex })}
              busy={busy}
              items={trainingQuestions}
              relatedLabel="L008-K01〜K05：学習と推論・損失・更新・逆伝播・学習率と汎化"
              sourceLabel="本編と深掘り末尾のJDLA・Google MLCC"
            />
            {next("ending", "第6話のまとめへ戻る")}
          </>
        )}
        {p.stage === "details" && (
          <>
            <p>深掘りは任意。開いた項目も保存・再開できます。</p>
            {trainingDives.map((item) => (
              <Dive key={item.id} item={item} p={p} onChange={onChange} />
            ))}
            <h2>出典と公式シラバスとの対応</h2>
            <ul>
              {trainingSources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗（オンライン）
                  </a>
                  <p>
                    {s.scope} · 確認日 {s.checkedAt}
                  </p>
                </li>
              ))}
            </ul>
            {next("ending", "第6話のまとめへ戻る")}
          </>
        )}
      </section>
      {index > 0 && (
        <button
          className="evaluation-back"
          disabled={busy}
          onClick={() => onMove(trainingStages[index - 1])}
        >
          ← 前の場面へ
        </button>
      )}
    </div>
  );
}
