import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { saved, readSnapshot } from "./helpers";
const old = JSON.parse(
  readFileSync(
    new URL("./fixtures/v0.1.1-backup.json", import.meta.url),
    "utf8",
  ),
);
const card = (page: Page) =>
  page.locator('.generalization-course[data-lesson="L005"]');
const back = async (page: Page) =>
  page.getByRole("button", { name: "← 戻る・途中終了" }).click();
async function open(page: Page) {
  await page.getByRole("button", { name: "コース", exact: true }).click();
  await card(page)
    .getByRole("button", { name: /第3話を始める|続きから学ぶ/ })
    .click();
  await saved(page);
}
async function refine(page: Page) {
  await page
    .getByRole("button", { name: "へこみだけを見る判定を試す" })
    .click();
  await page
    .getByRole("button", { name: "ロット番号も見て判定を細かくする" })
    .click();
}
const compare = async (page: Page) =>
  page.getByRole("button", { name: "新しく届いた8箱で試す" }).click();
const end = async (page: Page) =>
  page.getByRole("button", { name: "どの箱で確かめるか振り返る" }).click();
const shot = async (page: Page, name: string) =>
  page.screenshot({
    path: `docs/screenshots/v0.1.8/${name}-${test.info().project.name}.png`,
    fullPage: true,
  });
async function imageLoaded(page: Page) {
  for (const image of await page.locator(".generalization-picture img").all())
    expect(
      await image.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBe(true);
}
async function installOld(page: Page) {
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
      }),
    old,
  );
  await page.reload();
}
test("390px: scores reverse from real rules; prediction and details are optional; finish without quiz", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await open(page);
  const before = await readSnapshot(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "練習では満点。新しい箱では、なぜ間違えた？",
  );
  await expect(page.locator(".scene-body")).not.toContainText("過学習");
  await expect(page.locator(".scene-body button")).toHaveCount(1);
  await imageLoaded(page);
  await shot(page, "practice-intro");
  await page
    .getByRole("button", { name: "へこみだけを見る判定を試す" })
    .click();
  await expect(page.locator(".generalization-headline")).toContainText("7/8");
  await expect(page.locator(".evaluation-verdicts")).toContainText(
    "実際は不良／判定は良品",
  );
  await shot(page, "practice-basic");
  await page
    .getByRole("button", { name: "ロット番号も見て判定を細かくする" })
    .click();
  const practice = page.locator(".generalization-scores tbody tr").first();
  await expect(practice).toContainText("練習用8箱");
  await expect(practice.locator("td").nth(0)).toContainText("7/8");
  await expect(practice.locator("td").nth(1)).toContainText("8/8");
  await expect(page.locator(".scene-body")).not.toContainText("過学習");
  await shot(page, "practice-refined");
  await compare(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "初めて見る箱で、結果が逆転した。",
  );
  const fresh = page.locator(".generalization-scores tbody tr").nth(1);
  await expect(fresh).toContainText("初めて見る8箱");
  await expect(fresh.locator("td").nth(0)).toContainText("8/8");
  await expect(fresh.locator("td").nth(1)).toContainText("6/8");
  await expect(page.locator(".generalization-mistakes article")).toHaveCount(2);
  for (const id of ["N01", "N02"])
    await expect(
      page.locator(`.generalization-mistakes [data-box-id="${id}"]`),
    ).toContainText("実際は良品／判定は不良");
  await imageLoaded(page);
  await shot(page, "unseen-reversal");
  await end(page);
  await expect(
    page.getByRole("heading", { name: "過学習", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "汎化", exact: true }),
  ).toBeVisible();
  await shot(page, "ending");
  await page.getByRole("button", { name: "ここで終える", exact: true }).click();
  await saved(page);
  const after = await readSnapshot(page);
  expect(after.generalization.completed).toBe(true);
  expect(after.generalization.prediction).toBeNull();
  expect(after.progress).toEqual(before.progress);
  expect(after.attempts).toEqual(before.attempts);
  expect(after.evaluation).toEqual(before.evaluation);
  expect(
    after.completions.filter((c: any) => c.lessonId === "L005"),
  ).toHaveLength(1);
});
test("resume prediction/result, restart only L005, keep legacy data and round-trip backup", async ({
  page,
}) => {
  await installOld(page);
  await open(page);
  await refine(page);
  await page
    .getByRole("radio", { name: "細かくした判定", exact: true })
    .check();
  await saved(page);
  const selected = await readSnapshot(page);
  await page.reload();
  await page.getByRole("button", { name: "続きから学ぶ", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "細かくした判定", exact: true }),
  ).toBeChecked();
  expect((await readSnapshot(page)).generalization.sessionId).toBe(
    selected.generalization.sessionId,
  );
  await compare(page);
  await saved(page);
  await page.reload();
  await open(page);
  await expect(page.locator(".generalization-mistakes article")).toHaveCount(2);
  await page.getByRole("button", { name: "第0章で用語を確認" }).click();
  await page.getByRole("button", { name: "第0章を閉じて戻る" }).click();
  await expect(page.locator(".generalization-mistakes article")).toHaveCount(2);
  await end(page);
  await page.getByRole("button", { name: "ここで終える", exact: true }).click();
  await saved(page);
  const done = await readSnapshot(page);
  expect(done.progress).toEqual(old.progress);
  expect(done.attempts).toEqual(old.attempts);
  expect(done.reviews).toEqual(old.reviews);
  await page.getByRole("button", { name: "記録", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONをエクスポート" }).click();
  const stream = await (await downloading).createReadStream();
  let body = "";
  for await (const chunk of stream!) body += chunk.toString();
  expect(JSON.parse(body).generalization).toEqual(done.generalization);
  await page.getByRole("button", { name: "コース", exact: true }).click();
  await card(page).getByRole("button", { name: "最初から学ぶ" }).click();
  await saved(page);
  const restarted = await readSnapshot(page);
  expect(restarted.generalization.stage).toBe("intro");
  expect(restarted.generalization.prediction).toBeNull();
  expect(restarted.generalization.sessionId).not.toBe(
    done.generalization.sessionId,
  );
  expect(restarted.progress).toEqual(old.progress);
  expect(restarted.attempts).toEqual(old.attempts);
  expect(restarted.reviews).toEqual(old.reviews);
  expect(restarted.completions).toEqual(done.completions);
  await refine(page);
  await expect(page.locator(".generalization-scores")).toContainText("8/8");
  await back(page);
  await page.getByRole("button", { name: "記録", exact: true }).click();
  await page
    .getByLabel("JSONから復元")
    .setInputFiles({
      name: "all-three.json",
      mimeType: "application/json",
      buffer: Buffer.from(body),
    });
  await page.getByLabel("復元方法").selectOption("replace");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "この内容を復元" }).click();
  await saved(page);
  await page.reload();
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "どの箱で、確かめた成績？",
  );
  expect((await readSnapshot(page)).generalization).toEqual(
    done.generalization,
  );
});
test("L004 ending offers L005 without auto-navigation, and either lesson can resume independently", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "コース", exact: true }).click();
  const evaluation = page.locator('.evaluation-course[data-lesson="L004"]');
  await evaluation.getByRole("button", { name: "第2話を始める" }).click();
  for (const name of [
    "100箱を流す",
    "別の仕分け設定で試す",
    "見るべき数字を振り返る",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ここで終える", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "試験問題で確認する", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "第3話を開く", exact: true }).click();
  await refine(page);
  await saved(page);
  const g = (await readSnapshot(page)).generalization;
  await back(page);
  await evaluation
    .getByRole("button", { name: "続きから学ぶ", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "数字を見る前に、何を避けたいか。",
  );
  await back(page);
  await evaluation
    .getByRole("button", { name: "最初から学ぶ", exact: true })
    .click();
  await saved(page);
  expect((await readSnapshot(page)).generalization).toEqual(g);
  await back(page);
  await card(page)
    .getByRole("button", { name: "続きから学ぶ", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "練習用の箱では、全部合った。",
  );
});
for (const large of [false, true])
  test(`320px: readable images, labels, buttons and expanded explanation / large=${large}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await open(page);
    if (large)
      await page.addStyleTag({
        content:
          ".generalization-lesson{font-size:28px}.generalization-lesson :is(h1,h2,h3,p,button,span,label,legend,summary,figcaption,td,th,strong,small){font-size:inherit!important}",
      });
    const check = async () => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const items = await page
        .locator(
          ".generalization-lesson :is(button,img,table,fieldset,article):visible",
        )
        .all();
      for (const item of items) {
        const b = await item.boundingBox();
        expect(b!.x).toBeGreaterThanOrEqual(0);
        expect(b!.x + b!.width).toBeLessThanOrEqual(320);
      }
      const boxes = await Promise.all(
        (await page.locator(".scene-body > :visible").all()).map((e) =>
          e.boundingBox(),
        ),
      );
      for (let i = 1; i < boxes.length; i++)
        if (boxes[i] && boxes[i - 1])
          expect(boxes[i]!.y).toBeGreaterThanOrEqual(
            boxes[i - 1]!.y + boxes[i - 1]!.height - 1,
          );
      await imageLoaded(page);
    };
    await check();
    await page
      .getByRole("button", { name: "へこみだけを見る判定を試す" })
      .click();
    await check();
    await page
      .getByRole("button", { name: "ロット番号も見て判定を細かくする" })
      .click();
    await check();
    await compare(page);
    await check();
    await shot(page, large ? "reversal-large-text" : "reversal-320");
    await page
      .getByText("なぜ逆転したのか、詳しく見る", { exact: true })
      .click();
    await check();
    await end(page);
    await check();
    await page.getByText("仕組みを詳しく見る", { exact: true }).click();
    await check();
    await page
      .getByRole("button", { name: "ここで終える", exact: true })
      .click();
    await saved(page);
  });
test("offline local body and both PNGs work through completion and reload", async ({
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
  await imageLoaded(page);
  await refine(page);
  await compare(page);
  await imageLoaded(page);
  await expect(page.locator(".generalization-reason")).toBeVisible();
  await end(page);
  await page.getByRole("button", { name: "ここで終える", exact: true }).click();
  await saved(page);
  await page.reload();
  await open(page);
  await expect(
    page.getByRole("heading", { name: "過学習", exact: true }),
  ).toBeVisible();
  expect((await readSnapshot(page)).generalization.completed).toBe(true);
  await context.setOffline(false);
});
