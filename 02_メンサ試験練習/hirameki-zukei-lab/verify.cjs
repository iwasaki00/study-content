// 検証用のみ。アプリの起動には不要。PLAYWRIGHT_PATHで既存環境を指定できる。
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const data = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'questions.js'), 'utf8'), data);
const questions = data.window.LabQuestions;
assert.equal(questions.length, 3);
assert.deepEqual(Array.from(questions, q => q.answerId), ['c', 'b', 'd']);
for (const q of questions) {
  const correct = q.choices.find(c => c.id === q.answerId).shape;
  assert.equal(correct.direction, q.id === 'Q01' ? 270 : q.id === 'Q02' ? 180 : -180);
  assert.equal(correct.count, q.id === 'Q01' ? 0 : q.id === 'Q02' ? 3 : 1);
  q.board.forEach((shape, i) => {
    if (!shape) { assert.equal(i, q.board.length - 1); return; }
    assert.equal(shape.direction, (q.id === 'Q01' ? i * 90 : (i % 3) * (q.id === 'Q02' ? 90 : -90)) || 0);
    assert.equal(shape.count, q.id === 'Q01' ? 0 : q.id === 'Q02' ? Math.floor(i / 3) + 1 : 3 - Math.floor(i / 3));
  });
}
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(__dirname, name === '/' ? 'index.html' : name);
  if (!file.startsWith(__dirname) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' })[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
async function run(engine, name) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const click = action => page.locator(`[data-action="${action}"]`).click();
    const choose = id => page.locator(`[data-choice="${id}"]`).click();
    async function startAt(question) {
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      if (question > 1) { await choose('c'); await click('grade'); await click('next'); }
      if (question > 2) { await choose('b'); await click('grade'); await click('step'); await click('step'); await click('next'); }
    }
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const question of [1, 2, 3]) {
        await startAt(question);
        assert(await page.locator('[data-action="grade"]').isDisabled());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const rects = await page.locator('.board, .choices, .shape').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { left: r.left, right: r.right }; }));
        assert(rects.every(r => r.left >= 0 && r.right <= width), `clipping ${width} Q${question}`);
        if (width === 390) {
          assert((await page.locator('.choices').boundingBox()).y + (await page.locator('.choices').boundingBox()).height < 700);
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [q, cases] of [[2, { a: '矢印の下向きは合っています', c: '点３つは合っています', d: '点３つは合っています' }], [3, { a: '切り欠きの向きは合っています', b: '穴１つは合っています', c: '向きと個数を' }]]) {
      for (const [id, expected] of Object.entries(cases)) {
        await startAt(q); await choose(id); await click('grade');
        assert((await page.locator('.feedback').innerText()).includes(expected));
      }
    }
    await startAt(2);
    await click('hint'); assert.equal(await page.locator('.missing svg').count(), 0);
    assert.equal(await page.locator('.board.focus-outer').count(), 1);
    await click('hint'); assert.equal(await page.locator('.board.focus-bottom-inner').count(), 1);
    assert.equal(await page.locator('.missing svg').count(), 0);
    await choose('a'); await choose('b');
    assert.equal(await page.locator('[aria-pressed="true"]').count(), 1);
    await page.locator('[data-action="grade"]').evaluate(b => { b.click(); b.click(); });
    assert.equal(await page.locator('.explanation').count(), 1);
    assert(await page.locator('[data-action="next"]').isDisabled());
    await click('step'); await click('step'); await click('prev'); await click('step'); await click('replay');
    await click('next');
    await choose('d'); await click('grade'); await click('step'); await click('step'); await click('next');
    const result = await page.locator('.result-list').innerText();
    assert(result.includes('ヒントを使って正解') && result.includes('自力で正解') && result.includes('ヒントなし'));
    assert.equal(await page.locator('.result-list article').count(), 2);
    await click('restart'); assert((await page.locator('.eyebrow').innerText()).includes('Q01'));
    await choose('a'); await click('grade'); await click('next');
    await choose('a'); await click('grade'); await click('step'); await click('step'); await click('next');
    await click('hint'); await click('hint'); assert.equal(await page.locator('.missing svg').count(), 0);
    await choose('c'); await click('grade'); await click('step'); await click('step'); await click('next');
    assert.equal((await page.locator('.result-list strong').allTextContents()).join(','), '解説で確認,解説で確認');
    await startAt(2);
    fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
    await page.screenshot({ path: path.join(__dirname, 'screenshots', `q02-question-${name}.png`), fullPage: true });
    await choose('b'); await click('grade');
    await page.screenshot({ path: path.join(__dirname, 'screenshots', `q02-explanation-${name}.png`), fullPage: true, animations: 'disabled' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await click('replay');
    assert.equal(await page.locator('.moving .outer').first().evaluate(n => getComputedStyle(n).animationName), 'none');
    assert.equal(await page.locator('.static-match').count(), 2);
    assert.deepEqual(errors, []);
    console.log(`${name}: PASS — widths, choices, feedback, hints, scoring, explanation, restart, reduced motion; browser ${browser.version()}`);
  } finally { await browser.close(); }
}
server.listen(0, '127.0.0.1', async () => {
  let failed = false;
  for (const [engine, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
    try { await run(engine, name); } catch (e) { failed = true; console.error(`${name}: FAIL`, e); }
  }
  server.close(); process.exitCode = failed ? 1 : 0;
});
