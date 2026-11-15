import { useEffect, useRef } from "react";
import type { GeneralizationProgress } from "../types";
import {
  practiceBoxes,
  freshBoxes,
  generalizationStages,
  generalizationTitles,
} from "../data/generalization";
import { trainRules, evaluateBoxes } from "../engine/generalization";
const learned = trainRules(practiceBoxes);
const pb = evaluateBoxes(learned.basic, practiceBoxes),
  pr = evaluateBoxes(learned.refined, practiceBoxes);
const nb = evaluateBoxes(learned.basic, freshBoxes),
  nr = evaluateBoxes(learned.refined, freshBoxes);
type Result = typeof pb;
function Inspector({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="inspector-line">
      <span>検査員</span>
      <p>「{children}」</p>
    </blockquote>
  );
}
function Picture({ fresh = false }: { fresh?: boolean }) {
  return (
    <figure className="generalization-picture">
      <img
        width="1536"
        height="1024"
        src={`${import.meta.env.BASE_URL}illustrations/l005/${fresh ? "fresh-boxes" : "practice-inspection"}.png`}
        alt={
          fresh
            ? "同じ検査員の前へ、離れて並ぶ別々の新着箱がコンベアで届く。箱には同じ形の札が付いている。"
            : "深緑の帽子の検査員が、外からへこみの見えない箱と、手元の検査記録を見比べている。"
        }
      />
      <figcaption>
        {fresh
          ? "新着の箱。練習に使った箱そのものではありません。"
          : "練習箱 P02 · ロットB · へこみ段階0。人の検査では不良でした。"}
      </figcaption>
    </figure>
  );
}
function Score({ result }: { result: Result }) {
  return (
    <strong>
      {result.correct}/{result.total}
      <small> 箱で正解</small>
    </strong>
  );
}
function Comparison({ fresh = false }: { fresh?: boolean }) {
  return (
    <table className="evaluation-comparison generalization-scores">
      <caption>どの箱で確かめたかを分けて比較</caption>
      <thead>
        <tr>
          <th scope="col">確かめる箱</th>
          <th scope="col">へこみだけ</th>
          <th scope="col">細かくした判定</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">練習用{pb.total}箱</th>
          <td>
            <Score result={pb} />
          </td>
          <td>
            <Score result={pr} />
          </td>
        </tr>
        {fresh && (
          <tr>
            <th scope="row">初めて見る{nb.total}箱</th>
            <td>
              <Score result={nb} />
            </td>
            <td>
              <Score result={nr} />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
function BoxResults({ result }: { result: Result }) {
  return (
    <ul className="generalization-boxes">
      {result.rows.map((r) => (
        <li
          key={r.id}
          className={r.actual === r.predicted ? "matched" : "mismatch"}
          data-box-id={r.id}
        >
          <strong>
            箱{r.id} {r.actual === r.predicted ? "✓ 一致" : "! 不一致"}
          </strong>
          <span>
            ロット{r.lot} · へこみ段階{r.dent}
          </span>
          <span>
            実際は{r.actual}／判定は{r.predicted}
          </span>
        </li>
      ))}
    </ul>
  );
}
export function GeneralizationEpisode({
  progress: p,
  onMove,
  onPrediction,
  onFinish,
  onGuide,
}: {
  progress: GeneralizationProgress;
  onMove: (stage: GeneralizationProgress["stage"]) => void;
  onPrediction: (value: GeneralizationProgress["prediction"]) => void;
  onFinish: () => void;
  onGuide: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [p.stage]);
  return (
    <div
      className="lesson-wrap story-intro generalization-lesson"
      data-lesson="L005"
    >
      <button className="guide-link" onClick={onGuide}>
        第0章で用語を確認
      </button>
      <p className="eyebrow">第3話 · L005 どの箱で確かめるか</p>
      <h1 ref={heading} tabIndex={-1}>
        {generalizationTitles[p.stage]}
      </h1>
      <section className="card scene-body">
        {p.stage === "intro" && (
          <>
            <p>
              工場の検査ライン。箱のへこみを手がかりに、良品と不良を分ける判定を試しています。
            </p>
            <Picture />
            <Inspector>
              練習で外した1箱も、正しく判定できるようにしたいんだ。まずは、練習用の
              {pb.total}箱を見てみよう
            </Inspector>
            <p>
              箱はすべて人が検査済み。その答えと比べながら、練習用の箱で判定ルールを作ります。へこみ段階は、外から見たへこみの大きさを表す教材用の数字です。
            </p>
            <button
              className="primary story-action"
              onClick={() => onMove("practice")}
            >
              へこみだけを見る判定を試す
            </button>
          </>
        )}
        {p.stage === "practice" && (
          <>
            <div className="generalization-headline">
              <span>練習用{pb.total}箱 · へこみだけを見る判定</span>
              <Score result={pb} />
            </div>
            <p>外から見たへこみをもとに判定しました。</p>
            <div className="evaluation-verdicts">
              {pb.missed.map((r) => (
                <div key={r.id}>
                  <strong>
                    箱{r.id} · ロット{r.lot} · へこみ段階{r.dent}
                  </strong>
                  <p>
                    実際は{r.actual}／判定は{r.predicted} · 見逃し
                  </p>
                </div>
              ))}
            </div>
            <Inspector>
              この箱は、外からへこみが見えなかった。練習で外した箱のロット番号も見て、判定を細かくしてみよう
            </Inspector>
            <button
              className="primary story-action"
              onClick={() => onMove("refined")}
            >
              ロット番号も見て判定を細かくする
            </button>
            <details className="episode-details">
              <summary>練習用の箱を詳しく見る</summary>
              <BoxResults result={pb} />
            </details>
          </>
        )}
        {p.stage === "refined" && (
          <>
            <Comparison />
            <p>練習で外した箱の特徴にだけ、例外を加えました。</p>
            <ul>
              {learned.refined.exceptions.map((e) => (
                <li key={`${e.lot}-${e.dent}`}>
                  ロット{e.lot} かつ へこみ段階{e.dent}なら「{e.actual}」
                </li>
              ))}
            </ul>
            <Inspector>
              これで練習の箱は全部合ったね。では、初めて見る箱でも確かめよう
            </Inspector>
            <p>
              次の{nb.total}
              箱は、ルール作りに使っていません。両方の判定を、同じ新着箱で比べます。
            </p>
            <fieldset className="generalization-prediction">
              <legend>どちらがうまくいくと思う？（任意）</legend>
              <p>選ばなくても進めます。正解確認のクイズではありません。</p>
              {(
                [
                  ["basic", "へこみだけを見る判定"],
                  ["refined", "細かくした判定"],
                  ["same", "同じくらい"],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="L005-prediction"
                    checked={p.prediction === value}
                    onChange={() => onPrediction(value)}
                  />
                  {label}
                </label>
              ))}
              {p.prediction !== null && (
                <button onClick={() => onPrediction(null)}>
                  予想を取り消す
                </button>
              )}
            </fieldset>
            <button
              className="primary story-action"
              onClick={() => onMove("comparison")}
            >
              新しく届いた8箱で試す
            </button>
          </>
        )}
        {p.stage === "comparison" && (
          <>
            <Comparison fresh />
            <Picture fresh />
            <p className="generalization-reason">
              練習中にたまたま当てはまった例外が、新しい箱にも当てはまるとは限りませんでした。
            </p>
            <h2>細かくした判定が止めた、良品{nr.overstopped.length}箱</h2>
            <div className="generalization-mistakes">
              {nr.overstopped.map((r) => (
                <article key={r.id} data-box-id={r.id}>
                  <strong>箱{r.id}</strong>
                  <span>
                    ロット{r.lot} · へこみ段階{r.dent}
                  </span>
                  <p>
                    実際は{r.actual}／判定は{r.predicted}
                  </p>
                  <span>! 良品の止めすぎ</span>
                </article>
              ))}
            </div>
            <Inspector>
              練習で使った箱とは別の箱だよ。同じロットでも、この
              {nr.overstopped.length}
              箱は良品だった。練習の成績だけでは、気づけなかったね
            </Inspector>
            <details className="episode-details">
              <summary>なぜ逆転したのか、詳しく見る</summary>
              <p>
                箱P02を直すために加えた例外は、同じ特徴を持つ新着箱にも適用されました。ロットとへこみ段階が同じでも、実際の状態まで同じとは限りません。新着箱の答えは、ルールを決めるときには使っていません。
              </p>
              <BoxResults result={nr} />
            </details>
            <button
              className="primary story-action"
              onClick={() => onMove("ending")}
            >
              どの箱で確かめるか振り返る
            </button>
          </>
        )}
        {p.stage === "ending" && (
          <>
            <Inspector>
              第2話では「何を数えるか」。今回は「どの箱で確かめるか」だったね。練習用と、まだ見ていない箱の成績を分けて確認しよう
            </Inspector>
            <Comparison fresh />
            <section className="evaluation-terms">
              <h2>体験したことの名前</h2>
              <article>
                <h3>過学習</h3>
                <p>
                  練習用データに合わせすぎて、初めて見るデータでうまくいかなくなること。
                </p>
              </article>
              <article>
                <h3>汎化</h3>
                <p>初めて見るデータでも、学んだことが通用すること。</p>
              </article>
            </section>
            <p>
              ルール作りに使った箱だけで確かめると、その箱に合わせた例外までうまく見えてしまいます。練習用と評価用を分け、まだ見ていない箱で確かめることが大切です。
            </p>
            <p>
              細かい判定が常に悪いわけではありません。また、この新着{nb.total}
              箱で満点でも、ほかの箱での性能が保証されたわけではありません。どの箱をどれだけ確かめたかにも目を向けましょう。
            </p>
            <details className="episode-details">
              <summary>仕組みを詳しく見る</summary>
              <p>
                練習用データだけで、へこみ段階のしきい値0〜4を比較。しきい値以上を不良とする判定で、正解数が最大の
                {learned.basic.threshold}
                を採用しました。同点なら小さい値を選びます。
              </p>
              <ul>
                {learned.trials.map((t) => (
                  <li key={t.threshold}>
                    しきい値{t.threshold}：{t.correct}/{t.total}箱で正解
                  </li>
                ))}
              </ul>
              <p>
                基本の判定が外した練習箱の「ロット＋へこみ段階」にだけ、検査結果を例外として加えました。新着用データでしきい値や例外を調整する処理はありません。
              </p>
              <h3>初めて見る箱 · へこみだけの判定</h3>
              <BoxResults result={nb} />
            </details>
            <button className="primary story-action" onClick={onFinish}>
              ここで終える
            </button>
            {p.completed && (
              <p className="notice">L005を最後まで学習した記録があります。</p>
            )}
          </>
        )}
      </section>
      {p.stage !== "intro" && (
        <button
          className="evaluation-back"
          onClick={() =>
            onMove(
              generalizationStages[generalizationStages.indexOf(p.stage) - 1],
            )
          }
        >
          ← 前の場面へ
        </button>
      )}
    </div>
  );
}
