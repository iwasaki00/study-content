import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const root = fileURLToPath(new URL("../app/", import.meta.url));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
async function files(dir, prefix = "") {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + item.name;
    if (item.isDirectory())
      result.push(...(await files(resolve(dir, item.name), name + "/")));
    else result.push(name);
  }
  return result.sort();
}
const menuFiles = await files(root);
assert.deepEqual(menuFiles, await files(dist));
for (const name of menuFiles)
  assert.ok(
    (await readFile(resolve(root, name))).equals(
      await readFile(resolve(dist, name)),
    ),
    `Different build file: ${name}`,
  );
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let target = resolve(root, "." + path);
    if (target !== resolve(root) && !target.startsWith(resolve(root) + sep))
      throw Error("path");
    if ((await stat(target)).isDirectory())
      target = resolve(target, "index.html");
    res.writeHead(200, {
      "Content-Type": mime[extname(target)] ?? "application/octet-stream",
    });
    res.end(await readFile(target));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(4177, "127.0.0.1", r));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("http://127.0.0.1:4177/");
  await page.getByRole("button", { name: "コース", exact: true }).click();
  await page
    .locator('[data-lesson="L005"]')
    .getByRole("button", { name: "第3話を始める" })
    .click();
  await page
    .locator(".generalization-picture img")
    .evaluate((img) => img.decode());
  assert.ok(
    await page
      .locator(".generalization-picture img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  for (const name of [
    "へこみだけを見る判定を試す",
    "ロット番号も見て判定を細かくする",
    "新しく届いた8箱で試す",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  assert.match(
    await page.locator(".generalization-scores tbody tr").nth(1).innerText(),
    /6\/8/,
  );
  await page.screenshot({
    path: "docs/screenshots/v0.2.0/menu-l005-reversal-390-chromium.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "どの箱で確かめるか振り返る" })
    .click();
  await page.getByRole("button", { name: "ここで終える", exact: true }).click();
  await page.getByText("端末に保存済み", { exact: true }).waitFor();

  await page.getByRole("button", { name: "コース", exact: true }).click();
  await page
    .locator('[data-lesson="L006"]')
    .getByRole("button", { name: "第4話を始める" })
    .click();
  await page.locator(".fairness-picture img").evaluate((img) => img.decode());
  await page
    .getByRole("button", { name: "2つのラインで試してみる", exact: true })
    .click();
  assert.match(await page.locator(".fairness-overall").innerText(), /18\/20/);

  await page
    .getByRole("button", { name: "何が違うのか調べる", exact: true })
    .click();
  assert.match(
    await page.locator(".scene-body").innerText(),
    /AIに渡る手がかりが変わり/,
  );
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const style =
      width === 320
        ? await page.addStyleTag({
            content:
              ".fairness-lesson{font-size:28px}.fairness-lesson :is(h1,h2,h3,p,dt,dd,figcaption,button){font-size:inherit!important}",
          })
        : null;
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path:
        "docs/screenshots/v0.2.0/menu-l006-cause-" + width + "-chromium.png",
      fullPage: true,
      animations: "disabled",
    });
    if (style) await style.evaluate((el) => el.remove());
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["照明を見直してみる", "暗いラインの照明を調整する"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.locator(".fairness-picture img").evaluate((img) => img.decode());
  assert.match(
    await page.locator(".fairness-light-scores").innerText(),
    /10\/10/,
  );
  await page.screenshot({
    path: "docs/screenshots/v0.2.0/menu-l006-lighting-390-chromium.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const name of [
    "用意したデータを振り返る",
    "人に関わるAIの判断も考える",
    "第4話をまとめる",
    "ここで終える",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByText("端末に保存済み", { exact: true }).waitFor();

  await page.getByRole("button", { name: "コース", exact: true }).click();
  await page
    .locator(".deep-course")
    .getByRole("button", { name: "第5話を始める" })
    .click();
  await page.locator(".deep-picture img").evaluate((img) => img.decode());
  await page.screenshot({
    path: "docs/screenshots/v0.2.0/menu-l007-intro-390-chromium.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "写真を見てみる", exact: true })
    .click();
  await page.getByRole("button", { name: /^猫の写真/ }).click();
  for (const name of [
    "ほかの写真も見てみる",
    "AIには写真がどう見えている？",
    "拡大する",
    "写真の情報が進む先を見る",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "1ステップ進む", exact: true })
      .click();
  assert.equal(
    await page.locator(".network-demo").getAttribute("data-step"),
    "4",
  );
  for (const name of [
    "どうやって特徴を学ぶの？",
    "利用時の流れ",
    "写真以外の使い道も見る",
    "施設での体験をまとめる",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  await page.locator(".deep-picture img").evaluate((img) => img.decode());
  await page.screenshot({
    path: "docs/screenshots/v0.2.0/menu-l007-ending-390-chromium.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "ここで終える", exact: true }).click();
  await page.getByText("端末に保存済み", { exact: true }).waitFor();
  console.log(
    `PASS: dist/app ${menuFiles.length} files are byte-identical; menu L005/L006/L007 completed at 390px with local images.`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
