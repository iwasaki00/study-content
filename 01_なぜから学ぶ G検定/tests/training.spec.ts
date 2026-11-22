import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { saved, readSnapshot } from "./helpers";
import {
  beginDeepLearning,
  beginFairness,
  beginGeneralization,
  beginEvaluation,
  grade,
} from "../src/engine/learning";
import { deepQuestions } from "../src/data/deepLearning";
import {
  trainingQuestions,
  trainingDives,
  trainingStages,
  trainingAnimals,
  evaluationAnimals,
} from "../src/data/training";
import {
  initialParameters,
  evaluateNetwork,
  learn,
  newTrainingProgress,
} from "../src/engine/training";
const click = async (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true }).click();
const card = (p: Page) => p.locator(".training-course");
async function open(p: Page) {
  await click(p, "コース");
  await card(p)
    .getByRole("button", { name: /第6話を始める|続きから学ぶ/ })
    .click();
  await saved(p);
}
async function toUpdate(p: Page) {
  for (const name of [
    "間違いの理由を調べる",
    "予測と正解を見比べる",
    "内部の数字を調整してみる",
  ])
    await click(p, name);
}
async function toPractice(p: Page) {
  await toUpdate(p);
  await click(p, "1回学習する");
  await saved(p);
  await click(p, "何度も学習してみる");
}
async function ending(p: Page) {
  await toPractice(p);
  await click(p, "50回学習");
  await saved(p);
  await click(p, "新しい動物でも試す");
  await click(p, "学習に使っていない4例を確かめる");
  await saved(p);
  await click(p, "第6話をまとめる");
}
async function images(p: Page) {
  for (const img of await p.locator(".training-lesson img:visible").all())
    await expect
      .poll(() =>
        img.evaluate((n: HTMLImageElement) => n.complete && n.naturalWidth > 0),
      )
      .toBe(true);
}
async function shot(p: Page, name: string) {
  await images(p);
  await p.screenshot({
    path: `docs/screenshots/v0.2.1/${name}-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
const old = beginDeepLearning(
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
);
old.deepLearningAttempts = [
  grade(deepQuestions[0].id, 1, old.deepLearning!.sessionId, deepQuestions),
];
old.completions = ["L003", "L004", "L005", "L006", "L007"].map((lessonId) => ({
  id: `completion-${lessonId}-past`,
  lessonId,
  sessionId: "past",
  recordedAt: "2026-11-01T00:00:00.000Z",
}));
async function install(p: Page, value = old) {
  await p.goto("/");
  await expect(
    p.getByRole("button", { name: /3分で全体像を見る/ }),
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
function preserved(b: any) {
  for (const key of [
    "progress",
    "evaluation",
    "generalization",
    "fairness",
    "deepLearning",
    "attempts",
    "reviews",
    "settings",
    "deepLearningAttempts",
  ])
    expect(b[key]).toEqual(old[key as keyof typeof old]);
  for (const c of old.completions!) expect(b.completions).toContainEqual(c);
}
test("390px story from actual initial mistake through training, separate evaluation and optional-free completion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /3分で全体像を見る/ }).click();
  await click(page, "第6話で、間違いから学ぶ仕組みを試す");
  await expect(page.locator(".training-prediction")).toContainText(
    "AIの現在の判定：犬",
  );
  await shot(page, "01-initial-mistake-390");
  await click(page, "間違いの理由を調べる");
  await shot(page, "02-examples-390");
  await click(page, "予測と正解を見比べる");
  await shot(page, "03-loss-390");
  await click(page, "内部の数字を調整してみる");
  const before = await readSnapshot(page);
  await click(page, "1回学習する");
  await saved(page);
  let b = await readSnapshot(page);
  expect(b.training.updates).toBe(1);
  expect(b.training.parameters).not.toEqual(before.training.parameters);
  for (const line of await page.locator(".training-network line").all()) {
    const id = Number(await line.getAttribute("data-parameter"));
    expect(Number(await line.getAttribute("data-value"))).toBe(
      b.training.parameters[id],
    );
  }
  await shot(page, "04-one-update-390");
  await click(page, "何度も学習してみる");

  await click(page, "50回学習");
  await saved(page);
  await expect(page.locator(".training-prediction")).toContainText(
    "AIの現在の判定：猫",
  );
  await shot(page, "06-training-after-390");
  await click(page, "新しい動物でも試す");
  const weights = (await readSnapshot(page)).training.parameters;
  await click(page, "学習に使っていない4例を確かめる");
  await saved(page);
  await expect(page.locator(".training-test-results")).toContainText("4/4");
  expect((await readSnapshot(page)).training.parameters).toEqual(weights);
  await shot(page, "08-new-animals-390");
  await click(page, "第6話をまとめる");
  await shot(page, "09-ending-390");
  await click(page, "ここで終える");
  await saved(page);
  b = await readSnapshot(page);
  expect(b.training.completed).toBe(true);
  expect(b.trainingAttempts).toBeUndefined();
  expect(errors).toEqual([]);
});

test("0/10/50/100 updates: exact accepted counts, graph data and predictions agree", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const value = structuredClone(old);
  value.training = {
    ...newTrainingProgress(),
    stage: "practice",
    visited: trainingStages.slice(0, 5),
  };
  await install(page, value);
  await open(page);
  await expect(page.getByTestId("training-count")).toHaveText("0");
  await click(page, "10回学習");
  await saved(page);
  await expect(page.locator(".training-dashboard")).toContainText("3/8");
  await shot(page, "05-ten-updates-390");
  await click(page, "最初からやり直す");
  await saved(page);
  await click(page, "50回学習");
  await saved(page);
  await expect(page.getByTestId("training-count")).toHaveText("50");
  await shot(page, "06-fifty-updates-390");
  await click(page, "50回学習");
  await saved(page);
  const b = await readSnapshot(page);
  expect(b.training.updates).toBe(100);
  const real = evaluateNetwork(b.training.parameters, trainingAnimals);
  await expect(page.getByTestId("training-loss")).toHaveText(
    real.loss.toFixed(4),
  );
  expect(
    Number(await page.locator(".training-chart svg").getAttribute("data-loss")),
  ).toBeCloseTo(real.loss, 12);
  await expect(page.locator(".training-chart circle")).toHaveCount(101);
  await shot(page, "07-hundred-updates-390");
});
test("saved weights/history resume, additional updates, guide detour and home latest preserve all five old lessons", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await toPractice(page);
  await click(page, "50回学習");
  await saved(page);
  const before = await readSnapshot(page);
  await click(page, "第0章で関連説明を確認");
  await page.getByRole("button", { name: /第0章を閉じて戻る/ }).click();
  expect(await readSnapshot(page)).toEqual(before);
  await page.reload();
  await page
    .locator(".hero")
    .getByRole("button", { name: /続きから学ぶ/ })
    .click();
  await saved(page);
  await expect(page.getByTestId("training-count")).toHaveText("51");
  await click(page, "10回学習");
  await saved(page);
  const b = await readSnapshot(page);
  b.training.parameters.forEach((v: number, i: number) =>
    expect(v).toBeCloseTo(learn(before.training, 10).parameters[i], 12),
  );
  const expected = learn(before.training, 10).history;
  b.training.history.forEach((h: any, i: number) => {
    expect(h.step).toBe(expected[i].step);
    expect(h.correct).toBe(expected[i].correct);
    expect(h.loss).toBeCloseTo(expected[i].loss, 12);
    expect(h.catScore).toBeCloseTo(expected[i].catScore, 12);
  });
  preserved(b);
});
test("rapid clicks execute one accepted batch, real graph agrees, reset returns initial model without scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  await toPractice(page);
  await page
    .getByRole("button", { name: "10回学習", exact: true })
    .scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await page
    .getByRole("button", { name: "10回学習", exact: true })
    .evaluate((el: HTMLButtonElement) => {
      el.click();
      el.click();
      el.click();
    });
  await saved(page);
  let b = await readSnapshot(page);
  expect(b.training.updates).toBe(11);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  const graph = await page
    .locator(".training-chart circle")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        step: Number(n.getAttribute("data-step")),
        loss: Number(n.getAttribute("data-loss")),
      })),
    );
  expect(graph).toEqual(
    b.training.history.map((h: any) => ({ step: h.step, loss: h.loss })),
  );
  await click(page, "最初からやり直す");
  await saved(page);
  b = await readSnapshot(page);
  expect(b.training.updates).toBe(0);
  expect(b.training.history).toHaveLength(1);
  expect(b.training.parameters).toEqual([...initialParameters]);
});
test("completion restart, old state, real JSON backup and replacement restore stay compatible", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await ending(page);
  await click(page, "ここで終える");
  await saved(page);
  const done = await readSnapshot(page);
  preserved(done);
  await click(page, "記録");
  const download = page.waitForEvent("download");
  await click(page, "JSONをエクスポート");
  const stream = await (await download).createReadStream();
  let body = "";
  for await (const chunk of stream!) body += chunk.toString();
  expect(JSON.parse(body).training).toEqual(done.training);
  await click(page, "コース");
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  let b = await readSnapshot(page);
  expect(b.training.updates).toBe(0);
  expect(b.training.stage).toBe("intro");
  expect(b.completions).toEqual(done.completions);
  preserved(b);
  await click(page, "← 戻る・途中終了");
  await click(page, "記録");
  await page.getByLabel("JSONから復元").setInputFiles({
    name: "v021.json",
    mimeType: "application/json",
    buffer: Buffer.from(body),
  });
  await page.getByLabel("復元方法").selectOption("replace");
  page.once("dialog", (d) => d.accept());
  await click(page, "この内容を復元");
  await saved(page);
  await page.reload();
  await open(page);
  b = await readSnapshot(page);
  expect(b.training.parameters).toEqual(done.training.parameters);
  expect(b.training.completed).toBe(true);
  preserved(b);
});
test("five optional deep dives persist their open state after reload and close back to original item", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  await ending(page);
  await click(page, "もっと詳しく学ぶ");
  for (const item of trainingDives) {
    const fold = page.locator(".training-dive").filter({
      has: page.getByText(item.id.slice(-3) + "：" + item.title, {
        exact: true,
      }),
    });
    await fold.locator(":scope > summary").click();
    await saved(page);
    await expect(fold).toContainText(item.detail);
    if (item.id === "L008-D03") {
      await page.reload();
      await open(page);
      await expect(fold).toHaveAttribute("open");
    }
    await fold
      .getByRole("button", { name: "解説を閉じて元の項目に戻る" })
      .click();
    await saved(page);
    await expect(fold).not.toHaveAttribute("open");
    await expect(fold.locator(":scope > summary")).toBeInViewport();
  }
  await shot(page, "10-details-390");
});
test("all five optional questions and all explanations grade, retain wrong/retake history and old records", async ({
  page,
}) => {
  await install(page);
  await open(page);
  await ending(page);
  await click(page, "G検定の問題で確認する");
  for (let i = 0; i < 5; i++) {
    const q = trainingQuestions[i];
    await expect(page.locator(".question")).toHaveText(q.text);
    if (i === 0) {
      await page.getByRole("radio").nth(0).check();
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
  await expect(page.locator(".feedback")).toContainText(
    trainingQuestions[4].clue,
  );
  const b = await readSnapshot(page);
  expect(b.trainingAttempts).toHaveLength(6);
  preserved(b);
});
for (const large of [false, true])
  test(`320px story, graph and expanded parameters / enlarged=${large}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await open(page);
    if (large)
      await page.addStyleTag({
        content:
          ".training-lesson{font-size:28px}.training-lesson :is(h1,h2,h3,p,span,strong,b,button,summary,dt,dd,li){font-size:inherit!important}",
      });
    async function check() {
      await images(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const el of await page
        .locator(".training-lesson button:visible,.training-lesson svg:visible")
        .all()) {
        const r = await el.boundingBox();
        expect(r!.x).toBeGreaterThanOrEqual(0);
        expect(r!.x + r!.width).toBeLessThanOrEqual(320);
        if (await el.evaluate((e) => e.tagName === "BUTTON"))
          expect(r!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await check();
    for (const name of [
      "間違いの理由を調べる",
      "予測と正解を見比べる",
      "内部の数字を調整してみる",
      "1回学習する",
    ]) {
      await click(page, name);
      await saved(page);
      await check();
    }
    await click(page, "何度も学習してみる");
    await click(page, "50回学習");
    await saved(page);
    await check();
    await page.locator(".training-model > summary").click();
    await saved(page);
    await check();
    await shot(page, `11-training-320-large-${large}`);
    await page.locator(".training-model > summary").click();
    await click(page, "新しい動物でも試す");
    await click(page, "学習に使っていない4例を確かめる");
    await saved(page);
    await check();
    await click(page, "第6話をまとめる");
    await check();
    await click(page, "ここで終える");
  });
test("offline all four new images, whole real training, saved details and completion", async ({
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
    "mistaken-cat",
    "labelled-photos",
    "network-investigation",
    "trained-review",
  ])
    expect(
      await page.evaluate(async (name) => {
        const r = await fetch(`./illustrations/l008/${name}.png`);
        return r.ok && (await r.blob()).size > 1000;
      }, name),
    ).toBe(true);
  await ending(page);
  await click(page, "もっと詳しく学ぶ");
  await page.getByText("D01：損失関数とは何か？", { exact: true }).click();
  await saved(page);
  await expect(
    page.getByText(trainingDives[0].easy, { exact: true }),
  ).toBeVisible();
  await click(page, "第6話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
  await page.reload();
  await open(page);
  expect((await readSnapshot(page)).training.completed).toBe(true);
});
test("L007 ending explicitly opens L008 without replacing existing L007 progress", async ({
  page,
}) => {
  const value = structuredClone(old);
  Object.assign(value.deepLearning!, {
    stage: "ending",
    visited: [
      "intro",
      "photos",
      "pixels",
      "layers",
      "training",
      "uses",
      "ending",
    ],
    examplesShown: true,
    animal: 0,
    pixelExpanded: true,
    networkStep: 4,
    networkSeen: true,
  });
  await install(page, value);
  await click(page, "コース");
  await page
    .locator(".deep-course")
    .getByRole("button", { name: "続きから学ぶ" })
    .click();
  await saved(page);
  const before = await readSnapshot(page);
  await click(page, "第6話へ：AIはどうやって間違いから学ぶの？");
  await saved(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "AIが猫を犬と間違えた",
  );
  expect((await readSnapshot(page)).deepLearning).toEqual(before.deepLearning);
});
