const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {qs}=require('./verify-v02.cjs');
const KEY='hirameki-zukei-lab:v1';
async function runChallengeTests(browser,url,name){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=a=>page.locator(`[data-action="${a}"]`).click();
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  const active=async()=>{const d=await state();return d.challenges.find(c=>c.id===d.activeChallengeId)||d.challenges.at(-1);};
  const qid=async()=>{const s=await active();return s.ids.find(id=>!s.answers[id]);};
  const choose=async(correct=true)=>{const id=await qid(),q=qs.find(q=>q.id===id);await page.locator(`[data-choice="${correct?q.answerId:q.choices.find(c=>c.id!==q.answerId).id}"]`).click();return id;};
  const shot=async label=>{fs.mkdirSync(path.join(__dirname,'screenshots','v0.3.0'),{recursive:true});await page.screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`${label}-${name}.png`),fullPage:true});};
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  try{
    await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();await click('menu');
    await page.clock.install({time:new Date('2026-11-21T14:59:00Z')});await page.clock.pauseAt(new Date('2026-11-21T14:59:01Z'));
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});await click('challenge');
      assert((await page.locator('.menu-intro').innerText()).includes('独自の練習モード'));
      await page.locator('[data-count="5"]').click();
      let s=await active();assert.equal(new Set(s.ids).size,5);assert(!s.ids.includes('Q01'));
      assert.equal(new Set(s.ids.map(id=>qs.find(q=>q.id===id).category)).size,4);
      assert.equal(await page.locator('[data-action="hint"],.explanation').count(),0);
      assert(await page.locator('[data-action="challenge-submit"]').isDisabled());await noOverflow();
      await page.keyboard.press('Tab');assert(await page.locator(':focus').count()>0);
      await page.clock.fastForward(10000);const before=await active();
      const firstId=await choose();
      await page.locator('[data-action="challenge-submit"]').evaluate(b=>{b.click();b.click();});
      s=await active();assert.equal(Object.keys(s.answers).length,1);assert.equal(s.answers[firstId].correct,true);
      assert.equal(Object.keys((await state()).records).length,0);
      await click('challenge-skip');s=await active();assert.equal(s.answers[s.ids[1]].state,'skipped');
      const savedIds=s.ids;
      await choose(false);await page.reload();
      assert((await page.locator('h2').innerText()).includes('一時停止'));
      s=await active();assert.equal(s.status,'paused');assert.deepEqual(s.ids,savedIds);assert(s.selectedChoice);
      const pausedMs=s.elapsedMs;await page.clock.fastForward(60000);assert.equal((await active()).elapsedMs,pausedMs);
      assert.equal(await page.locator('.board').count(),0,'paused screen conceals diagrams');
      await click('challenge-resume');await page.clock.fastForward(5000);assert((await active()).elapsedMs>=pausedMs+5000);
      await click('challenge-submit');
      await click('challenge-pause');assert.equal((await active()).status,'paused');
      await shot(`challenge-paused-${width}`);await noOverflow();
      if(width===390){
        await click('menu');await page.reload();assert.equal(await page.locator('[data-action="daily"]').count(),1);
        await click('challenge');assert.equal(await page.locator('[data-count]').count(),0);assert.deepEqual((await active()).ids,savedIds);
      }
      await click('challenge-resume');
      // 実タブ切替でvisibilitychangeを観察。ヘッドレスで可視性が変わらなければ通知を模擬。
      const other=await context.newPage();await other.bringToFront();await page.waitForTimeout(100);
      const actual=await page.evaluate(()=>document.hidden);
      if(!actual)await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      assert.equal((await active()).status,'paused');const hiddenMs=(await active()).elapsedMs;
      await page.clock.fastForward(120000);assert.equal((await active()).elapsedMs,hiddenMs);
      await page.bringToFront();if(!actual)await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await other.close();
      assert.equal((await active()).status,'paused','foreground must not auto resume');
      console.log(`${name} ${width}px background visibility: ${actual?'real tab switch':'simulated visibilitychange (headless tab did not hide)'}`);
      await click('challenge-resume');
      const elapsed=(await active()).elapsedMs;
      await page.clock.setSystemTime(new Date('1990-01-01T00:00:00Z'));await page.clock.fastForward(1000);
      assert((await active()).elapsedMs>=elapsed+1000);assert((await active()).elapsedMs<elapsed+2000);
      await page.clock.setSystemTime(new Date('2035-12-31T23:59:00Z'));
      await shot(`challenge-running-${width}`);await noOverflow();
      await page.clock.fastForward(300001);
      s=await active();assert.equal(s.status,'finished');assert.equal(s.reason,'timeout');assert.equal(s.elapsedMs,300000);
      assert((await page.locator('.challenge-results').innerText()).includes('時間切れ・未回答'));
      assert((await page.locator('.challenge-results').innerText()).includes('スキップ・未回答'));
      assert((await page.locator('.challenge-results').innerText()).includes('不正解'));
      assert.equal(Object.keys((await state()).records).length,0);
      await page.locator('[data-action="challenge-detail"]').first().click();assert.equal(await page.locator('.explanation').count(),1);await noOverflow();
      while(await page.locator('[data-action="detail-step"]:enabled').count())await click('detail-step');
      await click('detail-replay');await page.emulateMedia({reducedMotion:'reduce'});await click('detail-replay');
      await page.locator('[data-action="challenge-result"]').click();
      const unseenId=(await active()).ids.at(-1);assert(!(await active()).seenIds.includes(unseenId));
      await page.locator('[data-action="challenge-detail"]').last().click();assert((await active()).seenIds.includes(unseenId));
      await page.locator('[data-action="challenge-result"]').click();await page.reload();assert((await page.locator('h2').innerText()).includes('チャレンジの結果'));
      await shot(`challenge-result-${width}`);await click('menu');await click('records');await noOverflow();await shot(`analytics-${width}`);
      assert((await page.locator('.weakest-note').innerText()).includes('データ不足'));await click('menu');
    }
    await click('challenge');await page.locator('[data-count="10"]').click();
    const ten=await active();assert.equal(new Set(ten.ids).size,10);assert.equal(ten.limitMs,600000);
    const counts=['回転・反転','移動・個数','重ね合わせ','複数ルール'].map(category=>ten.ids.filter(id=>qs.find(q=>q.id===id).category===category).length);
    assert(Math.max(...counts)-Math.min(...counts)<=1);
    for(let i=0;i<10;i++){await choose();await click('challenge-submit');}
    assert.equal((await active()).reason,'complete');assert((await page.locator('.challenge-score').innerText()).includes('10 / 10'));
    await click('menu');await click('challenge');await page.locator('[data-count="5"]').click();await click('challenge-pause');await click('challenge-end');
    assert((await page.locator('.challenge-results').innerText()).includes('中断・未回答'));
    await click('menu');await click('challenge');assert(await page.locator('.history-button').count()>=4);
    await page.evaluate(()=>{
      const m=LabLearning.create(LabQuestions,{getItem:()=>null,setItem:(key,value)=>localStorage.setItem(key,value)});
      m.onboard();
      LabLearning.categories.forEach((category,index)=>{
        LabQuestions.filter(q=>!q.practice&&q.category===category).slice(0,5).forEach((q,i)=>{
          const choice=index===0?q.choices.find(c=>c.id!==q.answerId).id:q.answerId;
          m.record(q.id,choice,i===0?1:0,{durationMs:1000*(i+1)});
        });
      });
      m.record('Q04','b',0,{originId:'Q04',durationMs:99000});m.save();
    });
    await page.reload();await click('records');
    assert((await page.locator('.weakest-note').innerText()).includes('回転・反転'));
    assert((await page.locator('.analysis-list .analysis-card').first().innerText()).includes('0%（0 / 5問）'));
    assert((await page.locator('.analysis-list .analysis-card').first().innerText()).includes('3.0秒'));
    await noOverflow();
    await page.locator('.analysis-list').screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`analytics-populated-${name}.png`)});
    // 欠けたv1保存値を引き継ぎ、初見・日次セット・復習の有効な部分を保持。
    const legacy={version:1,onboarded:true,records:{Q02:{first:{choiceId:'a',correct:false,hints:0,status:'解説で確認',at:100},attempts:1}},reviews:{Q02:{originId:'Q02',createdAt:100}},daily:{'2026-11-21':{ids:['Q02','Q04','Q09','Q15','Q22'],answers:{}}},lastSeen:{Q02:100}};
    await page.evaluate(({key,legacy})=>localStorage.setItem(key,JSON.stringify(legacy)),{key:KEY,legacy});await page.reload();await click('records');
    assert((await page.locator('.legacy-note').first().innerText()).includes('旧版初見'));
    assert.deepEqual((await state()).records.Q02.first,legacy.records.Q02.first);
    await page.evaluate(key=>{
      const ids=['Q02','Q04','Q09','Q15','Q22'],date=LabLearning.jstDate(),answers={};
      ids.forEach(id=>answers[id]={choiceId:LabQuestions.find(q=>q.id===id).answerId,hints:0,id:'Q999',status:'bad'});
      localStorage.setItem(key,JSON.stringify({version:2,onboarded:true,records:{},reviews:{},lastSeen:{},activeDaily:date,daily:{[date]:{ids,answers}}}));
    },KEY);
    await page.reload();assert.equal(await page.locator('.result-list article').count(),5);
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:2,onboarded:true,records:{},daily:{bad:null},reviews:null,lastSeen:[],challenges:[null]})),KEY);
    await page.reload();assert.equal(await page.locator('[data-action="daily"]').count(),1);await click('daily');assert.equal(await page.locator('.choices button').count(),4);
    for(const wrong of ['a','b','d']){
      await page.evaluate(()=>localStorage.clear());await page.reload();
      await page.locator(`[data-choice="${wrong}"]`).click();await click('grade');
      assert((await page.locator('.feedback').innerText()).includes('矢印が回る向き'));
      assert.equal(Object.keys((await state()).records).length,0);
    }
    assert.deepEqual(errors,[]);
    console.log(`${name}: challenge 5/10, skip/timeout/pause/reload/background/clock change/interruption/results/explanations, analytics, v1 corruption recovery, Q01 three wrong choices PASS`);
  }finally{await context.close();}
}
module.exports={runChallengeTests};
