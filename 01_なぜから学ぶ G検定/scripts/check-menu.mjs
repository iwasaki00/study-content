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
  await page.locator(".generalization-picture img").waitFor();
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
    path: "docs/screenshots/v0.1.8/menu-reversal-390-chromium.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "どの箱で確かめるか振り返る" })
    .click();
  await page.getByRole("button", { name: "ここで終える", exact: true }).click();
  await page.getByText("端末に保存済み", { exact: true }).waitFor();
  console.log(
    `PASS: dist/app ${menuFiles.length} files are byte-identical; menu L005 completed at 390px with local images.`,
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
