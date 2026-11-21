import { useEffect, useMemo, useRef } from "react";
import type { FairnessProgress, QuestionAttempt } from "../types";
import {
  brightTraining,
  brightEvaluation,
  darkEvaluation,
  lightingFactors,
  fairnessStoryStages,
  fairnessTitles,
  fairnessTerms,
  fairnessQuestions,
  fairnessSources,
  fairnessSyllabus,
  fairnessDeepDives,
} from "../data/fairness";
import { fitConditionModel, evaluateCondition } from "../engine/fairness";
import { Quiz } from "./Learning";
const model = fitConditionModel(brightTraining);
const bright = evaluateCondition(
  model,
  brightEvaluation,
  lightingFactors.bright,
);
const dark = evaluateCondition(model, darkEvaluation, lightingFactors.dark);
const adjusted = evaluateCondition(
  model,
  darkEvaluation,
  lightingFactors.adjusted,
);
type Result = ReturnType<typeof evaluateCondition>;
function Inspector({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="inspector-line">
      <span>検査員</span>
      <p>「{children}」</p>
    </blockquote>
  );
}
const art = {
  "two-lines": {
    alt: "同じ工場の2つの検査ライン。緑の帽子の検査員を挟み、左は明るい照明、右は弱い照明の下に同じ種類の箱とカメラがある。",
    caption: "左：明るいライン ／ 右：暗いライン。AIの判定方法は同じです。",
  },
  "missed-boxes": {
    alt: "暗いラインの出口で、検査員が通ってしまった別々の不良箱のへこみに気づき、驚いている。",
    caption: "通ってしまった箱を、検査員の確認結果と照らし合わせます。",
  },
  "lighting-adjustment": {
    alt: "同じ検査員がカメラのそばの照明を調整し、箱のへこみが照らされる。別の箱もベルト上で待っている。",
    caption: "AIのルールと評価する箱は保ち、照明条件だけを調整します。",
  },
  "human-review": {
    alt: "工場とは別の面談室。担当者2人が画面の判断案と紙の記録を確認し、向かいに座る本人の説明を聞いている。",
    caption:
      "人に関わる判断では、根拠を確認し、本人の事情も聞ける運用を考えます。",
  },
};
function Picture({ name }: { name: keyof typeof art }) {
  return (
    <figure className="fairness-picture">
      <img
        src={`${import.meta.env.BASE_URL}illustrations/l006/${name}.png`}
        alt={art[name].alt}
        width={name === "human-review" ? 1254 : 1536}
        height={name === "human-review" ? 1254 : 1024}
      />
      <figcaption>{art[name].caption}</figcaption>
    </figure>
  );
}
function Score({ result }: { result: Result }) {
  return (
    <>
      <strong>
        {result.correct}/{result.total}
      </strong>
      <span>箱で正解</span>
    </>
  );
}
function LineResults({ result, name }: { result: Result; name: string }) {
  return (
    <article className="fairness-line-results" data-line={name}>
      <h3>{name}</h3>
      <div className="fairness-score">
        <Score result={result} />
      </div>
      <p>不良品の見逃し：{result.missed.length}箱</p>
      <details className="episode-details fairness-box-records">
        <summary>箱ごとの判定を見る（{result.total}箱）</summary>
        <ol className="fairness-box-grid" aria-label={`${name}の箱ごとの判定`}>
          {result.rows.map((r) => (
            <li
              key={r.id}
              data-box-id={r.id}
              data-predicted={r.predicted}
              className={r.correct ? "matched" : "missed"}
            >
              <strong>{r.id}</strong>
              <span>{r.correct ? "✓ 一致" : "! 見逃し"}</span>
              <span>実際：{r.actual}</span>
              <span>AI：{r.predicted}</span>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
function Comparison() {
  return (
    <section className="fairness-comparison" aria-label="最初の試運転の結果">
      <div className="fairness-overall">
        全体：
        <strong>
          {bright.correct + dark.correct}/{bright.total + dark.total}箱で正解
        </strong>
      </div>
      <div className="fairness-line-pair">
        <LineResults result={bright} name="明るいライン" />
        <LineResults result={dark} name="暗いライン" />
      </div>
      <p className="notice">
        暗いラインで、不良品{dark.missed.length}箱を見逃しました。
      </p>
    </section>
  );
}
function ChangedBoxes({
  improved,
  result,
}: {
  improved: boolean;
  result: Result;
}) {
  const changes = dark.rows.filter(
    (before) =>
      adjusted.rows.find((after) => after.id === before.id)!.predicted !==
      before.predicted,
  );
  return (
    <div className="fairness-changed-boxes">
      {changes.map((before) => {
        const after = result.rows.find((r) => r.id === before.id)!;
        return (
          <article key={before.id} data-changed-box={before.id}>
            <h3>同じ箱{before.id}</h3>
            <p>人の確認：{before.actual}</p>
            <div className="fairness-box-pair">
              <section>
                <span>調整前</span>
                <img
                  src={`${import.meta.env.BASE_URL}illustrations/l003/box-sprite.png`}
                  alt="同じ評価用の箱"
                />
                <strong>AIの判定：{before.predicted}</strong>
                <span>! 見逃し</span>
              </section>
              {improved && (
                <section>
                  <span>調整後</span>
                  <img
                    src={`${import.meta.env.BASE_URL}illustrations/l003/box-sprite.png`}
                    alt="照明調整後に再判定した同じ箱"
                  />
                  <strong>AIの判定：{after.predicted}</strong>
                  <span>{after.correct ? "✓ 人の確認と一致" : "! 不一致"}</span>
                </section>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
function DeepDive({ item }: { item: (typeof fairnessDeepDives)[number] }) {
  const el = useRef<HTMLDetailsElement>(null),
    position = useRef(0);
  function close() {
    el.current!.open = false;
    requestAnimationFrame(() => {
      window.scrollTo({ top: position.current, behavior: "instant" });
      el.current?.querySelector("summary")?.focus({ preventScroll: true });
    });
  }
  return (
    <details className="episode-details fairness-deep-dive" ref={el}>
      <summary
        onClick={() => {
          if (!el.current?.open) position.current = window.scrollY;
        }}
      >
        {item.title}
      </summary>
      <h3>やさしい説明</h3>
      <p>{item.easy}</p>
      <h3>具体例</h3>
      <p>{item.example}</p>
      <h3>詳しい説明</h3>
      <p>{item.detail}</p>
      <p className="notice">{item.definition}</p>
      <p>
        参照：
        {item.sourceIds
          .map((id) => fairnessSources.find((s) => s.id === id)!.title)
          .join(" ／ ")}
      </p>
      <button onClick={close}>解説を閉じて元の項目に戻る</button>
    </details>
  );
}
function ModelDetails() {
  return (
    <details className="episode-details fairness-model">
      <summary>この教材の計算方法と、箱ごとの数字</summary>
      <p>
        概念理解用の簡易モデルです。実際のカメラ画像による傷検出やディープラーニングではありません。箱の特徴を表す架空の数字を使っています。
      </p>
      <p>
        学習用は、明るい条件の良品
        {brightTraining.filter((b) => b.actual === "良品").length}箱と不良品
        {brightTraining.filter((b) => b.actual === "不良").length}
        箱。良品の最大値{model.maxGood}と不良品の最小値{model.minBad}
        の中間から、しきい値{model.threshold}を求めます。
      </p>
      <p>
        観測特徴値＝基準特徴値×照明係数。観測値がしきい値以上なら不良と判定。明るいラインと調整後は
        {lightingFactors.bright}、暗いラインは{lightingFactors.dark}
        です。評価用の答えは学習に混ぜません。
      </p>
      {[
        { name: "明るいライン", result: bright },
        { name: "暗いライン・調整前", result: dark },
        { name: "同じ暗いライン・調整後", result: adjusted },
      ].map(({ name, result }) => (
        <section key={name}>
          <h3>{name}</h3>
          <ul className="fairness-number-records">
            {result.rows.map((r) => (
              <li key={r.id}>
                <strong>箱{r.id}</strong>
                <span>
                  基準 {r.baseFeature} → 観測 {Number(r.observed.toFixed(3))}
                </span>
                <span>人の確認：{r.actual}</span>
                <span>
                  AIの判定：{r.predicted} · {r.correct ? "一致" : "不一致"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </details>
  );
}
export function FairnessEpisode({
  progress: p,
  attempts,
  onMove,
  onAdjust,
  onIndex,
  onAnswer,
  onFinish,
  onGuide,
  onNext,
  busy,
}: {
  progress: FairnessProgress;
  attempts: QuestionAttempt[];
  onMove: (stage: FairnessProgress["stage"]) => void;
  onAdjust: () => void;
  onIndex: (index: number) => void;
  onAnswer: (choice: number) => void;
  onFinish: () => void;
  onNext: () => void;
  onGuide: (event: React.MouseEvent<HTMLButtonElement>) => void;
  busy: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const currentDark = useMemo(
    () =>
      evaluateCondition(
        model,
        darkEvaluation,
        p.lightingAdjusted ? lightingFactors.adjusted : lightingFactors.dark,
      ),
    [p.lightingAdjusted],
  );
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [p.stage]);
  const storyIndex = fairnessStoryStages.indexOf(
    p.stage as (typeof fairnessStoryStages)[number],
  );
  return (
    <div className="lesson-wrap story-intro fairness-lesson" data-lesson="L006">
      <button className="guide-link" onClick={onGuide}>
        第0章で関連説明を確認
      </button>
      <p className="eyebrow">
        第4話 · L006 ·{" "}
        {storyIndex >= 0
          ? `${storyIndex + 1} / ${fairnessStoryStages.length} 場面`
          : "任意の振り返り"}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {fairnessTitles[p.stage]}
      </h1>
      <section className="card scene-body">
        {p.stage === "intro" && (
          <>
            <Picture name="two-lines" />
            <p>
              工場では、別の検査ラインにも同じ仕組みを導入することになりました。
            </p>
            <Inspector>
              こっちのラインでも、前に作ったAIを試してみよう。判定方法は同じだから、うまくいくと思うんだけど……
            </Inspector>
            <p className="muted">
              箱の特徴を表す数字を使う教材です。実際のカメラ画像を認識する実験ではありません。
            </p>
            <button
              className="primary story-action"
              onClick={() => onMove("results")}
            >
              2つのラインで試してみる
            </button>
          </>
        )}
        {p.stage === "results" && (
          <>
            <Comparison />
            <Picture name="missed-boxes" />
            <Inspector>
              あれ？ 同じAIなのに、暗いラインだけ不良品を見逃しているぞ
            </Inspector>
            <div className="fairness-missed-labels">
              {dark.missed.map((r) => (
                <article key={r.id}>
                  <strong>箱{r.id}</strong>
                  <span>人の確認：{r.actual}</span>
                  <span>AIの判定：{r.predicted}として通した</span>
                </article>
              ))}
            </div>
            <p>
              全体の成績だけでは、どこで何を間違えたかが見えにくくなります。2つのラインを見比べてみましょう。
            </p>
            <button
              className="primary story-action"
              onClick={() => onMove("investigation")}
            >
              何が違うのか調べる
            </button>
          </>
        )}
        {p.stage === "investigation" && (
          <>
            <Picture name="two-lines" />
            <dl className="fairness-conditions">
              <div>
                <dt>AIの判定ルール</dt>
                <dd>同じ</dd>
              </div>
              <div>
                <dt>箱の種類と良否の内訳</dt>
                <dd>
                  同じ種類。どちらも良品
                  {bright.rows.filter((r) => r.actual === "良品").length}
                  箱・不良品
                  {bright.rows.filter((r) => r.actual === "不良").length}箱
                </dd>
              </div>
              <div>
                <dt>検査の目的</dt>
                <dd>不良品を見つけて止める</dd>
              </div>
              <div>
                <dt>違っていたこと</dt>
                <dd>撮影時の照明条件</dd>
              </div>
            </dl>
            <Inspector>
              そうか。このAIは、明るい場所で撮った箱のデータを使って調整していたんだ
            </Inspector>
            <p>
              この教材では、暗いとへこみの手がかりが弱く観測される設定です。箱の実際の状態は変わらなくても、AIに渡る手がかりが変わり、同じルールでの判定が違いました。
            </p>
            <p>
              この教材の設定は、暗い条件に対応していません。明るい場所で調整した判定が、別の条件でも適切に使えるとは限りません。照明が違えば必ず誤判定する、という意味ではありません。
            </p>
            <p>
              2つのラインでは、同じ種類・内訳の別々の箱で確かめています。次は暗いラインの同じ
              {dark.total}箱を使い、照明だけを変えて比べます。
            </p>
            <button
              className="primary story-action"
              onClick={() => onMove("lighting")}
            >
              照明を見直してみる
            </button>
          </>
        )}
        {p.stage === "lighting" && (
          <>
            <Picture
              name={p.lightingAdjusted ? "lighting-adjustment" : "missed-boxes"}
            />
            <div className="fairness-light-scores" aria-live="polite">
              <section>
                <h2>照明の調整前</h2>
                <div className="fairness-score">
                  <Score result={dark} />
                </div>
                <p>不良品の見逃し：{dark.missed.length}箱</p>
              </section>
              {p.lightingAdjusted && (
                <section>
                  <h2>照明の調整後</h2>
                  <div className="fairness-score">
                    <Score result={currentDark} />
                  </div>
                  <p>不良品の見逃し：{currentDark.missed.length}箱</p>
                </section>
              )}
            </div>
            <ChangedBoxes improved={p.lightingAdjusted} result={currentDark} />
            {p.lightingAdjusted ? (
              <>
                <Inspector>
                  照明を変えたら、見逃していた箱も見つけられた。AIの設定だけじゃなく、使う環境も大切なんだね
                </Inspector>
                <p>
                  同じ{dark.total}
                  箱を、同じ判定ルールで再計算した結果です。これは教材用に単純化した例で、照明を改善すれば常に誤判定がなくなる、という保証ではありません。
                </p>
                <button
                  className="primary story-action"
                  onClick={() => onMove("bias")}
                >
                  用意したデータを振り返る
                </button>
              </>
            ) : (
              <>
                <p>AIのルールも、箱も変えずに試します。</p>
                <button className="primary story-action" onClick={onAdjust}>
                  暗いラインの照明を調整する
                </button>
              </>
            )}
          </>
        )}
        {p.stage === "bias" && (
          <>
            <p>
              明るい条件の箱だけで調整していたため、暗い条件を十分に確かめていませんでした。実験で見たことに、名前を付けて整理します。
            </p>
            <div className="fairness-terms">
              {fairnessTerms.map((t) => (
                <article key={t.name}>
                  <h2>{t.name}</h2>
                  <p>{t.definition}</p>
                </article>
              ))}
            </div>
            <h2>次にできること</h2>
            <ul>
              <li>暗い条件の学習用データも用意する</li>
              <li>実際に使う環境を確認する</li>
              <li>学習に使わない箱で、条件ごとに性能を確かめる</li>
            </ul>
            <p>
              全体の件数や平均だけでなく、抜けている状況がないかも見直します。
            </p>
            <button
              className="primary story-action"
              onClick={() => onMove("fairness")}
            >
              人に関わるAIの判断も考える
            </button>
          </>
        )}
        {p.stage === "fairness" && (
          <>
            <Picture name="human-review" />
            <p>
              工場の撮影条件による性能差は、主として技術的な問題でした。一方、採用審査・融資・教育で使うAIは、人の権利や機会に影響します。特定の人々が不利になる偏りは、公平性や倫理の問題につながる場合があります。
            </p>
            <blockquote className="fairness-example">
              <strong>短い架空事例</strong>
              <p>
                過去の採用結果をもとにしたAIが、過去の偏った判断まで学んでしまったら？
              </p>
              <p>能力があっても、ある背景の人の機会が狭まるかもしれません。</p>
            </blockquote>
            <ul>
              <li>過去のデータが必ずしも公平とは限らない</li>
              <li>全体の正解率だけで判断しない</li>
              <li>どの人々に不利益が生じる可能性があるか確かめる</li>
              <li>
                重要な判断をAIだけに任せず、人が根拠を確認し、見直せる運用を考える
              </li>
              <li>
                公平性には複数の考え方があり、一つの数字だけでは決められない
              </li>
            </ul>
            <p className="notice">
              この工場の実験で、社会的な公平性まで証明したわけではありません。人の確認にも偏り得るため、形式的な承認だけで十分とはいえません。
            </p>
            <button
              className="primary story-action"
              onClick={() => onMove("ending")}
            >
              第4話をまとめる
            </button>
          </>
        )}
        {p.stage === "ending" && (
          <>
            <Inspector>
              同じAIでも、使う条件が変われば確かめ直すことが大切だったね。人に関わるときは、誰にどんな影響があるかも考えよう
            </Inspector>
            <ol className="fairness-recap">
              <li>AIの性能は、利用する条件によって変わることがある</li>
              <li>学習データや評価データの偏りに注意する</li>
              <li>人に影響するAIでは、公平性・倫理も考える</li>
            </ol>
            <h2>G検定の用語を整理</h2>
            <dl className="fairness-final-terms">
              {fairnessTerms.map((t) => (
                <div key={t.name}>
                  <dt>{t.name}</dt>
                  <dd>{t.definition}</dd>
                </div>
              ))}
              <div>
                <dt>公平性・AI倫理</dt>
                <dd>
                  人への不当な不利益を避けるため、機会や影響を複数の視点で考える。工場の照明対策とは別に検討が必要です。
                </dd>
              </div>
            </dl>
            <p>
              演習と深掘りは任意です。ここで終えても、第4話の完了を記録します。
            </p>
            <div className="episode-end-actions">
              <button className="primary" onClick={onFinish}>
                ここで終える
              </button>
              <button onClick={() => onMove("quiz")}>
                G検定の問題で確認する
              </button>
              <button onClick={() => onMove("details")}>
                もっと詳しく学ぶ
              </button>
            </div>
            <aside className="notice">
              <h2>次は、写真を見分ける仕組みへ</h2>
              <p>
                動物保護施設で、ディープラーニングの入口を体験します。自動では移動しません。
              </p>
              <button onClick={onNext}>
                第5話へ：AIはどうやって猫と犬を見分けるの？
              </button>
            </aside>
            {p.completed && (
              <p className="notice">L006を最後まで学習した記録があります。</p>
            )}
          </>
        )}
        {p.stage === "quiz" && (
          <>
            <p>
              第4話の場面に結び付いたオリジナル4問です。公式試験問題ではありません。回答せずにまとめへ戻れます。
            </p>
            <Quiz
              key={p.sessionId}
              index={p.questionIndex}
              attempts={attempts}
              sessionId={p.sessionId}
              onAnswer={onAnswer}
              onIndex={onIndex}
              busy={busy}
              items={fairnessQuestions}
              relatedLabel="データの偏り・利用条件・条件別評価・公平性と人の確認"
              sourceLabel="本アプリ第4話と末尾の参照資料"
            />
            <button className="story-action" onClick={() => onMove("ending")}>
              第4話のまとめへ戻る
            </button>
          </>
        )}
        {p.stage === "details" && (
          <>
            <p>
              気になる項目だけ開けます。やさしい説明→具体例→詳しい説明の順です。
            </p>
            {fairnessDeepDives.map((item) => (
              <DeepDive key={item.id} item={item} />
            ))}
            <ModelDetails />
            <section className="fairness-sources">
              <h2>出典と公式シラバスとの対応</h2>
              <ul>
                {fairnessSyllabus.map((s) => (
                  <li key={s.id}>
                    {s.section}：{s.item}
                  </li>
                ))}
              </ul>
              <p>
                公式ページ掲載項目を2026年11月21日に確認した、独自の入門教材です。G検定の全範囲を網羅するものではありません。
              </p>
              <ul>
                {fairnessSources.map((s) => (
                  <li key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title} ↗（オンライン）
                    </a>
                    <p>
                      {s.supports} · 確認日 {s.checkedAt}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <button
              className="primary story-action"
              onClick={() => onMove("ending")}
            >
              第4話のまとめへ戻る
            </button>
          </>
        )}
      </section>
      {storyIndex > 0 && (
        <button
          className="evaluation-back"
          onClick={() => onMove(fairnessStoryStages[storyIndex - 1])}
        >
          ← 前の場面へ
        </button>
      )}
    </div>
  );
}
