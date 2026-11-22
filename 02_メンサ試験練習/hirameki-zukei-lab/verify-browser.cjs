const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { qs } = require('./verify-v05.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const KEY = 'hirameki-zukei-lab:v1';
const server = http.createServer((req,res)=>{
  const name=decodeURIComponent(req.url.split('?')[0]);
  const file=path.resolve(__dirname,`.${name==='/'?'/index.html':name}`);
  if(!file.startsWith(__dirname+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,content)=>{if(e){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(content);
  });
});
async function run(engine,name){
  const browser=await engine.launch({headless:true});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}/`;
    const action=a=>page.locator(`[data-action="${a}"]`).click();
    const choose=id=>page.locator(`[data-choice="${id}"]`).click();
    const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    async function clean(){await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();}
    async function finish(){
      while(await page.locator('[data-action="step"]:enabled').count())await action('step');
      await action('next');
    }
    async function openQuestion(id){
      await page.goto(url);
      await page.evaluate(({id,key})=>{
        const q=LabQuestions.find(q=>q.id===id);
        const fixture={version:1,onboarded:id!=='Q01',records:{},reviews:{},daily:{},lastSeen:{}};
        LabQuestions.filter(other=>other.category===q.category&&!other.practice&&other.id!==id).forEach(other=>{
          fixture.records[other.id]={first:{correct:true,hints:0},attempts:1,last:{correct:true,hints:0}};
        });
        localStorage.setItem(key,JSON.stringify(fixture));
      },{id,key:KEY});
      await page.reload();
      if(id!=='Q01'){
        await action('practice');
        await page.locator(`[data-category="${['回転・反転','移動・個数','重ね合わせ','複数ルール'].indexOf(qs.find(q=>q.id===id).category)}"]`).click();
      }
      assert((await page.locator('.question-heading .eyebrow').innerText()).startsWith(id));
    }
    await clean();
    assert((await page.locator('.question-heading .eyebrow').innerText()).startsWith('Q01'));
    await choose('c');await action('grade');
    assert.equal(await page.locator('.static-match').count(),3);
    await action('replay');await action('next');
    await choose('a');await action('grade');assert((await page.locator('.feedback').innerText()).includes('矢印の下向きは合っています'));
    await finish();await choose('d');await action('grade');await finish();
    assert.equal(await page.locator('.result-list article').count(),2);
    assert((await page.locator('.result-list').innerText()).includes('ヒントなし'));
    await action('tutorial');assert((await page.locator('.eyebrow').innerText()).startsWith('Q01'));
    await action('menu');assert.equal(await page.locator('[data-action="daily"]').count(),1);

    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});
      for(const q of qs){
        await openQuestion(q.id);
        assert(await page.locator('[data-action="grade"]').isDisabled());
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${q.id} ${width} overflow`);
        const rects=await page.locator('.board,.choices,.shape').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right};}));
        assert(rects.every(r=>r.left>=0&&r.right<=width),`${q.id} clipped`);
        if(width===390){const r=await page.locator('.choices').boundingBox();assert(r.y+r.height<810,`${q.id} choices below initial mobile viewport: ${r.y+r.height}`);}
        if((width===320&&q.id==='Q08')||(width===390&&['Q14','Q23'].includes(q.id))){
          fs.mkdirSync(path.join(__dirname,'screenshots','v0.5.0'),{recursive:true});
          await page.screenshot({path:path.join(__dirname,'screenshots','v0.5.0',`${q.id}-${width}-${name}.png`),fullPage:true});
        }
        if(q.hints.length){
          await action('hint');assert.equal(await page.locator('.missing svg').count(),0);
          await action('hint');assert.equal(await page.locator('.missing svg').count(),0);
          assert.equal(await page.locator('.choice.correct').count(),0);
          assert(await page.locator('[data-action="hint"]').isDisabled());
        }
        await choose(q.choices.find(c=>c.id!==q.answerId).id);await choose(q.answerId);
        assert.equal(await page.locator('[aria-pressed="true"]').count(),1);
        await page.locator('[data-action="grade"]').evaluate(b=>{b.click();b.click();});
        assert.equal(await page.locator('.explanation').count(),1);
        if(!q.practice)assert.equal((await stored()).records[q.id].attempts,1);
        if(q.explanations.length>1)assert(await page.locator('[data-action="next"]').isDisabled());
        for(let i=0;i<q.explanations.length;i++){
          if(i)await action('step');
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${q.id} explanation overflow`);
          assert((await page.locator('.board-note').innerText()).length>0);
          if(i){await action('prev');await action('step');}
          await action('replay');
        }
        assert(await page.locator('[data-action="next"]').isEnabled());
      }
      console.log(`${name} ${width}px: all 64 questions, hints, grading lock, explanations, layout PASS`);
    }
    await page.setViewportSize({width:390,height:844});
    const oldFeedback={Q02:{a:'矢印の下向きは合っています',c:'点３つは合っています',d:'点３つは合っています'},Q03:{a:'切り欠きの向きは合っています',b:'穴１つは合っています',c:'向きと個数を'}};
    for(const q of qs.filter(q=>!q.practice))for(const c of q.choices.filter(c=>c.id!==q.answerId)){
      await openQuestion(q.id);await choose(c.id);await action('grade');
      assert((await page.locator('.feedback').innerText()).includes(c.feedback||oldFeedback[q.id][c.id]),`${q.id}/${c.id} feedback`);
    }
    console.log(`${name}: all 189 distractor feedbacks PASS`);

    await clean();await action('menu');await action('review');
    assert((await page.locator('.empty-state').innerText()).includes('いま復習する問題はありません'));
    await action('menu');await action('tutorial');
    await choose('c');await action('grade');await finish();
    await choose('a');await action('grade');await finish();
    await choose('d');await action('grade');await finish();
    const original=JSON.stringify((await stored()).records.Q02.first);
    await action('menu');await action('review');
    assert((await page.locator('.review-list').innerText()).includes('類題 Q59'));
    fs.mkdirSync(path.join(__dirname,'screenshots','v0.5.0'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'screenshots','v0.5.0',`review-${name}.png`),fullPage:true});
    await action('start-review');assert((await page.locator('.review-origin').innerText()).includes('Q02'));
    await action('hint');await choose('c');await action('grade');await finish();
    assert((await stored()).reviews.Q02);
    await action('menu');await action('review');assert((await page.locator('.review-list').innerText()).includes('類題 Q22'));await action('start-review');await action('hint');await choose('b');await action('grade');await finish();
    await action('menu');await action('review');
    assert((await page.locator('.review-list').innerText()).includes('元の問題'));
    await action('start-review');await choose('b');await action('grade');await finish();
    assert.equal(Object.keys((await stored()).reviews).length,0);
    assert.equal(JSON.stringify((await stored()).records.Q02.first),original);
    await action('menu');await action('records');
    await page.locator('.all-question-records summary').click();assert((await page.locator('.record-list article').first().innerText()).includes('初見で不正解'));

    await clean();await action('menu');await action('daily');
    let state=await stored(), date=Object.keys(state.daily)[0], ids=state.daily[date].ids;
    assert.equal(new Set(ids).size,5);assert(!ids.includes('Q01'));
    let q=qs.find(q=>q.id===ids[0]);await choose(q.answerId);await action('grade');
    assert.equal(Object.keys((await stored()).daily[date].answers).length,1);
    await page.reload();assert((await page.locator('.question-heading .eyebrow').innerText()).startsWith(ids[1]));
    assert.deepEqual((await stored()).daily[date].ids,ids);
    for(let i=1;i<5;i++){
      q=qs.find(q=>q.id===ids[i]);await choose(q.answerId);await action('grade');await finish();
    }
    assert((await page.locator('h2').innerText()).includes('今日の５問は完了'));
    await page.reload();assert((await page.locator('h2').innerText()).includes('今日の５問は完了'));
    await action('menu');await action('daily');assert.equal(await page.locator('.result-list article').count(),5);

    // 日本時間23:59に開始、24:01まで開いたままでもセットは固定。
    await page.evaluate(()=>localStorage.clear());
    await page.clock.install({time:new Date('2026-11-20T14:59:00Z')});
    await page.reload();await action('menu');await action('daily');
    ids=(await stored()).daily['2026-11-20'].ids;
    await page.clock.setSystemTime(new Date('2026-11-20T15:01:00Z'));
    await choose(qs.find(q=>q.id===ids[0]).answerId);await action('grade');
    state=await stored();assert.equal(Object.keys(state.daily['2026-11-20'].answers).length,1);assert.equal(state.daily['2026-11-21'],undefined);
    await action('menu');await action('daily');state=await stored();assert.equal(new Set(state.daily['2026-11-21'].ids).size,5);
    assert.deepEqual(state.daily['2026-11-20'].ids,ids);

    await openQuestion('Q19');await choose('c');await action('grade');await action('step');await action('replay');
    await page.locator('.explanation').scrollIntoViewIfNeeded();
    // 動画の中間フレームと、常設している静止画をそれぞれ保存。
    await page.locator('.overlap-stage').evaluate(n=>n.getAnimations({subtree:true}).forEach(animation=>{animation.pause();animation.currentTime=2200;}));
    await page.screenshot({path:path.join(__dirname,'screenshots','v0.5.0',`overlay-moving-${name}.png`),fullPage:true});
    await page.emulateMedia({reducedMotion:'reduce'});await action('replay');
    assert.equal(await page.locator('.layer-result').evaluate(n=>getComputedStyle(n).animationName),'none');
    assert.equal(await page.locator('.layer-result').evaluate(n=>getComputedStyle(n).opacity),'1');
    await page.screenshot({path:path.join(__dirname,'screenshots','v0.5.0',`overlay-still-${name}.png`),fullPage:true});
    await openQuestion('Q03');await choose('d');await action('grade');
    assert.equal(await page.locator('.moving .outer').first().evaluate(n=>getComputedStyle(n).animationName),'none');
    assert.equal(await page.locator('.moving .inner').first().evaluate(n=>getComputedStyle(n).transform),'none');

    const unavailable=await browser.newContext({viewport:{width:320,height:844}});
    await unavailable.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});});
    const offline=await unavailable.newPage();await offline.goto(url);
    assert.equal(await offline.locator('.storage-note').count(),1);
    await offline.locator('[data-choice="c"]').click();await offline.locator('[data-action="grade"]').click();await offline.locator('[data-action="next"]').click();
    await offline.locator('[data-action="menu"]').click();await offline.locator('[data-action="daily"]').click();assert.equal(await offline.locator('.choices button').count(),4);
    await unavailable.close();assert.deepEqual(errors,[]);
    await require('./verify-challenge-browser.cjs').runChallengeTests(browser,url,name);
    await require('./verify-adaptive-browser.cjs').runAdaptiveTests(browser,url,name);
    await require('./verify-reasoning-browser.cjs').runReasoningTests(browser,url,name);
    await require('./verify-insights-browser.cjs').runInsightsTests(browser,url,name);
    await require('./verify-quality-browser.cjs').runQualityTests(browser,url,name);
    console.log(`${name} ${browser.version()}: tutorial regression, review/fallback/first record, daily auto resume/results/JST rollover, reduced motion, blocked storage PASS`);
  }finally{await browser.close();}
}
server.listen(0,'127.0.0.1',async()=>{
  let failed=false;
  await Promise.all([[chromium,'chromium'],[webkit,'webkit']].map(async([engine,name])=>{
    try{await run(engine,name);}catch(e){failed=true;console.error(`${name}: FAIL`,e);}
  }));
  server.close();process.exitCode=failed?1:0;
});
