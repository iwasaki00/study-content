import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { saved, readSnapshot } from "./helpers";
import {
  validateBackup,
  beginCnn,
  beginTraining,
  beginDeepLearning,
  beginFairness,
  beginGeneralization,
  beginEvaluation,
  grade,
} from "../src/engine/learning";
import {
  cnnStages,
  cnnDives,
  cnnQuestions,
  filterLabels,
} from "../src/data/cnn";
import {
  kernels,
  rgbaToGray,
  pipeline,
  windowTerms,
  mapColors,
} from "../src/engine/cnn";
import { learn } from "../src/engine/training";
import { trainingQuestions } from "../src/data/training";
const click = async (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true }).click();
const old = beginTraining(
  beginDeepLearning(
    beginFairness(
      beginGeneralization(
        beginEvaluation(
          JSON.parse(
            readFileSync(
              new URL("./fixtures/v0.1.1-backup.json", import.meta.url),
              "utf8",
            ),
          ),
        ),
      ),
    ),
  ),
);
old.trainingAttempts = [
  grade(
    trainingQuestions[0].id,
    trainingQuestions[0].answer,
    old.training!.sessionId,
    trainingQuestions,
  ),
];
old.completions = [
  {
    id: "completion-L008-past",
    lessonId: "L008",
    sessionId: "past",
    recordedAt: "2026-11-01T00:00:00.000Z",
  },
];
function preserve(b: any) {
  for (const key of Object.keys(old).filter(
    (k) => !["exportedAt", "completions"].includes(k),
  ))
    expect(b[key]).toEqual(old[key as keyof typeof old]);
  for (const c of old.completions!) expect(b.completions).toContainEqual(c);
}
async function install(p: Page, stage: (typeof cnnStages)[number] = "intro") {
  const b = beginCnn(structuredClone(old));
  b.cnn!.stage = stage;
  b.cnn!.visited = cnnStages.slice(0, cnnStages.indexOf(stage) + 1);
  if (cnnStages.indexOf(stage) >= 5) {
    b.cnn!.poolDone = true;
    b.cnn!.poolStage = 3;
  }
  validateBackup(b);
  await p.goto("/");
  await expect(
    p.getByRole("button", { name: /3分で全体像を見る|続きから学ぶ/ }).first(),
  ).toBeVisible();
  await p.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("why-learn-g", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("state", "readwrite");
          tx.objectStore("state").put(value, "snapshot");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
        r.onerror = () => reject(r.error);
      }),
    b,
  );
  await p.reload();
}
async function open(p: Page) {
  await click(p, "コース");
  await p
    .locator(".cnn-course")
    .getByRole("button", { name: /第7話を始める|続きから学ぶ/ })
    .click();
  await saved(p);
}
async function images(p: Page) {
  for (const img of await p.locator(".cnn-lesson img:visible").all())
    await expect
      .poll(() =>
        img.evaluate((n: HTMLImageElement) => n.complete && n.naturalWidth > 0),
      )
      .toBe(true);
}
async function shot(p: Page, name: string) {
  await images(p);
  await p.screenshot({
    path: `docs/screenshots/v0.2.2/${name}-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function toPool(p: Page) {
  for (const n of [
    "写真を拡大する",
    "小さなフィルタを重ねる",
    "別のフィルタも試す",
    "特徴マップを小さくまとめる",
  ])
    await click(p, n);
}
async function finish(p: Page) {
  await toPool(p);
  for (const n of [
    "フィルタ結果を見る",
    "ReLU結果を見る",
    "プーリング結果を見る",
    "全体の流れを見る",
    "第7話をまとめる",
  ])
    await click(p, n);
  await saved(p);
}
function png(image: string) {
  const b = readFileSync(
    new URL(`../public/illustrations/l009/${image}-16.png`, import.meta.url),
  );
  expect(b.readUInt32BE(16)).toBe(16);
  expect(b.readUInt32BE(20)).toBe(16);
  const parts: Buffer[] = [];
  for (let at = 8; at < b.length;) {
    const n = b.readUInt32BE(at);
    if (b.toString("ascii", at + 4, at + 8) === "IDAT")
      parts.push(b.subarray(at + 8, at + 8 + n));
    at += n + 12;
  }
  const raw = inflateSync(Buffer.concat(parts));
  return Array.from({ length: 16 }, (_, r) => [
    ...raw.subarray(r * 65 + 1, r * 65 + 65),
  ]).flat();
}
async function verifyWindow(p: Page) {
  await saved(p);
  const b = await readSnapshot(p),
    s = b.cnn,
    gray = rgbaToGray(png(s.image)),
    terms = windowTerms(
      gray,
      16,
      s.position % 14,
      Math.floor(s.position / 14),
      kernels[s.filter as "A"],
    );
  await expect(p.locator(".cnn-window-lab").first()).toHaveAttribute(
    "data-position",
    String(s.position),
  );
  expect(
    Number(
      await p.getByTestId("cnn-result").first().getAttribute("data-value"),
    ),
  ).toBeCloseTo(
    terms.reduce((v, t) => v + t.product, 0),
    12,
  );
  const frame = await p
    .getByTestId("cnn-input")
    .locator(".cnn-selection")
    .getAttribute("style");
  expect(frame).toContain(`left: ${((s.position % 14) / 16) * 100}%`);
  return { b, gray, terms };
}
test("390px new visitor: chapter zero through seven scenes, real maps and completion without questions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /3分で全体像を見る/ }).click();
  await click(page, "第7話で、画像とフィルタを動かす");
  await shot(page, "01-shadowed-photo-390");
  await click(page, "写真を拡大する");
  await expect(page.getByTestId("cnn-gray").locator("canvas")).toHaveAttribute(
    "width",
    "16",
  );
  await shot(page, "02-pixels-390");
  await click(page, "小さなフィルタを重ねる");
  await click(page, "次へ");
  await verifyWindow(page);
  await shot(page, "03-window-390");
  await click(page, "別のフィルタも試す");
  await click(page, filterLabels.B);
  await shot(page, "04-filters-390");
  await click(page, "特徴マップを小さくまとめる");
  for (const n of [
    "フィルタ結果を見る",
    "ReLU結果を見る",
    "プーリング結果を見る",
  ])
    await click(page, n);
  await shot(page, "05-pooling-390");
  await click(page, "全体の流れを見る");
  await shot(page, "06-cnn-flow-390");
  await click(page, "第7話をまとめる");
  await shot(page, "07-ending-390");
  await click(page, "ここで終える");
  await saved(page);
  const b = await readSnapshot(page);
  expect(b.cnn.completed).toBe(true);
  expect(b.cnnAttempts).toBeUndefined();
  expect(errors).toEqual([]);
});
test("actual PNG pixels, RGB brightness, tap, previous/next and image change", async ({
  page,
}) => {
  await install(page, "pixels");
  await open(page);
  for (const image of ["cat", "dog"]) {
    await click(page, image === "cat" ? "猫の画像" : "犬の画像");
    await expect(page.locator(".cnn-original img")).toHaveAttribute(
      "src",
      new RegExp(image + "-16.png$"),
    );
    await images(page);
    await page
      .getByTestId("cnn-gray")
      .locator("canvas")
      .click({ position: { x: 100, y: 130 } });
    await saved(page);
    const b = await readSnapshot(page),
      s = b.cnn,
      rgba = png(image),
      i = s.pixel * 4;
    await expect(page.getByTestId("cnn-pixel-info")).toContainText(
      `R ${rgba[i]} / G ${rgba[i + 1]} / B ${rgba[i + 2]}`,
    );
    await expect(page.getByTestId("cnn-pixel-info")).toContainText(
      rgbaToGray(rgba)[s.pixel].toFixed(4),
    );
    await click(page, "次の画素");
    await saved(page);
    expect((await readSnapshot(page)).cnn.pixel).toBe(s.pixel + 1);
    await click(page, "前の画素");
    await saved(page);
    expect((await readSnapshot(page)).cnn.pixel).toBe(s.pixel);
  }
});
test("all filters: tap and keyboard synchronize nine products, output location and full raw map rendering", async ({
  page,
}) => {
  await install(page, "filters");
  await open(page);
  await click(page, "計算の中身を見る");
  const maps: string[] = [];
  for (const f of ["A", "B", "C"] as const) {
    await click(page, filterLabels[f]);
    await page
      .getByTestId("cnn-input")
      .locator("canvas")
      .click({ position: { x: 110, y: 140 } });
    const { gray, terms } = await verifyWindow(page);
    const products = await page
      .locator(".cnn-products li")
      .evaluateAll((ns) => ns.map((n) => Number(n.getAttribute("data-value"))));
    products.forEach((v, i) => expect(v).toBeCloseTo(terms[i].product, 12));
    const raw = pipeline(gray, kernels[f]).conv.values;
    const colors = mapColors(raw);
    const pixels = await page
      .getByTestId("cnn-output")
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) => [
        ...c.getContext("2d")!.getImageData(0, 0, 14, 14).data,
      ]);
    for (let i = 0; i < 196; i++)
      for (let j = 0; j < 3; j++)
        expect(Math.abs(pixels[i * 4 + j] - colors[i][j])).toBeLessThanOrEqual(
          0.51,
        );
    maps.push(JSON.stringify(pixels));
    await page.getByTestId("cnn-output").locator("canvas").press("ArrowRight");
    await verifyWindow(page);
  }
  expect(new Set(maps).size).toBe(3);
  await click(page, "犬の画像");
  await verifyWindow(page);
  await shot(page, "08-multiplication-dog-390");
});
test("ReLU, four inputs and pooled maximum use current image and selected 2x2 output", async ({
  page,
}) => {
  await install(page, "pooling");
  await open(page);
  await expect(page.locator(".cnn-pool-lab")).toHaveAttribute("data-step", "0");
  for (const [i, n] of [
    "フィルタ結果を見る",
    "ReLU結果を見る",
    "プーリング結果を見る",
  ].entries()) {
    await click(page, n);
    await expect(page.locator(".cnn-pool-lab")).toHaveAttribute(
      "data-step",
      String(i + 1),
    );
  }
  await page
    .getByTestId("cnn-pooled")
    .locator("canvas")
    .click({ position: { x: 120, y: 150 } });
  await saved(page);
  const s = (await readSnapshot(page)).cnn,
    maps = pipeline(rgbaToGray(png(s.image)), kernels[s.filter as "A"]);
  expect(
    Number(await page.getByTestId("pool-result").getAttribute("data-value")),
  ).toBeCloseTo(maps.pooled.values[s.poolPosition], 12);
  const x = (s.poolPosition % 7) * 2,
    y = Math.floor(s.poolPosition / 7) * 2;
  const expected = [
    maps.activated[y * 14 + x],
    maps.activated[y * 14 + x + 1],
    maps.activated[(y + 1) * 14 + x],
    maps.activated[(y + 1) * 14 + x + 1],
  ];
  for (const v of expected)
    await expect(page.locator(".cnn-four")).toContainText(
      Math.abs(v) < 1e-12 ? "0" : v.toFixed(4),
    );
  await expect(page.locator(".cnn-four")).toContainText("最大");
  await click(page, "まとめる範囲を次へ");
  await saved(page);
  expect((await readSnapshot(page)).cnn.poolPosition).toBe(s.poolPosition + 1);
  await page.reload();
  await open(page);
  expect((await readSnapshot(page)).cnn.poolPosition).toBe(s.poolPosition + 1);
  expect(
    Number(await page.getByTestId("pool-result").getAttribute("data-value")),
  ).toBeCloseTo(maps.pooled.values[s.poolPosition + 1], 12);
});
test("animation pauses on request and guide, never auto resumes and respects reduced motion", async ({
  page,
}) => {
  await install(page, "window");
  await open(page);
  await click(page, "自動で枠を動かす");
  await expect
    .poll(async () => (await readSnapshot(page)).cnn.position)
    .toBeGreaterThan(0);
  await click(page, "一時停止");
  await expect(
    page.getByRole("button", { name: "自動で枠を動かす", exact: true }),
  ).toBeVisible();
  await saved(page);
  const paused = (await readSnapshot(page)).cnn.position;
  await page.reload();
  await open(page);
  expect((await readSnapshot(page)).cnn.position).toBe(paused);
  await click(page, "自動で枠を動かす");
  await click(page, "第0章で関連説明を確認");
  await click(page, "← 第0章を閉じて戻る");
  await expect(
    page.getByRole("button", { name: "自動で枠を動かす", exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "自動で枠を動かす", exact: true }),
  ).toBeDisabled();
  await click(page, "次へ");
  await verifyWindow(page);
});
test("saved image, filter, position and math restore independently of six old lessons and guide", async ({
  page,
}) => {
  await install(page, "filters");
  await open(page);
  await click(page, "犬の画像");
  await click(page, filterLabels.B);
  await page
    .getByTestId("cnn-output")
    .locator("canvas")
    .click({ position: { x: 120, y: 150 } });
  await click(page, "計算の中身を見る");
  const { b: before } = await verifyWindow(page);
  await click(page, "第0章で関連説明を確認");
  await click(page, "← 第0章を閉じて戻る");
  await verifyWindow(page);
  await page.reload();
  await open(page);
  const { b } = await verifyWindow(page);
  for (const k of ["image", "filter", "position", "mathOpen"])
    expect(b.cnn[k]).toEqual(before.cnn[k]);
  preserve(b);
  await expect(page.locator(".cnn-products li")).toHaveCount(9);
});
test("five optional deep dives use actual values, close to original item and keep open state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await install(page, "ending");
  await open(page);
  await click(page, "もっと詳しく学ぶ");
  for (const d of cnnDives) {
    const fold = page.locator(".cnn-dive").filter({
      has: page.getByText(d.id.slice(-3) + "：" + d.title, { exact: true }),
    });
    await fold.locator(":scope > summary").click();
    await saved(page);
    await expect(fold).toContainText(d.detail);
    if (d.id === "L009-D02") {
      await page.reload();
      await open(page);
      await expect(fold).toHaveAttribute("open");
    }
    if (d.id === "L009-D04") await shot(page, "09-details-pool-390");
    await fold
      .getByRole("button", { name: "解説を閉じて元の項目に戻る" })
      .click();
    await saved(page);
    await expect(fold).not.toHaveAttribute("open");
    await expect(fold.locator(":scope > summary")).toBeInViewport();
  }
  await expect(
    page.locator('.cnn-lesson a[target="_blank"]:visible'),
  ).toHaveCount(4);
});
test("five optional questions show every explanation and retain wrong and retake history", async ({
  page,
}) => {
  await install(page, "ending");
  await open(page);
  await click(page, "G検定の問題で確認する");
  for (let i = 0; i < 5; i++) {
    const q = cnnQuestions[i];
    await expect(page.locator(".question")).toHaveText(q.text);
    if (i === 0) {
      await page
        .getByRole("radio")
        .nth((q.answer + 1) % 4)
        .check();
      await click(page, "回答を確定");
      await saved(page);
      await click(page, "この問題を解き直す");
    }
    await page.getByRole("radio").nth(q.answer).check();
    await click(page, "回答を確定");
    await saved(page);
    await expect(page.locator(".feedback")).toContainText(q.clue);
    await page.getByText("すべての選択肢の解説", { exact: true }).click();
    for (const o of q.options)
      await expect(
        page.locator("details p").filter({ hasText: o.explanation }),
      ).toBeVisible();
    if (i < 4) await click(page, "次の問題");
  }
  await page.reload();
  await open(page);
  await expect(page.locator(".feedback")).toContainText(cnnQuestions[4].clue);
  const b = await readSnapshot(page);
  expect(b.cnnAttempts).toHaveLength(6);
  preserve(b);
  await shot(page, "10-quiz-390");
});
test("completion, restart, real JSON export and restore preserve history and all prior progress", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await finish(page);
  await click(page, "ここで終える");
  await saved(page);
  const done = await readSnapshot(page);
  preserve(done);
  await click(page, "記録");
  const download = page.waitForEvent("download");
  await click(page, "JSONをエクスポート");
  let body = "";
  for await (const chunk of (await (await download).createReadStream())!)
    body += chunk.toString();
  expect(JSON.parse(body).cnn).toEqual(done.cnn);
  await click(page, "コース");
  await page
    .locator(".cnn-course")
    .getByRole("button", { name: "最初から学ぶ", exact: true })
    .click();
  await saved(page);
  const b = await readSnapshot(page);
  expect(b.cnn.stage).toBe("intro");
  expect(b.cnn.poolDone).toBe(false);
  expect(b.cnn.sessionId).not.toBe(done.cnn.sessionId);
  expect(b.completions).toEqual(done.completions);
  preserve(b);
  await click(page, "← 戻る・途中終了");
  await click(page, "記録");
  await page.getByLabel("JSONから復元").setInputFiles({
    name: "v022.json",
    mimeType: "application/json",
    buffer: Buffer.from(body),
  });
  await page.getByLabel("復元方法").selectOption("replace");
  page.once("dialog", (d) => d.accept());
  await click(page, "この内容を復元");
  await saved(page);
  await page.reload();
  await open(page);
  const restored = (await readSnapshot(page)).cnn;
  expect({ ...restored, updatedAt: done.cnn.updatedAt }).toEqual(done.cnn);
});
for (const large of [false, true])
  test(`320px all scenes and expanded calculation, enlarged=${large}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await open(page);
    if (large)
      await page.addStyleTag({
        content:
          ".cnn-lesson{font-size:28px}.cnn-lesson :is(h1,h2,h3,p,span,strong,b,button,summary,dt,dd,li){font-size:inherit!important}",
      });
    async function check() {
      await images(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const el of await page
        .locator(
          ".cnn-lesson button:visible,.cnn-lesson canvas:visible,.cnn-lesson img:visible",
        )
        .all()) {
        const r = (await el.boundingBox())!;
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThanOrEqual(320);
        if (await el.evaluate((n) => n.tagName === "BUTTON"))
          expect(r.height).toBeGreaterThanOrEqual(44);
      }
    }
    await check();
    for (const n of ["写真を拡大する", "小さなフィルタを重ねる"]) {
      await click(page, n);
      await check();
    }
    await click(page, "計算の中身を見る");
    await check();
    await shot(page, `11-calculation-320-large-${large}`);
    for (const n of [
      "別のフィルタも試す",
      "特徴マップを小さくまとめる",
      "フィルタ結果を見る",
      "ReLU結果を見る",
      "プーリング結果を見る",
      "全体の流れを見る",
      "第7話をまとめる",
    ]) {
      await click(page, n);
      await check();
    }
    await click(page, "ここで終える");
  });
test("offline: all six local assets, actual calculations and all scenes complete", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await open(page);
  for (const name of [
    "shadowed-photo",
    "filter-investigation",
    "pattern-comparison",
    "image-lab-ending",
    "cat-16",
    "dog-16",
  ])
    expect(
      await page.evaluate(async (name) => {
        const r = await fetch(`./illustrations/l009/${name}.png`);
        return r.ok && (await r.blob()).size > 100;
      }, name),
    ).toBe(true);
  await finish(page);
  await click(page, "もっと詳しく学ぶ");
  await page.locator(".cnn-dive > summary").first().click();
  await verifyWindow(page);
  await click(page, "第7話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
  expect((await readSnapshot(page)).cnn.completed).toBe(true);
});
test("L008 ending links to L009 without changing learned weights or automatically opening the next story", async ({
  page,
}) => {
  const b = beginCnn(structuredClone(old));
  delete b.cnn;
  b.training = learn(b.training!, 1);
  b.training!.stage = "ending";
  b.training!.visited = [
    "intro",
    "features",
    "loss",
    "update",
    "practice",
    "evaluation",
    "ending",
  ];
  b.training!.evaluated = true;
  validateBackup(b);
  await install(page);
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("why-learn-g", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("state", "readwrite");
          tx.objectStore("state").put(value, "snapshot");
          tx.oncomplete = () => {
            r.result.close();
            resolve();
          };
        };
      }),
    b,
  );
  await page.reload();
  await click(page, "コース");
  await page
    .locator(".training-course")
    .getByRole("button", { name: /続きから学ぶ/ })
    .click();
  await expect(page.locator(".training-lesson")).toBeVisible();
  await click(page, "第7話へ：AIは写真のどこを見ているの？");
  await expect(page.locator(".cnn-lesson")).toBeVisible();
  await saved(page);
  const preservedTraining = (await readSnapshot(page)).training;
  expect({ ...preservedTraining, updatedAt: b.training!.updatedAt }).toEqual(
    b.training,
  );
});
