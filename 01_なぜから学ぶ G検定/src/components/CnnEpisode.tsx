import { useEffect, useMemo, useRef, useState } from "react";
import type { CnnProgress, QuestionAttempt } from "../types";
import {
  cnnStages,
  cnnTitles,
  cnnFlow,
  cnnDives,
  cnnQuestions,
  cnnSources,
  filterLabels,
  filterNotes,
} from "../data/cnn";
import {
  kernels,
  rgbaToGray,
  pipeline,
  mapColors,
  windowTerms,
} from "../engine/cnn";
import { Quiz } from "./Learning";
const base = import.meta.env.BASE_URL;
const fmt = (n: number) => (Math.abs(n) < 1e-12 ? "0" : n.toFixed(4));
function Picture({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="cnn-picture">
      <img src={`${base}illustrations/l009/${name}.png`} alt={alt} />
      <figcaption className="muted">
        場面の挿絵です。正確な画素・計算結果は操作画面に表示します。
      </figcaption>
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
export function useCnnImage(image: CnnProgress["image"]) {
  const [loaded, setLoaded] = useState<{
      image: string;
      rgba: Uint8ClampedArray;
      gray: number[];
    } | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    const img = new Image();
    img.onload = () => {
      try {
        if (img.naturalWidth !== 16 || img.naturalHeight !== 16)
          throw Error("16×16画像が必要です");
        const c = document.createElement("canvas");
        c.width = c.height = 16;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw Error("Canvas");
        ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, 16, 16).data;
        if (active) setLoaded({ image, rgba, gray: rgbaToGray(rgba) });
      } catch {
        if (active) setError(true);
      }
    };
    img.onerror = () => {
      if (active) setError(true);
    };
    img.src = `${base}illustrations/l009/${image}-16.png`;
    return () => {
      active = false;
    };
  }, [image]);
  return { data: loaded?.image === image ? loaded : null, error };
}
type MapProps = {
  values: readonly number[];
  width: number;
  label: string;
  gray?: boolean;
  selected?: { x: number; y: number; size: number };
  onSelect?: (x: number, y: number) => void;
  testId?: string;
};
export function PixelMap({
  values,
  width,
  label,
  gray = false,
  selected,
  onSelect,
  testId,
}: MapProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const colors = gray
      ? values.map((v) => [v * 255, v * 255, v * 255])
      : mapColors(values);
    const rgba = new Uint8ClampedArray(values.length * 4);
    colors.forEach((rgb, i) => {
      rgba.set(rgb, i * 4);
      rgba[i * 4 + 3] = 255;
    });
    ctx.putImageData(new ImageData(rgba, width, values.length / width), 0, 0);
  }, [values, width, gray]);
  return (
    <figure className="cnn-map" data-testid={testId}>
      <figcaption>
        {label}（{width}×{values.length / width}）
      </figcaption>
      <div className="cnn-canvas-wrap">
        <canvas
          ref={ref}
          width={width}
          height={values.length / width}
          role="img"
          aria-label={label + "。枠の位置は下の文字でも確認できます"}
          tabIndex={onSelect ? 0 : undefined}
          onClick={(e) => {
            if (!onSelect) return;
            const r = e.currentTarget.getBoundingClientRect();
            onSelect(
              Math.min(
                width - 1,
                Math.floor(((e.clientX - r.left) / r.width) * width),
              ),
              Math.min(
                values.length / width - 1,
                Math.floor(
                  ((e.clientY - r.top) / r.height) * (values.length / width),
                ),
              ),
            );
          }}
          onKeyDown={(e) => {
            if (!onSelect || !selected) return;
            const delta: Record<string, number[]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            if (delta[e.key]) {
              e.preventDefault();
              onSelect(
                Math.max(0, Math.min(width - 1, selected.x + delta[e.key][0])),
                Math.max(
                  0,
                  Math.min(
                    values.length / width - 1,
                    selected.y + delta[e.key][1],
                  ),
                ),
              );
            }
          }}
        />
        {selected && (
          <span
            className="cnn-selection"
            aria-hidden="true"
            style={{
              left: `${(selected.x / width) * 100}%`,
              top: `${(selected.y / (values.length / width)) * 100}%`,
              width: `${(selected.size / width) * 100}%`,
              height: `${(selected.size / (values.length / width)) * 100}%`,
            }}
          />
        )}
      </div>
      {!gray && (
        <p className="cnn-legend">
          青＝負 ／ 白＝ゼロ ／
          茶＝正。色の濃さは表示用の変換で、生の値は変更しません。
        </p>
      )}
    </figure>
  );
}
function ImageChoice({
  p,
  change,
}: {
  p: CnnProgress;
  change: (v: Partial<CnnProgress>) => void;
}) {
  return (
    <div className="controls cnn-image-choice" aria-label="入力画像を選ぶ">
      {(["cat", "dog"] as const).map((image) => (
        <button
          key={image}
          aria-pressed={p.image === image}
          onClick={() => change({ image })}
        >
          {image === "cat" ? "猫の画像" : "犬の画像"}
        </button>
      ))}
    </div>
  );
}
function Coefficients({ filter }: { filter: CnnProgress["filter"] }) {
  return (
    <div className="cnn-nine" aria-label="フィルタの9係数">
      {kernels[filter].map((n, i) => (
        <span key={i}>{filter === "C" ? "1/9" : n}</span>
      ))}
    </div>
  );
}
function WindowLab({
  p,
  data,
  change,
  suspended,
  compact = false,
}: {
  p: CnnProgress;
  data: number[];
  change: (v: Partial<CnnProgress>) => void;
  suspended: boolean;
  compact?: boolean;
}) {
  const maps = useMemo(
      () => pipeline(data, kernels[p.filter]),
      [data, p.filter],
    ),
    x = p.position % 14,
    y = Math.floor(p.position / 14),
    terms = windowTerms(data, 16, x, y, kernels[p.filter]),
    sum = terms.reduce((s, t) => s + t.product, 0);
  const [playing, setPlaying] = useState(false),
    [reduced, setReduced] = useState(false),
    latest = useRef(p.position),
    callback = useRef(change);
  latest.current = p.position;
  callback.current = change;
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(q.matches);
      if (q.matches) setPlaying(false);
    };
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (suspended || p.position === 195) setPlaying(false);
  }, [suspended, p.position]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    if (!playing || suspended) return;
    const id = setInterval(
      () => callback.current({ position: Math.min(195, latest.current + 1) }),
      650,
    );
    return () => clearInterval(id);
  }, [playing, suspended]);
  function position(n: number) {
    setPlaying(false);
    change({ position: Math.max(0, Math.min(195, n)) });
  }
  return (
    <section className="cnn-window-lab" data-position={p.position}>
      <p>
        小さな範囲を順番に調べます。枠をタップするか、前へ／次へで動かしてみましょう。
      </p>
      <PixelMap
        values={data}
        width={16}
        label="明るさの入力と3×3の枠"
        gray
        selected={{ x, y, size: 3 }}
        onSelect={(x, y) => position(Math.min(13, x) + Math.min(13, y) * 14)}
        testId="cnn-input"
      />
      <div className="controls">
        <button
          disabled={p.position === 0}
          onClick={() => position(p.position - 1)}
        >
          前へ
        </button>
        <button
          disabled={p.position === 195}
          onClick={() => position(p.position + 1)}
        >
          次へ
        </button>
        {!compact && (
          <button
            disabled={reduced}
            onClick={() => {
              if (p.position === 195) change({ position: 0 });
              setPlaying(!playing);
            }}
          >
            {playing ? "一時停止" : "自動で枠を動かす"}
          </button>
        )}
      </div>
      {!compact && (
        <p className="muted">
          {playing
            ? "自動表示中。いつでも一時停止できます。"
            : "停止中。手動で1位置ずつ動かせます。"}
          {reduced && " 動きを減らす設定のため、自動表示を省略しています。"}
        </p>
      )}
      <p aria-live="polite" data-testid="cnn-position">
        入力の左上：{y + 1}行 {x + 1}列 ／ 出力：{y + 1}行 {x + 1}列
      </p>
      <div className="cnn-window-numbers">
        <section>
          <h3>選んだ9画素の明るさ</h3>
          <div className="cnn-nine">
            {terms.map((t, i) => (
              <span key={i}>{t.value.toFixed(3)}</span>
            ))}
          </div>
        </section>
        <section>
          <h3>フィルタの9係数</h3>
          <Coefficients filter={p.filter} />
        </section>
      </div>
      <p className="cnn-result" data-testid="cnn-result" data-value={sum}>
        この範囲の出力：<strong>{fmt(sum)}</strong>（
        {sum < 0 ? "負" : sum > 0 ? "正" : "ゼロ"}）
      </p>
      <button
        aria-expanded={p.mathOpen}
        onClick={() => change({ mathOpen: !p.mathOpen })}
      >
        {p.mathOpen ? "計算の中身を閉じる" : "計算の中身を見る"}
      </button>
      {p.mathOpen && (
        <div className="cnn-products">
          <p>
            表示の数値は丸めています。元の値で掛け算と合計を計算しています。
          </p>
          <ol>
            {terms.map((t, i) => (
              <li key={i} data-value={t.product}>
                {t.value.toFixed(6)} × {p.filter === "C" ? "1/9" : t.weight} ＝{" "}
                {t.product.toFixed(6)}
              </li>
            ))}
          </ol>
          <p>9項の合計：{sum.toFixed(6)}</p>
        </div>
      )}
      <PixelMap
        values={maps.conv.values}
        width={14}
        label="フィルタの出力マップ"
        selected={{ x, y, size: 1 }}
        onSelect={(x, y) => position(x + y * 14)}
        testId="cnn-output"
      />
      <p>枠で選んだ範囲の計算結果が、出力マップの同じ行・列に入ります。</p>
    </section>
  );
}
function PoolLab({
  p,
  data,
  change,
  all = false,
}: {
  p: CnnProgress;
  data: number[];
  change: (v: Partial<CnnProgress>) => void;
  all?: boolean;
}) {
  const m = useMemo(() => pipeline(data, kernels[p.filter]), [data, p.filter]),
    x = p.poolPosition % 7,
    y = Math.floor(p.poolPosition / 7),
    indices = [
      y * 2 * 14 + x * 2,
      y * 2 * 14 + x * 2 + 1,
      (y * 2 + 1) * 14 + x * 2,
      (y * 2 + 1) * 14 + x * 2 + 1,
    ],
    values = indices.map((i) => m.activated[i]),
    max = Math.max(...values);
  return (
    <section className="cnn-pool-lab" data-step={p.poolStage}>
      <ol className="cnn-pipeline-labels">
        {[
          "16×16 入力",
          "14×14 フィルタ結果",
          "14×14 ReLU",
          "7×7 最大値プーリング",
        ].map((t, i) => (
          <li key={t} aria-current={i === p.poolStage ? "step" : undefined}>
            {t}
          </li>
        ))}
      </ol>
      {!all && (
        <div className="controls">
          {["入力画像", "フィルタ結果", "ReLU結果", "プーリング結果"].map(
            (t, i) => (
              <button
                key={t}
                disabled={i > p.poolStage + 1}
                aria-pressed={p.poolStage === i}
                onClick={() => change({ poolStage: i })}
              >
                {t}を見る
              </button>
            ),
          )}
        </div>
      )}
      {p.poolStage === 0 && !all && (
        <PixelMap values={data} width={16} label="入力画像の明るさ" gray />
      )}
      {(p.poolStage === 1 || all) && (
        <>
          <PixelMap
            values={m.conv.values}
            width={14}
            label="負の値もあるフィルタ結果"
          />
          <p>3×3、歩幅1、端への追加なしなので、16×16から14×14になりました。</p>
        </>
      )}
      {(p.poolStage === 2 || all) && (
        <>
          <PixelMap
            values={m.activated}
            width={14}
            label="負の値を0にしたReLU結果"
          />
          <p>この処理が活性化関数ReLUです。正の値はそのまま残します。</p>
        </>
      )}
      {(p.poolStage === 3 || all) && (
        <>
          <PixelMap
            values={m.activated}
            width={14}
            label="まとめる2×2の範囲"
            selected={{ x: x * 2, y: y * 2, size: 2 }}
            onSelect={(x, y) =>
              change({
                poolPosition: Math.floor(x / 2) + Math.floor(y / 2) * 7,
              })
            }
          />
          <div className="controls">
            <button
              disabled={p.poolPosition === 0}
              onClick={() => change({ poolPosition: p.poolPosition - 1 })}
            >
              まとめる範囲を前へ
            </button>
            <button
              disabled={p.poolPosition === 48}
              onClick={() => change({ poolPosition: p.poolPosition + 1 })}
            >
              まとめる範囲を次へ
            </button>
          </div>
          <div className="cnn-four">
            {values.map((v, i) => (
              <span key={i} className={v === max ? "maximum" : ""}>
                {fmt(v)}
                {v === max ? " 最大" : ""}
              </span>
            ))}
          </div>
          <p data-testid="pool-result" data-value={max}>
            選んだ2×2の最大値：{fmt(max)} → 出力の{y + 1}行{x + 1}列
          </p>
          <PixelMap
            values={m.pooled.values}
            width={7}
            label="最大値でまとめた出力"
            selected={{ x, y, size: 1 }}
            onSelect={(x, y) => change({ poolPosition: x + y * 7 })}
            testId="cnn-pooled"
          />
          <p>
            特徴マップの一部をまとめ、情報の大きさを縮小する方法です。細かな位置や小さい値など、すべての重要情報が保たれるわけではありません。すべてのCNNでプーリング層が必須でもありません。
          </p>
        </>
      )}
    </section>
  );
}
function Dive({
  item,
  p,
  data,
  change,
  suspended,
}: {
  item: (typeof cnnDives)[number];
  p: CnnProgress;
  data: number[];
  change: (v: Partial<CnnProgress>) => void;
  suspended: boolean;
}) {
  const open = p.openDives.includes(item.id),
    ref = useRef<HTMLDetailsElement>(null),
    scroll = useRef(0);
  function set(value: boolean) {
    if (value !== open)
      change({
        openDives: value
          ? [...p.openDives, item.id]
          : p.openDives.filter((id) => id !== item.id),
      });
  }
  return (
    <details
      className="episode-details cnn-dive"
      ref={ref}
      open={open}
      onToggle={(e) => set(e.currentTarget.open)}
    >
      <summary
        onClick={() => {
          if (!open) scroll.current = window.scrollY;
        }}
      >
        {item.id.slice(-3)}：{item.title}
      </summary>
      <h3>やさしい説明</h3>
      <p>{item.easy}</p>
      <h3>具体例と、今回の実計算</h3>
      <p>{item.example}</p>
      {open &&
        (item.id === "L009-D04" ? (
          <PoolLab p={p} data={data} change={change} all />
        ) : item.id === "L009-D03" ? (
          <div>
            {(["A", "B"] as const).map((key) => (
              <div key={key}>
                <PixelMap
                  values={pipeline(data, kernels[key]).conv.values}
                  width={14}
                  label={filterLabels[key]}
                  selected={{
                    x: p.position % 14,
                    y: Math.floor(p.position / 14),
                    size: 1,
                  }}
                  onSelect={(x, y) => change({ position: x + y * 14 })}
                />
                <p>
                  同じ出力位置（{Math.floor(p.position / 14) + 1}行
                  {(p.position % 14) + 1}列）：
                  {fmt(pipeline(data, kernels[key]).conv.values[p.position])}
                </p>
              </div>
            ))}
          </div>
        ) : item.id === "L009-D05" ? (
          <>
            <Coefficients filter={p.filter} />
            <p>
              この{p.filter}の係数は固定値で、学習によって更新していません。
            </p>
          </>
        ) : (
          <WindowLab
            p={p}
            data={data}
            change={change}
            suspended={suspended}
            compact
          />
        ))}
      <h3>技術的な説明</h3>
      <p>{item.detail}</p>
      <h3>関連するG検定用語・出典</h3>
      <p>{item.terms}</p>
      <ul>
        {item.sources.map((id) => {
          const s = cnnSources.find((s) => s.id === id)!;
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
            window.scrollTo({ top: scroll.current, behavior: "instant" });
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
export function CnnEpisode({
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
  progress: CnnProgress;
  attempts: QuestionAttempt[];
  onChange: (v: Partial<CnnProgress>) => void;
  onMove: (s: CnnProgress["stage"]) => void;
  onAnswer: (n: number) => void;
  onFinish: () => void;
  onGuide: (e: React.MouseEvent<HTMLButtonElement>) => void;
  busy: boolean;
  suspended: boolean;
}) {
  const { data, error } = useCnnImage(p.image),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [p.stage]);
  const index = cnnStages.indexOf(p.stage as (typeof cnnStages)[number]),
    next = (stage: CnnProgress["stage"], text: string) => (
      <button
        className="primary story-action"
        disabled={busy || (!data && stage !== "pixels")}
        onClick={() => onMove(stage)}
      >
        {text}
      </button>
    );
  return (
    <div className="lesson-wrap story-intro cnn-lesson" data-lesson="L009">
      <button className="guide-link" onClick={onGuide}>
        第0章で関連説明を確認
      </button>
      <p className="eyebrow">
        第7話 · L009 · {index >= 0 ? `${index + 1} / 7 場面` : "任意の振り返り"}
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {cnnTitles[p.stage]}
      </h1>
      <section className="card scene-body">
        {p.stage === "intro" && (
          <>
            <Picture
              name="shadowed-photo"
              alt="少し暗く写った猫の写真を調べる、同じ施設のスタッフ"
            />
            <Staff>
              人間は耳や顔の輪郭を見て猫だと分かるけど、AIは写真のどこを調べているんだろう？
            </Staff>
            <p>
              前回はAIが数値を学習する仕組みを見ました。今回は、その前段階として、画像から模様や輪郭の情報を取り出す方法を調べます。
            </p>
            {next("pixels", "写真を拡大する")}
          </>
        )}
        {error && (
          <p role="alert">
            16×16の画像を読み込めませんでした。再読み込みしてください。
          </p>
        )}
        {!data && !error && p.stage !== "intro" && (
          <p role="status">画像ファイルの画素を読み込んでいます。</p>
        )}
        {data && p.stage === "pixels" && (
          <>
            <ImageChoice p={p} change={onChange} />
            <figure className="cnn-original">
              <img
                src={`${base}illustrations/l009/${p.image}-16.png`}
                alt={
                  p.image === "cat"
                    ? "耳・輪郭・目・鼻を描いた16×16の猫の原画像"
                    : "耳・顔・目・鼻を描いた16×16の犬の原画像"
                }
                width={16}
                height={16}
              />
              <figcaption>
                実寸16×16のPNGを、なめらかにせず拡大しています。
              </figcaption>
            </figure>
            <PixelMap
              values={data.gray}
              width={16}
              label="同じ画像を明るさで表示"
              gray
              selected={{
                x: p.pixel % 16,
                y: Math.floor(p.pixel / 16),
                size: 1,
              }}
              onSelect={(x, y) => onChange({ pixel: x + y * 16 })}
              testId="cnn-gray"
            />
            <div className="controls">
              <button
                disabled={p.pixel === 0}
                onClick={() => onChange({ pixel: p.pixel - 1 })}
              >
                前の画素
              </button>
              <button
                disabled={p.pixel === 255}
                onClick={() => onChange({ pixel: p.pixel + 1 })}
              >
                次の画素
              </button>
            </div>
            <div className="cnn-pixel-info" data-testid="cnn-pixel-info">
              <span
                className="color-swatch"
                style={{
                  background: `rgb(${Array.from(data.rgba.slice(p.pixel * 4, p.pixel * 4 + 3)).join(",")})`,
                }}
              />
              <p>
                {Math.floor(p.pixel / 16) + 1}行 {(p.pixel % 16) + 1}列の色：R{" "}
                {data.rgba[p.pixel * 4]} / G {data.rgba[p.pixel * 4 + 1]} / B{" "}
                {data.rgba[p.pixel * 4 + 2]}
                <br />
                明るさ：{fmt(data.gray[p.pixel])}（0〜1）
              </p>
            </div>
            <p>
              写真の色を、計算しやすい明るさの数値にしました。この16×16画像のファイルを読み取った値です。
            </p>
            <details className="episode-details">
              <summary>グレースケール変換の方法</summary>
              <p>
                透明画素は先に白背景と合成します。合成後のRGBに重み0.2126・0.7152・0.0722を掛けて足し、255で割って0〜1にします。ここではsRGBの値から作る明るさの近似で、物理的な光の量そのものではありません。
              </p>
            </details>
            {next("window", "小さなフィルタを重ねる")}
          </>
        )}
        {data && p.stage === "window" && (
          <>
            <Picture
              name="filter-investigation"
              alt="猫のドット絵と小さな枠を調べるスタッフ"
            />
            <WindowLab
              p={p}
              data={data.gray}
              change={onChange}
              suspended={suspended}
            />
            {next("filters", "別のフィルタも試す")}
          </>
        )}
        {data && p.stage === "filters" && (
          <>
            <Picture
              name="pattern-comparison"
              alt="同じ猫の輪郭や模様の違いを見比べるスタッフ"
            />
            <ImageChoice p={p} change={onChange} />
            <div className="cnn-filter-choice">
              {(["A", "B", "C"] as const).map((filter) => (
                <button
                  key={filter}
                  aria-pressed={p.filter === filter}
                  onClick={() => onChange({ filter })}
                >
                  {filterLabels[filter]}
                </button>
              ))}
            </div>
            <p>
              {filterNotes[p.filter]}
              同じ画像でも、係数によって計算結果が変わります。
            </p>
            <p className="notice">
              3種類とも説明用の固定値です。学習で得たフィルタではありません。「耳を認識した」など、特定の意味を直接理解した結果ではありません。
            </p>
            <WindowLab
              p={p}
              data={data.gray}
              change={onChange}
              suspended={suspended}
            />
            {next("pooling", "特徴マップを小さくまとめる")}
          </>
        )}
        {data && p.stage === "pooling" && (
          <>
            <PoolLab p={p} data={data.gray} change={onChange} />
            {p.poolStage === 3 && next("cnn", "全体の流れを見る")}
          </>
        )}
        {data && p.stage === "cnn" && (
          <>
            <p>
              画像の小さな範囲を繰り返し調べ、特徴を組み合わせて処理できる。この考え方を使うのがCNN（畳み込みニューラルネットワーク）です。
            </p>
            <ol className="cnn-flow">
              {cnnFlow.map(([title], i) => (
                <li key={title}>
                  <button
                    aria-pressed={p.cnnStep === i}
                    onClick={() => onChange({ cnnStep: i })}
                  >
                    {title}
                  </button>
                </li>
              ))}
            </ol>
            <p className="notice" aria-live="polite">
              {cnnFlow[p.cnnStep][1]}
            </p>
            <p>
              前回の第6話では重みを調整して学習しました。実際のCNNでは、畳み込みフィルタの係数も学習によって調整されることがあります。
            </p>
            <p>
              今回のA/B/Cは固定値の計算です。後半の層と分類出力は構成を示す模式図で、猫・犬分類モデルを学習させたり判定したりしていません。
            </p>
            <p>
              特定の場所だけを必ず見ているわけではありません。特徴マップなどの内部表現を見るだけで、最終判断の根拠が完全に分かるわけでもありません。
            </p>
            {next("ending", "第7話をまとめる")}
          </>
        )}
        {data && p.stage === "ending" && (
          <>
            <Picture
              name="image-lab-ending"
              alt="画像を小さな範囲で調べる仕組みを理解したスタッフと、猫と犬"
            />
            <Staff>
              なるほど！
              小さな範囲を少しずつ調べて、画像の特徴を取り出す仕組みがあるんだね
            </Staff>
            <ul>
              <li>畳み込み層：局所的な数値を、位置ごとに計算する</li>
              <li>フィルタ／カーネル：計算に使う係数のまとまり</li>
              <li>特徴マップ：計算した結果を位置ごとに並べたもの</li>
              <li>活性化関数ReLU：負の値を0にする</li>
              <li>プーリング：範囲の値をまとめる。情報が失われる場合もある</li>
              <li>
                CNN：こうした処理を組み合わせる。実際の構成ではフィルタも学習できる
              </li>
            </ul>
            <p>
              この実験だけでは猫犬の判定や、その判断根拠の完全な説明はできません。演習・深掘りを開かずに終えられます。
            </p>
            <div className="episode-end-actions">
              <button className="primary" disabled={busy} onClick={onFinish}>
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
        {data && p.stage === "details" && (
          <>
            <p>
              現在の画像・フィルタ・位置を使った計算を引用します。深掘りの閲覧状態も保存します。
            </p>
            {cnnDives.map((item) => (
              <Dive
                key={item.id}
                item={item}
                p={p}
                data={data.gray}
                change={onChange}
                suspended={suspended}
              />
            ))}
            <h2>出典とシラバスとの対応</h2>
            <ul>
              {cnnSources.map((s) => (
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
            {next("ending", "第7話のまとめへ戻る")}
          </>
        )}
        {p.stage === "quiz" && (
          <>
            <p>
              第7話のオリジナル5問です。公式問題ではありません。回答せずに戻れます。
            </p>
            <Quiz
              key={p.sessionId}
              index={p.questionIndex}
              attempts={attempts}
              sessionId={p.sessionId}
              onAnswer={onAnswer}
              onIndex={(questionIndex) => onChange({ questionIndex })}
              busy={busy}
              items={cnnQuestions}
              relatedLabel="L009-K01〜K05：局所的計算・特徴マップ・ReLU・プーリング・フィルタの学習"
              sourceLabel="本編と深掘り末尾のJDLA・TensorFlow公式資料"
            />
            {next("ending", "第7話のまとめへ戻る")}
          </>
        )}
      </section>
      {index > 0 && (
        <button
          className="evaluation-back"
          onClick={() => onMove(cnnStages[index - 1])}
        >
          ← 前の場面へ
        </button>
      )}
    </div>
  );
}
