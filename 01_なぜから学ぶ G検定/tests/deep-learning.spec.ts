import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { saved, readSnapshot } from "./helpers";
import {
  beginEvaluation,
  beginGeneralization,
  beginFairness,
  grade,
} from "../src/engine/learning";
import { evaluationQuestions } from "../src/data/evaluation";
import { fairnessQuestions } from "../src/data/fairness";
import {
  deepQuestions,
  deepDives,
  pixelSource,
} from "../src/data/deepLearning";
const click = async (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true }).click();
const card = (p: Page) => p.locator(".deep-course");
async function open(p: Page) {
  await click(p, "コース");
  await card(p)
    .getByRole("button", { name: /第5話を始める|続きから学ぶ/ })
    .click();
  await saved(p);
}
async function photos(p: Page) {
  await click(p, "写真を見てみる");
  await p.getByRole("button", { name: /^猫の写真/ }).click();
  await click(p, "ほかの写真も見てみる");
  await p.getByRole("button", { name: /^耳が垂れた猫/ }).click();
  await click(p, "AIには写真がどう見えている？");
}
async function layers(p: Page) {
  await photos(p);
  await click(p, "拡大する");
  await click(p, "写真の情報が進む先を見る");
}
async function ending(p: Page) {
  await layers(p);
  for (let i = 0; i < 4; i++) await click(p, "1ステップ進む");
  await click(p, "どうやって特徴を学ぶの？");
  await click(p, "写真以外の使い道も見る");
  await click(p, "施設での体験をまとめる");
}
async function imgs(p: Page) {
  for (const img of await p.locator(".deep-lesson img:visible").all())
    await expect
      .poll(() =>
        img.evaluate((n: HTMLImageElement) => n.complete && n.naturalWidth > 0),
      )
      .toBe(true);
}
async function shot(p: Page, name: string) {
  await imgs(p);
  await p.screenshot({
    path: `docs/screenshots/v0.2.0/${name}-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
const old = beginFairness(
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
);
old.generalization!.stage = "refined";
old.generalization!.visited = ["intro", "practice", "refined"];
old.generalization!.prediction = "refined";
old.fairness!.stage = "lighting";
old.fairness!.visited = ["intro", "results", "investigation", "lighting"];
old.fairness!.lightingAdjusted = true;
old.evaluationAttempts = [
  grade("L004-Q01", 1, old.evaluation!.sessionId, evaluationQuestions),
];
old.fairnessAttempts = [
  grade("L006-Q01", 0, old.fairness!.sessionId, fairnessQuestions),
];
old.completions = ["L003", "L004", "L005", "L006"].map((lessonId) => ({
  id: `completion-${lessonId}-past`,
  lessonId,
  sessionId: "past",
  recordedAt: "2026-11-01T00:00:00.000Z",
}));
async function install(p: Page, value = old) {
  await p.goto("/");
  await expect(
    p.getByRole("button", { name: "3分で全体像を見る" }),
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
    value,
  );
  await p.reload();
}
function preserved(actual: any) {
  for (const k of [
    "progress",
    "evaluation",
    "generalization",
    "fairness",
    "attempts",
    "evaluationAttempts",
    "fairnessAttempts",
    "reviews",
    "settings",
  ])
    expect(actual[k]).toEqual(old[k as keyof typeof old]);
  for (const c of old.completions!)
    expect(actual.completions).toContainEqual(c);
}
test("390px new user: Chapter0 diagram to all seven scenes and optional-free completion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /3分で全体像を見る/ }).click();
  await click(page, "第5話で、写真と層の仕組みを見る");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "写真がいっぱい！",
  );
  await expect(page.getByRole("radio")).toHaveCount(0);
  await shot(page, "01-shelter-390");
  await click(page, "写真を見てみる");
  await page.getByRole("button", { name: /^猫の写真/ }).click();
  await expect(page.locator(".animal-clue")).toContainText("ひげ");
  await click(page, "ほかの写真も見てみる");
  for (const name of ["耳が垂れた猫", "耳が立った犬", "顔の一部が隠れた猫"]) {
    await page.getByRole("button", { name: new RegExp("^" + name) }).click();
    await expect(page.locator(".animal-clue h3")).toContainText(name);
  }
  await shot(page, "02-photo-clues-390");
  await click(page, "AIには写真がどう見えている？");
  await click(page, "拡大する");
  await page.locator("canvas").click({ position: { x: 60, y: 90 } });
  await shot(page, "03-real-pixels-390");
  await click(page, "写真の情報が進む先を見る");
  for (let i = 0; i < 4; i++) await click(page, "1ステップ進む");
  await expect(page.locator(".network-demo")).toHaveAttribute("data-step", "4");
  await shot(page, "04-network-390");
  await click(page, "どうやって特徴を学ぶの？");
  await expect(page.locator(".deep-training-flow")).toHaveAttribute(
    "data-mode",
    "training",
  );
  await click(page, "利用時の流れ");
  await expect(page.locator(".deep-training-flow")).toContainText(
    "まだ見ていない新しい写真",
  );
  await shot(page, "05-inference-390");
  await click(page, "写真以外の使い道も見る");
  await expect(page.locator(".deep-uses article")).toHaveCount(4);
  await shot(page, "06-applications-390");
  await click(page, "施設での体験をまとめる");
  await shot(page, "07-ending-390");
  await click(page, "ここで終える");
  await saved(page);
  const b = await readSnapshot(page);
  expect(b.deepLearning.completed).toBe(true);
  expect(b.deepLearningAttempts).toBeUndefined();
  expect(b.deepLearning.visited).toHaveLength(7);
  expect(b.completions.some((c: any) => c.lessonId === "L007")).toBe(true);
  expect(errors).toEqual([]);
  await expect(
    page
      .locator(".hero")
      .getByRole("button", { name: "最初から学ぶ", exact: true }),
  ).toBeVisible();
});
test("pixel colors derive from actual local PNG and update on keyboard/button selection", async ({
  page,
}) => {
  await page.goto("/");
  await open(page);
  await photos(page);
  await click(page, "拡大する");
  await page.locator(".pixel-values summary").click();
  await click(page, "右");
  await click(page, "下");
  await saved(page);
  const b = await readSnapshot(page),
    x = b.deepLearning.pixelX,
    y = b.deepLearning.pixelY;
  const expected = await page.evaluate(
    async ({ src, x, y }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 32, 32);
      return Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3);
    },
    { src: "/" + pixelSource, x, y },
  );
  await expect(page.getByTestId("pixel-rgb")).toContainText(
    `赤 R ${expected[0]} / 緑 G ${expected[1]} / 青 B ${expected[2]}`,
  );
  expect(
    await page
      .locator(".color-swatch")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(`rgb(${expected.join(", ")})`);
  const actual = await page
    .locator("canvas")
    .evaluate((c) =>
      Array.from(
        (c as HTMLCanvasElement).getContext("2d")!.getImageData(0, 0, 32, 32)
          .data,
      ),
    );
  const source = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 32, 32);
    return Array.from(ctx.getImageData(0, 0, 32, 32).data);
  }, "/" + pixelSource);
  expect(actual).toEqual(source);
  await page.locator("canvas").press("ArrowLeft");
  await saved(page);
  expect((await readSnapshot(page)).deepLearning.pixelX).toBe(x - 1);
  await page.reload();
  await open(page);
  await expect(page.locator("canvas")).toBeVisible();
  expect((await readSnapshot(page)).deepLearning.pixelX).toBe(x - 1);
});
test("network manual steps, auto pause, Chapter0 detour and reload preserve current state", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await layers(page);
  await click(page, "1ステップ進む");
  await click(page, "自動で流れを見る");
  await expect(page.locator(".network-demo")).toHaveAttribute("data-step", "2");
  await click(page, "一時停止");
  await expect(
    page.getByText("停止中。1ステップずつ操作できます。", { exact: false }),
  ).toBeVisible();
  await saved(page);
  const before = await readSnapshot(page);
  await click(page, "第0章で用語を確認");
  await expect(page.locator("#guide-dl h2")).toBeInViewport();
  await page.getByRole("button", { name: /第0章を閉じて戻る/ }).click();
  expect(await readSnapshot(page)).toEqual(before);
  await page.reload();
  await open(page);
  await expect(page.locator(".network-demo")).toHaveAttribute(
    "data-step",
    String(before.deepLearning.networkStep),
  );
  expect(
    await page.getByRole("button", { name: "一時停止", exact: true }).count(),
  ).toBe(0);
  preserved(await readSnapshot(page));
});
test("restart, optional-free completion, history, actual backup export and restore keep four old lessons", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await photos(page);
  await click(page, "拡大する");
  await click(page, "右");
  await saved(page);
  await click(page, "← 戻る・途中終了");
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  let b = await readSnapshot(page);
  expect(b.deepLearning.stage).toBe("intro");
  expect(b.deepLearning.pixelExpanded).toBe(false);
  preserved(b);
  await ending(page);
  await click(page, "ここで終える");
  await saved(page);
  b = await readSnapshot(page);
  await click(page, "記録");
  const downloading = page.waitForEvent("download");
  await click(page, "JSONをエクスポート");
  const stream = await (await downloading).createReadStream();
  let body = "";
  for await (const part of stream!) body += part.toString();
  expect(JSON.parse(body).deepLearning).toEqual(b.deepLearning);
  await click(page, "コース");
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  const reset = await readSnapshot(page);
  expect(reset.deepLearning.sessionId).not.toBe(b.deepLearning.sessionId);
  expect(reset.completions).toEqual(b.completions);
  preserved(reset);
  await click(page, "← 戻る・途中終了");
  await click(page, "記録");
  await page.getByLabel("JSONから復元").setInputFiles({
    name: "v020.json",
    mimeType: "application/json",
    buffer: Buffer.from(body),
  });
  await page.getByLabel("復元方法").selectOption("replace");
  page.once("dialog", (d) => d.accept());
  await click(page, "この内容を復元");
  await saved(page);
  await page.reload();
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "人の確認といっしょに、次へ",
  );
  preserved(await readSnapshot(page));
});
test("all five quiz questions and all option explanations, wrong/retake history and restart", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await ending(page);
  await click(page, "G検定の問題で確認する");
  for (let i = 0; i < deepQuestions.length; i++) {
    const q = deepQuestions[i];
    await expect(page.locator(".question")).toHaveText(q.text);
    if (i === 0) {
      await page.getByRole("radio").nth(0).check();
      await click(page, "回答を確定");
      await saved(page);
      await expect(page.locator(".feedback")).toContainText("もう一度");
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
  await expect(page.locator(".feedback")).toContainText(deepQuestions[4].clue);
  let b = await readSnapshot(page);
  expect(b.deepLearningAttempts).toHaveLength(6);
  preserved(b);
  await click(page, "第5話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  b = await readSnapshot(page);
  expect(b.deepLearningAttempts).toHaveLength(6);
  preserved(b);
});
test("five optional deep dives close back to same position, and fixed CNN uses real image values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  await ending(page);
  await click(page, "もっと詳しく学ぶ");
  for (const item of deepDives) {
    const fold = page.locator(".deep-dive").filter({
      has: page.getByText(item.id.slice(-3) + "：" + item.title, {
        exact: true,
      }),
    });
    await fold.locator(":scope > summary").click();
    await expect(fold).toContainText(item.detail);
    if (item.id === "L007-D05") {
      await expect(page.getByTestId("filter-first")).toBeVisible();
      const expected = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = c.height = 8;
        const ctx = c.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, 8, 8);
        const d = ctx.getImageData(0, 0, 8, 8).data,
          gray = Array.from({ length: 64 }, (_, i) =>
            Math.round(
              0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2],
            ),
          );
        return [
          gray[2] - gray[0] + gray[10] - gray[8] + gray[18] - gray[16],
          (gray[0] +
            gray[1] +
            gray[2] +
            gray[8] +
            gray[9] +
            gray[10] +
            gray[16] +
            gray[17] +
            gray[18]) /
            9,
        ];
      }, "/" + pixelSource);
      await expect(page.getByTestId("filter-first")).toHaveText(
        `左上の計算結果：${Number(expected[0].toFixed(3))}`,
      );
      await page
        .getByLabel("固定フィルタ", { exact: true })
        .selectOption("average");
      await expect(page.getByTestId("filter-first")).toHaveText(
        `左上の計算結果：${Number(expected[1].toFixed(3))}`,
      );
      await shot(page, "08-cnn-detail-390");
    }
    await fold
      .getByRole("button", { name: "解説を閉じて元の項目に戻る" })
      .click();
    await expect(fold).not.toHaveAttribute("open");
    await expect(fold.locator(":scope > summary")).toBeInViewport();
  }
  await click(page, "第5話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
});
for (const large of [false, true])
  test(`320px all scenes without overlap/horizontal scroll, enlarged=${large}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await open(page);
    if (large)
      await page.addStyleTag({
        content:
          ".deep-lesson{font-size:28px}.deep-lesson :is(h1,h2,h3,p,span,strong,button,label,summary,dt,dd,li){font-size:inherit!important}",
      });
    async function check() {
      await imgs(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const el of await page
        .locator(
          ".deep-lesson button:visible,.deep-lesson canvas:visible,.deep-lesson .animal-tile:visible",
        )
        .all()) {
        const r = await el.boundingBox();
        expect(r!.x).toBeGreaterThanOrEqual(0);
        expect(r!.x + r!.width).toBeLessThanOrEqual(320);
        if (await el.evaluate((e) => e.tagName === "BUTTON"))
          expect(r!.height).toBeGreaterThanOrEqual(44);
      }
      const list = await page.locator(".scene-body > :visible").all();
      const bounds = await Promise.all(list.map((el) => el.boundingBox()));
      for (let i = 1; i < bounds.length; i++)
        if (bounds[i] && bounds[i - 1])
          expect(bounds[i]!.y).toBeGreaterThanOrEqual(
            bounds[i - 1]!.y + bounds[i - 1]!.height - 1,
          );
    }
    await check();
    await click(page, "写真を見てみる");
    await check();
    await click(page, "ほかの写真も見てみる");
    await page.getByRole("button", { name: /^耳が立った犬/ }).click();
    await check();
    await shot(page, `09-photo-320-large-${large}`);
    await click(page, "AIには写真がどう見えている？");
    await click(page, "拡大する");
    await check();
    await click(page, "写真の情報が進む先を見る");
    await check();
    for (let i = 0; i < 4; i++) await click(page, "1ステップ進む");
    await check();
    await click(page, "どうやって特徴を学ぶの？");
    await check();
    await click(page, "利用時の流れ");
    await check();
    await click(page, "写真以外の使い道も見る");
    await check();
    await click(page, "施設での体験をまとめる");
    await check();
    await shot(page, `10-ending-320-large-${large}`);
    await click(page, "もっと詳しく学ぶ");
    await page
      .getByText("D05：CNN（畳み込みニューラルネットワーク）とは？", {
        exact: true,
      })
      .click();
    await expect(page.getByTestId("filter-first")).toBeVisible();
    await page
      .getByLabel("固定フィルタ", { exact: true })
      .selectOption("average");
    await check();
    await shot(page, `11-cnn-320-large-${large}`);
    await click(page, "第5話のまとめへ戻る");
    await click(page, "ここで終える");
  });
test("offline main story, all six assets, pixel reading and deep text stay available", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(async () => !!(await navigator.serviceWorker.ready).active),
    )
    .toBe(true);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await open(page);
  for (const name of [
    "shelter-welcome",
    "animal-photos",
    "varied-animals",
    "cat-pixel-source",
    "shelter-ending",
    "dl-applications",
  ])
    expect(
      await page.evaluate(async (name) => {
        const r = await fetch(`./illustrations/l007/${name}.png`);
        return r.ok && (await r.blob()).size > 1000;
      }, name),
    ).toBe(true);
  await ending(page);
  await imgs(page);
  await click(page, "もっと詳しく学ぶ");
  for (const item of deepDives) {
    const summary = page.getByText(item.id.slice(-3) + "：" + item.title, {
      exact: true,
    });
    await summary.click();
    await expect(page.getByText(item.easy, { exact: true })).toBeVisible();
    await summary.click();
  }
  await click(page, "第5話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
  expect((await readSnapshot(page)).deepLearning.completed).toBe(true);
});
test("course groups, L006 explicit ending link, old resume and home latest L007 resume", async ({
  page,
}) => {
  const value = structuredClone(old);
  value.fairness!.stage = "ending";
  value.fairness!.visited = [
    "intro",
    "results",
    "investigation",
    "lighting",
    "bias",
    "fairness",
    "ending",
  ];
  await install(page, value);
  await click(page, "コース");
  await expect(
    page.getByRole("heading", { name: "機械学習の基礎編 · 工場の4話" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "ディープラーニング編 · 写真から広がる学び",
    }),
  ).toBeVisible();
  await page
    .locator(".fairness-course")
    .getByRole("button", { name: "続きから学ぶ" })
    .click();
  await expect(
    page.getByRole("button", { name: "ここで終える", exact: true }),
  ).toBeVisible();
  await click(page, "第5話へ：AIはどうやって猫と犬を見分けるの？");
  await photos(page);
  await click(page, "拡大する");
  await saved(page);
  await click(page, "← 戻る・途中終了");
  await click(page, "ホーム");
  await page
    .locator(".hero")
    .getByRole("button", { name: /続きから学ぶ/ })
    .click();
  await expect(page.locator("canvas")).toBeVisible();
  await click(page, "← 戻る・途中終了");
  await click(page, "コース");
  await page
    .locator(".generalization-course")
    .getByRole("button", { name: "続きから学ぶ" })
    .click();
  await expect(page.locator(".generalization-lesson")).toBeVisible();
  expect((await readSnapshot(page)).deepLearning.pixelExpanded).toBe(true);
});
