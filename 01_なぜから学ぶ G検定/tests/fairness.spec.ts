import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { saved, readSnapshot } from "./helpers";
import {
  beginEvaluation,
  beginGeneralization,
  grade,
} from "../src/engine/learning";
import { evaluationQuestions } from "../src/data/evaluation";
import {
  fairnessQuestions,
  brightEvaluation,
  darkEvaluation,
  brightTraining,
  fairnessDeepDives,
} from "../src/data/fairness";
import { fitConditionModel, evaluateCondition } from "../src/engine/fairness";
const old = beginGeneralization(
  beginEvaluation(
    JSON.parse(
      readFileSync(
        new URL("./fixtures/v0.1.1-backup.json", import.meta.url),
        "utf8",
      ),
    ),
  ),
);
old.evaluationAttempts = [
  grade("L004-Q01", 1, old.evaluation!.sessionId, evaluationQuestions),
];
old.generalization!.stage = "refined";
old.generalization!.visited = ["intro", "practice", "refined"];
old.generalization!.prediction = "refined";
old.completions = ["L003", "L004", "L005"].map((lessonId) => ({
  id: `completion-${lessonId}-past-${lessonId}`,
  lessonId,
  sessionId: `past-${lessonId}`,
  recordedAt: "2026-11-01T00:00:00.000Z",
}));
const model = fitConditionModel(brightTraining),
  bright = evaluateCondition(model, brightEvaluation, 1),
  dark = evaluateCondition(model, darkEvaluation, 0.45),
  after = evaluateCondition(model, darkEvaluation, 1);
const card = (page: Page) =>
  page.locator('.fairness-course[data-lesson="L006"]');
const back = async (page: Page) =>
  page.getByRole("button", { name: "← 戻る・途中終了" }).click();
const click = async (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true }).click();
async function open(page: Page) {
  await click(page, "コース");
  await card(page)
    .getByRole("button", { name: /第4話を始める|続きから学ぶ/ })
    .click();
  await saved(page);
}
async function images(page: Page) {
  for (const image of await page
    .locator(".fairness-picture img,.fairness-box-pair img")
    .all())
    await expect
      .poll(() =>
        image.evaluate(
          (i: HTMLImageElement) => i.complete && i.naturalWidth > 0,
        ),
      )
      .toBe(true);
}
async function shot(page: Page, name: string) {
  await images(page);
  await page.screenshot({
    path: `docs/screenshots/v0.1.9/${name}-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function toLighting(page: Page) {
  for (const name of [
    "2つのラインで試してみる",
    "何が違うのか調べる",
    "照明を見直してみる",
  ])
    await click(page, name);
}
async function toEnding(page: Page) {
  await toLighting(page);
  for (const name of [
    "暗いラインの照明を調整する",
    "用意したデータを振り返る",
    "人に関わるAIの判断も考える",
    "第4話をまとめる",
  ])
    await click(page, name);
}
async function installOld(page: Page, value = old) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "3分で全体像を見る" }),
  ).toBeVisible();
  await page.evaluate(
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
  await page.reload();
}
function preserved(actual: any, expected: any) {
  for (const key of [
    "progress",
    "evaluation",
    "generalization",
    "attempts",
    "evaluationAttempts",
    "reviews",
    "settings",
  ] as const)
    expect(actual[key]).toEqual(expected[key]);
}

test("390px: story and four local illustrations, real per-box results, lighting change, fairness and no-quiz completion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await open(page);
  const before = await readSnapshot(page);
  await expect(page.locator(".scene-body :is(input,select)")).toHaveCount(0);
  await expect(page.locator(".scene-body button")).toHaveCount(1);
  await expect(page.locator(".scene-body")).not.toContainText(
    "サンプリングバイアス",
  );
  await shot(page, "01-new-lines-390");
  await click(page, "2つのラインで試してみる");
  await expect(page.locator(".fairness-overall")).toContainText(
    `${bright.correct + dark.correct}/${bright.total + dark.total}`,
  );
  for (const [name, result] of [
    ["明るいライン", bright],
    ["暗いライン", dark],
  ] as const) {
    const line = page.locator(`[data-line="${name}"]`);
    await expect(line.locator(".fairness-score")).toContainText(
      `${result.correct}/${result.total}`,
    );
    await line.locator("summary").click();
    for (const row of result.rows) {
      const box = line.locator(`[data-box-id="${row.id}"]`);
      await expect(box).toBeVisible();
      await expect(box).toContainText(`実際：${row.actual}`);
      await expect(box).toContainText(`AI：${row.predicted}`);
      await expect(box).toHaveAttribute("data-predicted", row.predicted);
    }
    await line.locator("summary").click();
  }
  await expect(page.locator(".fairness-missed-labels")).toContainText(
    "AIの判定：良品として通した",
  );
  await expect(page.locator(".scene-body")).not.toContainText(
    "サンプリングバイアス",
  );
  await expect(page.locator(".scene-body")).not.toContainText(
    "明るい場所で撮った箱のデータ",
  );
  await shot(page, "02-missed-boxes-390");
  await click(page, "何が違うのか調べる");
  await expect(page.locator(".fairness-conditions")).toContainText(
    "撮影時の照明条件",
  );
  await click(page, "照明を見直してみる");
  await expect(page.locator(".fairness-light-scores")).toContainText("8/10");
  await expect(page.locator(".fairness-light-scores")).not.toContainText(
    "10/10",
  );
  await click(page, "暗いラインの照明を調整する");
  await expect(page.locator(".fairness-light-scores")).toContainText(
    `${after.correct}/${after.total}`,
  );
  for (const id of ["D09", "D10"]) {
    const box = page.locator(`[data-changed-box="${id}"]`);
    await expect(box).toContainText("人の確認：不良");
    await expect(
      box.locator(".fairness-box-pair section").nth(0),
    ).toContainText("AIの判定：良品");
    await expect(
      box.locator(".fairness-box-pair section").nth(1),
    ).toContainText("AIの判定：不良");
  }
  await shot(page, "04-lighting-adjusted-390");
  await click(page, "用意したデータを振り返る");
  await expect(
    page.getByRole("heading", { name: "サンプリングバイアス", exact: true }),
  ).toBeVisible();
  await click(page, "人に関わるAIの判断も考える");
  await expect(page.locator(".notice")).toContainText(
    "社会的な公平性まで証明したわけではありません",
  );
  await shot(page, "06-human-fairness-390");
  await click(page, "第4話をまとめる");
  await expect(page.locator(".fairness-recap li")).toHaveCount(3);
  await shot(page, "07-ending-390");
  await click(page, "ここで終える");
  await saved(page);
  const done = await readSnapshot(page);
  expect(done.fairness.completed).toBe(true);
  expect(done.fairnessAttempts).toBeUndefined();
  preserved(done, before);
  expect(errors).toEqual([]);
});
test("adjusted state resumes from home and returns from related chapter 0 without touching v0.1.8 data", async ({
  page,
}) => {
  await installOld(page);
  await open(page);
  await toLighting(page);
  await click(page, "暗いラインの照明を調整する");
  await saved(page);
  const adjusted = await readSnapshot(page);
  await page.reload();
  await page
    .locator(".hero")
    .getByRole("button", { name: /続きから学ぶ/ })
    .click();
  await expect(page.locator(".fairness-light-scores")).toContainText("10/10");
  await expect(
    page.getByRole("button", {
      name: "暗いラインの照明を調整する",
      exact: true,
    }),
  ).toHaveCount(0);
  await saved(page);
  const before = await readSnapshot(page);
  await click(page, "第0章で関連説明を確認");
  await expect(
    page.getByRole("heading", {
      name: "G検定って、何を学ぶ試験？",
      exact: true,
    }),
  ).toBeInViewport();
  await page.getByRole("button", { name: /第0章を閉じて戻る/ }).click();
  await expect(page.locator(".fairness-light-scores")).toContainText("10/10");
  expect(await readSnapshot(page)).toEqual(before);
  preserved(before, old);
  expect(before.fairness.sessionId).toBe(adjusted.fairness.sessionId);
});
test("restart before and after completion is isolated, preserves history and completions, and backup restores L006", async ({
  page,
}) => {
  await installOld(page);
  await open(page);
  await toLighting(page);
  await click(page, "暗いラインの照明を調整する");
  await saved(page);
  await back(page);
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  const reset = await readSnapshot(page);
  expect(reset.fairness.lightingAdjusted).toBe(false);
  expect(reset.fairness.stage).toBe("intro");
  preserved(reset, old);
  await toEnding(page);
  await click(page, "ここで終える");
  await saved(page);
  const done = await readSnapshot(page);
  expect(
    done.completions.filter((c: any) => c.lessonId === "L006"),
  ).toHaveLength(1);
  for (const c of old.completions!) expect(done.completions).toContainEqual(c);
  await click(page, "記録");
  const downloading = page.waitForEvent("download");
  await click(page, "JSONをエクスポート");
  const stream = await (await downloading).createReadStream();
  let body = "";
  for await (const part of stream!) body += part.toString();
  expect(JSON.parse(body).fairness).toEqual(done.fairness);
  await click(page, "コース");
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  const restarted = await readSnapshot(page);
  expect(restarted.fairness.completed).toBe(false);
  expect(restarted.fairness.sessionId).not.toBe(done.fairness.sessionId);
  expect(restarted.completions).toEqual(done.completions);
  preserved(restarted, old);
  await back(page);
  await click(page, "記録");
  await page.getByLabel("JSONから復元").setInputFiles({
    name: "v019.json",
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
    "使う場所と、影響を受ける人を見る。",
  );
  preserved(await readSnapshot(page), old);
  expect((await readSnapshot(page)).fairness.completed).toBe(true);
});
test("all four original questions grade correctly, explain every option, retain wrong/retake history, and survive restart", async ({
  page,
}) => {
  await installOld(page);
  await open(page);
  await toEnding(page);
  await click(page, "G検定の問題で確認する");
  for (let i = 0; i < fairnessQuestions.length; i++) {
    const q = fairnessQuestions[i];
    await expect(page.locator(".question")).toHaveText(q.text);
    if (i === 0) {
      await page
        .getByRole("radio")
        .nth((q.answer + 1) % 4)
        .check();
      await click(page, "回答を確定");
      await saved(page);
      await expect(page.locator(".feedback")).toContainText(
        "もう一度、理由を確かめよう",
      );
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
    if (i < 3) await click(page, "次の問題");
  }
  await page.reload();
  await open(page);
  await expect(page.locator(".feedback")).toContainText(
    fairnessQuestions[3].clue,
  );
  let state = await readSnapshot(page);
  expect(state.fairnessAttempts).toHaveLength(5);
  preserved(state, old);
  await click(page, "第4話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
  await click(page, "コース");
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  state = await readSnapshot(page);
  expect(state.fairnessAttempts).toHaveLength(5);
  expect(state.fairness.questionIndex).toBe(0);
  preserved(state, old);
});
test("optional explanations A-E, ordered easy/example/details, numerical model and local sources", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  await toEnding(page);
  await click(page, "もっと詳しく学ぶ");
  for (const item of fairnessDeepDives) {
    const fold = page
      .locator(".fairness-deep-dive")
      .filter({ has: page.getByText(item.title, { exact: true }) });
    await fold.locator("summary").click();
    await expect(fold.getByRole("heading", { level: 3 })).toHaveText([
      "やさしい説明",
      "具体例",
      "詳しい説明",
    ]);
    await expect(fold).toContainText(item.detail);
    await fold
      .getByRole("button", { name: "解説を閉じて元の項目に戻る" })
      .click();
    await expect(fold).not.toHaveAttribute("open");
  }
  await page.locator(".fairness-model summary").click();
  await expect(page.locator(".fairness-model")).toContainText("しきい値0.5");
  await expect(page.locator(".fairness-model")).toContainText(
    "実際のカメラ画像による傷検出やディープラーニングではありません",
  );
  await expect(page.locator(".fairness-number-records li")).toHaveCount(30);
  await expect(page.locator(".fairness-model")).toContainText("0.36");
  await expect(page.locator(".fairness-sources a")).toHaveCount(5);
  await shot(page, "optional-details-390");
  await click(page, "第4話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
});
test("L005 ending offers L006 explicitly and both lessons retain independent resume/restart", async ({
  page,
}) => {
  const ending = structuredClone(old);
  ending.generalization!.stage = "ending";
  ending.generalization!.visited = [
    "intro",
    "practice",
    "refined",
    "comparison",
    "ending",
  ];
  await installOld(page, ending);
  await click(page, "コース");
  const previous = page.locator(".generalization-course");
  await previous.getByRole("button", { name: "続きから学ぶ" }).click();
  await expect(
    page.getByRole("button", { name: "ここで終える", exact: true }),
  ).toBeVisible();
  expect((await readSnapshot(page)).fairness).toBeUndefined();
  await click(page, "第4話を開く");
  await toLighting(page);
  await click(page, "暗いラインの照明を調整する");
  await saved(page);
  const state = await readSnapshot(page);
  await back(page);
  await previous.getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  expect((await readSnapshot(page)).fairness).toEqual(state.fairness);
  await back(page);
  await card(page).getByRole("button", { name: "続きから学ぶ" }).click();
  await expect(page.locator(".fairness-light-scores")).toContainText("10/10");
});
for (const large of [false, true])
  test(`320px all scenes, images and labels stay inside viewport / enlarged=${large}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await open(page);
    if (large)
      await page.addStyleTag({
        content:
          ".fairness-lesson{font-size:28px}.fairness-lesson :is(h1,h2,h3,p,span,strong,button,label,legend,summary,dt,dd,li,figcaption){font-size:inherit!important}",
      });
    const check = async () => {
      await images(page);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const item of await page
        .locator(".fairness-lesson :is(button,img,article,fieldset):visible")
        .all()) {
        const b = await item.boundingBox();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(320);
      }
      const nodes = await page.locator(".scene-body > :visible").all();
      const bounds = await Promise.all(nodes.map((n) => n.boundingBox()));
      for (let i = 1; i < bounds.length; i++)
        if (bounds[i] && bounds[i - 1])
          expect(bounds[i]!.y).toBeGreaterThanOrEqual(
            bounds[i - 1]!.y + bounds[i - 1]!.height - 1,
          );
      if (large)
        expect(
          await page
            .locator(".scene-body p")
            .first()
            .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
        ).toBeGreaterThanOrEqual(28);
    };
    await check();
    for (const name of [
      "2つのラインで試してみる",
      "何が違うのか調べる",
      "照明を見直してみる",
      "暗いラインの照明を調整する",
      "用意したデータを振り返る",
      "人に関わるAIの判断も考える",
      "第4話をまとめる",
    ]) {
      await click(page, name);
      await check();
      if (name === "2つのラインで試してみる") {
        for (const summary of await page
          .locator(".fairness-box-records summary")
          .all()) {
          await summary.click();
          await check();
          await summary.click();
        }
      }
      if (name === "暗いラインの照明を調整する")
        await shot(page, large ? "lighting-320-large" : "lighting-320");
    }
    await shot(page, large ? "ending-320-large" : "ending-320");
    await click(page, "もっと詳しく学ぶ");
    await check();
    await page.locator(".fairness-deep-dive summary").nth(3).click();
    await check();
    await click(page, "第4話のまとめへ戻る");
    await click(page, "ここで終える");
    await saved(page);
  });
test("offline: all four PNGs, the whole story, optional explanations, completion and reload", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await open(page);
  await images(page);
  await click(page, "2つのラインで試してみる");
  await images(page);
  await click(page, "何が違うのか調べる");
  await click(page, "照明を見直してみる");
  await click(page, "暗いラインの照明を調整する");
  await images(page);
  await click(page, "用意したデータを振り返る");
  await click(page, "人に関わるAIの判断も考える");
  await images(page);
  await shot(page, "fairness-offline-390");
  await click(page, "第4話をまとめる");
  await click(page, "もっと詳しく学ぶ");
  for (const summary of await page.locator(".fairness-deep-dive summary").all())
    await summary.click();
  await expect(
    page.getByText(fairnessDeepDives[4].detail, { exact: true }),
  ).toBeVisible();
  await click(page, "第4話のまとめへ戻る");
  await click(page, "ここで終える");
  await saved(page);
  await page.reload();
  await open(page);
  expect((await readSnapshot(page)).fairness.completed).toBe(true);
  await context.setOffline(false);
});
