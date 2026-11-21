import { useEffect, useRef, useState } from "react";
import type { DeepLearningProgress, QuestionAttempt } from "../types";
import {
  animals,
  deepConcepts,
  deepDives,
  deepQuestions,
  deepSources,
  deepStoryStages,
  deepTitles,
  networkExplanations,
  networkLabels,
  pixelSource,
} from "../data/deepLearning";
import {
  convolve3x3,
  fixedFilters,
  grayscale,
  pixelAt,
} from "../engine/deepLearning";
import { Quiz } from "./Learning";
const base = import.meta.env.BASE_URL;
function Picture({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="deep-picture">
      <img
        src={`${base}illustrations/l007/${name}.png`}
        alt={alt}
        width={name === "cat-pixel-source" ? 1254 : 1536}
        height={name === "cat-pixel-source" ? 1254 : 1024}
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
export function PhotoTile({
  animal,
  onClick,
  selected,
}: {
  animal: number;
  onClick?: () => void;
  selected?: boolean;
}) {
  const a = animals[animal];
  const content = (
    <>
      <span className="animal-crop">
        <img
          src={`${base}illustrations/l007/${a.file}.png`}
          alt={a.name}
          style={{
            width: `${a.count * 100}%`,
            maxWidth: "none",
            left: `-${a.index * 100}%`,
          }}
        />
      </span>
      <strong>{a.name}</strong>
    </>
  );
  return onClick ? (
    <button className="animal-tile" aria-pressed={selected} onClick={onClick}>
      {content}
      <span>見た目の手がかりを見る</span>
    </button>
  ) : (
    <figure className="animal-tile">{content}</figure>
  );
}
// Same-origin PNG -> actual RGBA values, resampled once for a readable 32x32 teaching image.
export function useCatPixels(size: number) {
  const [data, setData] = useState<Uint8ClampedArray | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw Error("canvas");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, size, size);
        const rgba = ctx.getImageData(0, 0, size, size).data;
        if (!disposed) setData(rgba);
      } catch {
        if (!disposed) setError(true);
      }
    };
    img.onerror = () => {
      if (!disposed) setError(true);
    };
    img.src = base + pixelSource;
    return () => {
      disposed = true;
    };
  }, [size]);
  return { data, error };
}
function PixelExplorer({
  p,
  change,
}: {
  p: DeepLearningProgress;
  change: (v: Partial<DeepLearningProgress>) => void;
}) {
  const { data, error } = useCatPixels(32),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!data || !canvas.current) return;
    const ctx = canvas.current.getContext("2d")!;
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), 32, 32), 0, 0);
  }, [data, p.pixelExpanded]);
  const color = data ? pixelAt(data, 32, p.pixelX, p.pixelY) : null;
  function select(x: number, y: number) {
    change({
      pixelX: Math.max(0, Math.min(31, x)),
      pixelY: Math.max(0, Math.min(31, y)),
    });
  }
  return (
    <div className="pixel-explorer">
      {!p.pixelExpanded ? (
        <>
          <Picture
            name="cat-pixel-source"
            alt="画素を観察するための、正面を向いた茶トラ猫の絵"
          />
          <button
            className="primary story-action"
            disabled={!data}
            onClick={() => change({ pixelExpanded: true })}
          >
            拡大する
          </button>
        </>
      ) : (
        <>
          <p>
            同じ猫の画像を32×32に縮小し、一つひとつの画素を大きく表示しています。四角をタップすると、その場所の色が分かります。
          </p>
          <div className="pixel-canvas-wrap">
            <canvas
              ref={canvas}
              width={32}
              height={32}
              tabIndex={0}
              role="img"
              aria-label="猫の実画像から作った32×32の画素。タップまたは矢印キーで色を選べます"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                select(
                  Math.floor(((e.clientX - r.left) / r.width) * 32),
                  Math.floor(((e.clientY - r.top) / r.height) * 32),
                );
              }}
              onKeyDown={(e) => {
                const d: Record<string, number[]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                };
                if (d[e.key]) {
                  e.preventDefault();
                  select(p.pixelX + d[e.key][0], p.pixelY + d[e.key][1]);
                }
              }}
            />
            <span
              className="pixel-marker"
              aria-hidden="true"
              style={{
                left: `${(p.pixelX / 32) * 100}%`,
                top: `${(p.pixelY / 32) * 100}%`,
              }}
            />
          </div>
          <div className="pixel-controls" aria-label="選ぶ画素を移動">
            {(
              [
                ["左", -1, 0],
                ["上", 0, -1],
                ["下", 0, 1],
                ["右", 1, 0],
              ] as const
            ).map(([name, x, y]) => (
              <button
                key={name}
                onClick={() => select(p.pixelX + x, p.pixelY + y)}
              >
                {name}
              </button>
            ))}
          </div>
          {color && (
            <div className="pixel-color" aria-live="polite">
              <span
                className="color-swatch"
                style={{ background: `rgb(${color.join(",")})` }}
              />
              <p>
                選んだ画素の色です。位置や明るさの違いも、数値として扱えます。
              </p>
            </div>
          )}
          <p>
            写真はたくさんの小さな画素からできています。コンピューターは、画像の色や明るさなどを数値として扱うことができます。
          </p>
          <details className="episode-details pixel-values">
            <summary>画素の数値を詳しく見る（暗記は不要）</summary>
            {color && (
              <p data-testid="pixel-rgb">
                位置 ({p.pixelX}, {p.pixelY}) · 赤 R {color[0]} / 緑 G{" "}
                {color[1]} / 青 B {color[2]}
              </p>
            )}
            <p>
              元のPNGをブラウザのCanvasで32×32に縮小し、その実データを読み取っています。架空の色を並べた図ではありません。ここでは各色を0〜255で表します。
            </p>
          </details>
        </>
      )}
      {error && (
        <p role="alert">
          画像の色情報を読み込めませんでした。ページを再読み込みしてください。
        </p>
      )}
    </div>
  );
}
function Network({
  step,
  change,
  suspended,
}: {
  step: number;
  change: (step: number) => void;
  suspended: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const current = useRef(step),
    changeRef = useRef(change);
  current.current = step;
  changeRef.current = change;
  useEffect(() => {
    if (suspended || step === 4) setPlaying(false);
  }, [suspended, step]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    if (!playing || suspended) return;
    const t = setInterval(
      () => changeRef.current(Math.min(4, current.current + 1)),
      1600,
    );
    return () => clearInterval(t);
  }, [playing, suspended]);
  return (
    <div
      className={`network-demo ${playing ? "playing" : ""}`}
      data-step={step}
    >
      <p className="notice">
        理解のための模式図です。実際の画像認識モデルを動かしたり、学習したりしているわけではありません。
      </p>
      <ol className="network-flow">
        {networkLabels.map((label, i) => (
          <li
            key={label}
            className={i <= step ? "reached" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <strong>{label}</strong>
            {i === 0 ? (
              <img
                src={base + pixelSource}
                width={64}
                height={64}
                alt="入力の例となる猫の絵"
              />
            ) : (
              <span className="network-nodes" aria-hidden="true">
                {Array.from({ length: i === 4 ? 2 : 4 }, (_, n) => (
                  <i key={n} />
                ))}
              </span>
            )}
            {i < 4 && (
              <span className="network-connection" aria-hidden="true">
                ↓<i />
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="network-position" aria-live="polite">
        いま：{networkLabels[step]}
        <br />
        {networkExplanations[step]}
      </p>
      <div className="controls">
        {step < 4 && (
          <button
            className="primary"
            onClick={() => {
              setPlaying(false);
              change(step + 1);
            }}
          >
            1ステップ進む
          </button>
        )}
        <button
          onClick={() => {
            if (step === 4) change(0);
            setPlaying(!playing);
          }}
        >
          {playing ? "一時停止" : "自動で流れを見る"}
        </button>
        {step > 0 && (
          <button
            onClick={() => {
              setPlaying(false);
              change(0);
            }}
          >
            図を初めに戻す
          </button>
        )}
      </div>
      <p className="muted">
        {playing
          ? "自動表示中。一時停止できます。"
          : "停止中。1ステップずつ操作できます。"}{" "}
        動きの少ない表示設定にも対応します。
      </p>
    </div>
  );
}
function Flow({ mode }: { mode: "training" | "inference" }) {
  const train = mode === "training";
  return (
    <section className="deep-training-flow" data-mode={mode}>
      <h2>
        {train
          ? "学習時：写真と正解で調整する"
          : "利用時：新しい写真を予測する"}
      </h2>
      <ol className="deep-flow-diagram">
        <li>
          {train
            ? "写真 ＋ 正解ラベル「猫」「犬」"
            : "まだ見ていない新しい写真"}
        </li>
        <li>{train ? "予測と正解のずれを確かめる" : "学習済みモデルを使う"}</li>
        <li>
          {train ? "重みなどを調整する（繰り返す）" : "猫・犬などを予測する"}
        </li>
        <li>
          {train ? "判定に役立つ表現も学ばれる" : "予測を人が最終確認する"}
        </li>
      </ol>
      <p>
        {train
          ? "写真の数値から役立つ表現を作れるように、モデル内部の値を調整します。"
          : "この図の利用時には、正解ラベルをモデルの入力として渡していません。新しい写真で性能も確かめます。"}
      </p>
    </section>
  );
}
function FilterDemo() {
  const { data, error } = useCatPixels(8),
    [filter, setFilter] = useState<keyof typeof fixedFilters>("edge");
  const input = data ? grayscale(data) : [],
    output = data ? convolve3x3(input, 8, fixedFilters[filter]) : [];
  function grid(values: number[], width: number, label: string) {
    const max = Math.max(1, ...values.map(Math.abs));
    return (
      <figure className="filter-matrix">
        <figcaption>{label}</figcaption>
        <div style={{ gridTemplateColumns: `repeat(${width},minmax(0,1fr))` }}>
          {values.map((v, i) => (
            <span
              key={i}
              title={String(v)}
              aria-label={`値 ${Number(v.toFixed(3))}`}
              style={{
                background: `rgb(${Array(3)
                  .fill(Math.round((v < 0 ? 0 : Math.abs(v) / max) * 255))
                  .join(",")})`,
                color: v / max > 0.55 ? "#111" : "#fff",
              }}
            >
              {width === 3 ? Number(v.toFixed(2)) : ""}
            </span>
          ))}
        </div>
      </figure>
    );
  }
  return (
    <section className="filter-demo">
      <h4>実計算：固定フィルタを動かす</h4>
      <label htmlFor="l007-fixed-filter">固定フィルタ</label>
      <select
        id="l007-fixed-filter"
        value={filter}
        onChange={(e) => setFilter(e.target.value as keyof typeof fixedFilters)}
      >
        <option value="edge">左右の変化を見る</option>
        <option value="average">周りを平均する</option>
      </select>
      <p>
        猫のPNGから8×8の明るさを読み取ります。枠内の値と固定フィルタの値を掛けて足し、位置を1つずつ動かします。数字は四捨五入した表示です。
      </p>
      {data && (
        <>
          {grid(input, 8, "入力：同じ猫の画像の明るさ（8×8）")}
          {grid(
            fixedFilters[filter] as readonly number[] as number[],
            3,
            "固定フィルタ（3×3）",
          )}
          {grid(output, 6, "出力（6×6）")}
          <details className="filter-numbers">
            <summary>入力と出力の数値を読む</summary>
            {[
              [input, 8, "入力"],
              [output, 6, "出力"],
            ].map(([values, width, name]) => (
              <section key={String(name)}>
                <h4>{String(name)}</h4>
                {Array.from(
                  { length: (values as number[]).length / (width as number) },
                  (_, row) => (
                    <p key={row}>
                      {row + 1}行目：
                      {(values as number[])
                        .slice(
                          row * (width as number),
                          (row + 1) * (width as number),
                        )
                        .map((v) => Number(v.toFixed(2)))
                        .join(" / ")}
                    </p>
                  ),
                )}
              </section>
            ))}
          </details>
          <p data-testid="filter-first">
            左上の計算結果：{Number(output[0].toFixed(3))}
          </p>
          <details>
            <summary>最初の位置の計算を詳しく見る</summary>
            <p>
              {fixedFilters[filter]
                .map(
                  (w, k) =>
                    `${input[Math.floor(k / 3) * 8 + (k % 3)]} × ${Number(w.toFixed(3))}`,
                )
                .join(" ＋ ")}{" "}
              = {Number(output[0].toFixed(3))}
            </p>
          </details>
        </>
      )}
      <p className="notice">
        固定値による実計算です。学習されたフィルタでも猫・犬の分類器でもありません。出力の明るさは見やすいよう正規化し、負の値は黒で表示しています。数値一覧で色に頼らず値と符号を確認できます。
      </p>
      {error && <p role="alert">計算用の画像を読み込めませんでした。</p>}
    </section>
  );
}
function DeepDive({ item }: { item: (typeof deepDives)[number] }) {
  const ref = useRef<HTMLDetailsElement>(null),
    position = useRef(0);
  return (
    <details className="episode-details deep-dive" ref={ref}>
      <summary
        onClick={() => {
          if (!ref.current?.open) position.current = window.scrollY;
        }}
      >
        {item.id.slice(-3)}：{item.title}
      </summary>
      <h3>やさしい説明</h3>
      <p>{item.easy}</p>
      <h3>具体例</h3>
      <p>{item.example}</p>
      <h3>図解</h3>
      <p className="muted">理解のための模式図</p>
      <ol className="deep-flow-diagram">
        {item.diagram.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ol>
      <h3>もう少し詳しい技術説明</h3>
      <p>{item.detail}</p>
      {item.id === "L007-D05" && <FilterDemo />}
      <h3>関連知識と出典</h3>
      <p>
        {item.conceptIds
          .map((id) => `${id} · ${deepConcepts.find((c) => c.id === id)!.name}`)
          .join(" ／ ")}
      </p>
      <ul>
        {item.sourceIds.map((id) => {
          const s = deepSources.find((s) => s.id === id)!;
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
          ref.current!.open = false;
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
export function DeepLearningEpisode({
  progress: p,
  attempts,
  onChange,
  onMove,
  onAnswer,
  onFinish,
  onGuide,
  busy,
  suspended,
}: {
  progress: DeepLearningProgress;
  attempts: QuestionAttempt[];
  onChange: (v: Partial<DeepLearningProgress>) => void;
  onMove: (s: DeepLearningProgress["stage"]) => void;
  onAnswer: (choice: number) => void;
  onFinish: () => void;
  onGuide: (e: React.MouseEvent<HTMLButtonElement>) => void;
  busy: boolean;
  suspended: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [p.stage]);
  const index = deepStoryStages.indexOf(
    p.stage as (typeof deepStoryStages)[number],
  );
  const next = (stage: DeepLearningProgress["stage"], text: string) => (
    <button className="primary story-action" onClick={() => onMove(stage)}>
      {text}
    </button>
  );
  return (
    <div className="lesson-wrap story-intro deep-lesson" data-lesson="L007">
      <button className="guide-link" onClick={onGuide}>
        第0章で用語を確認
      </button>
      <p className="eyebrow">
        ディープラーニング編 · 第5話 · L007 ·{" "}
        {index >= 0 ? `${index + 1} / 7 場面` : "任意の振り返り"}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {deepTitles[p.stage]}
      </h1>
      <section className="card scene-body">
        {p.stage === "intro" && (
          <>
            <Picture
              name="shelter-welcome"
              alt="動物保護施設で、猫と犬の写真が並ぶパソコンに向かい困っているスタッフ"
            />
            <p>
              今日は動物保護施設で、写真整理を手伝います。写真が増え、猫と犬を分けるのにも時間がかかっています。
            </p>
            <Staff>
              保護した動物の写真がずいぶん増えたんだ。猫と犬の写真を分けるだけでも大変でね。AIに手伝ってもらえないかな？
            </Staff>
            <p>
              AIの予測には誤りもあるため、最終確認は人が行うことにしました。まず、写真を見てみましょう。
            </p>
            {next("photos", "写真を見てみる")}
          </>
        )}
        {p.stage === "photos" && (
          <>
            <p>
              写真をタップして、見た目の手がかりを見てみましょう。正解を選ぶクイズではありません。
            </p>
            <div className="animal-grid">
              {animals.slice(0, 2).map((_, i) => (
                <PhotoTile
                  key={i}
                  animal={i}
                  selected={p.animal === i}
                  onClick={() => onChange({ animal: i })}
                />
              ))}
            </div>
            {p.examplesShown && (
              <>
                <h2>ほかの写真では、どうだろう？</h2>
                <div className="animal-grid varied">
                  {animals.slice(2).map((_, i) => (
                    <PhotoTile
                      key={i}
                      animal={i + 2}
                      selected={p.animal === i + 2}
                      onClick={() => onChange({ animal: i + 2 })}
                    />
                  ))}
                </div>
                <Staff>
                  耳だけで分けようと思ったけど、それだけじゃ難しいみたいだね
                </Staff>
              </>
            )}
            {p.animal !== null && (
              <div className="animal-clue" aria-live="polite">
                <h3>{animals[p.animal].name}の見た目</h3>
                <p>{animals[p.animal].clue}</p>
              </div>
            )}
            {p.examplesShown && (
              <p>
                複数の手がかりを組み合わせて見ることがあります。ただし、すべての猫と犬を必ず分けられる決まった見た目を示したものではありません。
              </p>
            )}
            {!p.examplesShown ? (
              <button
                className="primary story-action"
                onClick={() => onChange({ examplesShown: true })}
              >
                ほかの写真も見てみる
              </button>
            ) : (
              <button
                className="primary story-action"
                disabled={p.animal === null}
                onClick={() => onMove("pixels")}
              >
                AIには写真がどう見えている？
              </button>
            )}
            {p.examplesShown && p.animal === null && (
              <p>
                気になる写真を1枚タップすると進めます。回答の採点はありません。
              </p>
            )}
          </>
        )}
        {p.stage === "pixels" && (
          <>
            <PixelExplorer p={p} change={onChange} />
            {p.pixelExpanded && next("layers", "写真の情報が進む先を見る")}
          </>
        )}
        {p.stage === "layers" && (
          <>
            <Network
              step={p.networkStep}
              change={(networkStep) => onChange({ networkStep })}
              suspended={suspended}
            />
            {p.networkStep === 4 && (
              <>
                <h2>この仕組みの名前</h2>
                <p>
                  数値を層から層へ渡して処理する仕組みを、ニューラルネットワークと呼びます。
                </p>
                <p>
                  複数の中間層を持つニューラルネットワークを学習させる方法が、ディープラーニングです。機械学習の一種です。
                </p>
                <p>
                  脳の神経細胞と完全に同じ仕組みではありません。層が多ければ必ず良くなるわけでもありません。
                </p>
                {next("training", "どうやって特徴を学ぶの？")}
              </>
            )}
          </>
        )}
        {p.stage === "training" && (
          <>
            <p>
              工場編では、人が確認した「良品」「不良」という答え付きの見本を使いました。今回は写真に「猫」「犬」の正解ラベルを付けた例です。
            </p>
            <div className="controls flow-switch" aria-label="段階を切り替える">
              {(["training", "inference"] as const).map((mode) => (
                <button
                  key={mode}
                  aria-pressed={p.flow === mode}
                  onClick={() => onChange({ flow: mode })}
                >
                  {mode === "training" ? "学習時の流れ" : "利用時の流れ"}
                </button>
              ))}
            </div>
            <Flow mode={p.flow} />
            <p>
              ディープラーニングでは、学習によって判定に役立つ特徴の表現も獲得できます。従来の機械学習にも、特徴を自動で学ぶ方法はあります。
            </p>
            <p className="notice">
              この場面は概念デモです。アプリ内でモデルの訓練や猫・犬の推論を実行していません。
            </p>
            {next("uses", "写真以外の使い道も見る")}
          </>
        )}
        {p.stage === "uses" && (
          <>
            <div className="deep-uses">
              {[
                ["画像認識", "写真に何が写っているかを予測する"],
                ["音声認識", "話した音声を文字にする"],
                ["文章処理", "文章の分類や意味の処理に使う"],
                [
                  "画像や文章の生成",
                  "学習したパターンをもとに新しい内容を作る",
                ],
              ].map(([name, desc], i) => (
                <article key={name}>
                  <span className="application-crop">
                    <img
                      src={`${base}illustrations/l007/dl-applications.png`}
                      alt={
                        [
                          "猫を撮影するカメラと写真のモニター",
                          "マイクに話すスタッフと音声波形",
                          "本と文章を表示したモニター",
                          "ペンタブレットと生成物のイメージ",
                        ][i]
                      }
                      style={{ left: `-${i * 100}%` }}
                    />
                  </span>
                  <h2>{name}</h2>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
            <Staff>
              写真を見分けるだけじゃないんだね。音声や文章にも使われているのか
            </Staff>
            <p>
              すべての問題に最適な方法ではありません。大量のデータや計算資源が必要な場合もあり、誤認識や学習データの偏りにも注意が必要です。
            </p>
            {next("ending", "施設での体験をまとめる")}
          </>
        )}
        {p.stage === "ending" && (
          <>
            <Picture
              name="shelter-ending"
              alt="写真を手で確認しながら整理を続けるスタッフと、そばで休む猫と犬"
            />
            <Staff>
              写真を少し整理できたね。AIが写真を扱う仕組みも分かった。これから活用を考えるときも、予測は人が確かめながら進めよう
            </Staff>
            <p>
              この物語では、スタッフが仕組みを学び、人の手で写真を確認して作業を続けます。アプリ内でAIが自動分類を完了したわけではありません。
            </p>
            <ol className="deep-recap">
              <li>ディープラーニングは、機械学習の一種</li>
              <li>ニューラルネットワークは、層を通して数値を処理する</li>
              <li>学習によって、判定に役立つ特徴表現も獲得できる</li>
              <li>画像認識以外にも、音声・文章・生成などに使われる</li>
            </ol>
            <h2>G検定の言葉で振り返る</h2>
            <dl>
              {deepConcepts.map((c) => (
                <div key={c.id}>
                  <dt>
                    <strong>{c.name}</strong>
                  </dt>
                  <dd>{c.definition}</dd>
                </div>
              ))}
            </dl>
            <p>
              予測はいつも正しいとは限りません。使う状況で確かめ、人が確認できる運用も考えます。演習・深掘りを開かずに完了できます。
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
            {p.completed && (
              <p className="notice">L007を最後まで学習した記録があります。</p>
            )}
          </>
        )}
        {p.stage === "quiz" && (
          <>
            <p>
              第5話のオリジナル5問です。公式試験問題ではありません。答えずにまとめへ戻れます。
            </p>
            <Quiz
              key={p.sessionId}
              index={p.questionIndex}
              attempts={attempts}
              sessionId={p.sessionId}
              onAnswer={onAnswer}
              onIndex={(questionIndex) => onChange({ questionIndex })}
              busy={busy}
              items={deepQuestions}
              relatedLabel="L007-K01〜K05：包含関係・層・学習と推論・特徴表現・画素"
              sourceLabel="第5話の本編と深掘り末尾の出典"
            />
            {next("ending", "第5話のまとめへ戻る")}
          </>
        )}
        {p.stage === "details" && (
          <>
            <p>
              気になる項目だけ開けます。どれも、本編を完了するための条件ではありません。
            </p>
            {deepDives.map((item) => (
              <DeepDive key={item.id} item={item} />
            ))}
            <h2>出典とシラバスとの対応</h2>
            <p>
              「ディープラーニングの概要」のニューラルネットワーク・活性化関数・誤差逆伝播法、「要素技術」の畳み込み層、「応用例」の画像認識・自然言語処理への入門です。第5話だけで全範囲を網羅する教材ではありません。
            </p>
            <ul className="deep-sources">
              {deepSources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗（オンライン）
                  </a>
                  <p>
                    {s.id} · {s.supports} · 確認日 {s.checkedAt}
                  </p>
                </li>
              ))}
            </ul>
            {next("ending", "第5話のまとめへ戻る")}
          </>
        )}
      </section>
      {index > 0 && (
        <button
          className="evaluation-back"
          onClick={() => onMove(deepStoryStages[index - 1])}
        >
          ← 前の場面へ
        </button>
      )}
    </div>
  );
}
