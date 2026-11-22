const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const KEY='hirameki-zukei-lab:v1';

async function runQualityTests(browser,url,name){
  let checks=0,maxScroll=0;
  const check=(value,message)=>{checks++;assert(value,message);};
  const equal=(actual,expected,message)=>{checks++;assert.equal(actual,expected,message);};
  const widths=[320,375,390,430];
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-11-22T03:00:00Z')});
  const click=action=>page.locator(`[data-action="${action}"]`).first().click();
  const noOverflow=async label=>{equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${label} no horizontal overflow`);maxScroll=Math.max(maxScroll,await page.evaluate(()=>document.documentElement.scrollHeight));};
  const buttonsNamed=async label=>{
    const invalid=await page.locator('button:visible').evaluateAll(nodes=>nodes.filter(node=>!(node.getAttribute('aria-label')||node.textContent.trim())).length);
    equal(invalid,0,`${name} ${label} button accessible names`);
    const short=await page.locator('button:visible:not(:disabled)').evaluateAll(nodes=>nodes.filter(node=>node.getBoundingClientRect().height<43.5).map(node=>node.textContent.trim()));
    assert.deepEqual(short,[],`${name} ${label} button target heights`);checks++;
    equal(await page.locator('[tabindex]').evaluateAll(nodes=>nodes.filter(n=>Number(n.getAttribute('tabindex'))>0).length),0,`${name} ${label} no positive tabindex`);
  };
  async function fresh(){await page.goto(url);await page.evaluate(key=>localStorage.removeItem(key),KEY);await page.reload();}
  async function menu(){if(await page.locator('[data-action="menu"]').count())await click('menu');}
  try{
    await fresh();
    const viewport=await page.locator('meta[name="viewport"]').getAttribute('content');
    check(viewport.includes('width=device-width')&&!/maximum-scale|user-scalable\s*=\s*no/i.test(viewport),'pinch zoom is not disabled');
    const gameStyles=await page.locator('#app').evaluate(node=>{const s=getComputedStyle(node);return {touch:s.touchAction,select:s.userSelect,webkitSelect:s.webkitUserSelect,callout:s.webkitTouchCallout||''};});
    equal(gameStyles.touch,'manipulation','double-tap handling is scoped to game controls');
    check(gameStyles.select==='none'||gameStyles.webkitSelect==='none','long-press selection suppressed in game');

    for(const width of widths){
      await page.setViewportSize({width,height:844});await fresh();
      await noOverflow(`${width} tutorial`);await buttonsNamed(`${width} tutorial`);
      const board=await page.locator('.board').boundingBox(),choices=await page.locator('.choices').boundingBox();
      check(board.x>=0&&board.x+board.width<=width,`${width} board visible`);check(choices.x>=0&&choices.x+choices.width<=width,`${width} choices visible`);
      await page.locator('[data-choice="c"]').click();await click('grade');
      equal(await page.locator('[role="status"]').count()>0,true,`${width} grading status exposed`);await noOverflow(`${width} graded`);await buttonsNamed(`${width} graded`);
      await menu();await buttonsNamed(`${width} menu`);await noOverflow(`${width} menu`);

      await click('challenge');await page.locator('[data-action="challenge-start"][data-count="5"]').click();
      const timer=page.locator('[role="timer"]');equal(await timer.count(),1,`${width} timer role`);check((await timer.getAttribute('aria-label')).includes('残り時間'),`${width} timer accessible label`);await noOverflow(`${width} challenge`);
      await click('challenge-pause');await click('challenge-end');await click('menu');

      await click('records');equal(await page.locator('.trend-bars').getAttribute('aria-hidden'),'true',`${width} graph is decorative`);equal(await page.locator('.trend-numbers table').count(),1,`${width} numeric graph fallback`);await noOverflow(`${width} dashboard`);await buttonsNamed(`${width} dashboard`);
      check((await page.locator('.trend-panel').innerText()).includes('記録なし'),`${width} empty trend stated`);
      await click('menu');await page.locator('[data-action="reasoning"]').click();await page.locator('[data-r="lesson"][data-id="L1"]').click();await noOverflow(`${width} lesson`);await buttonsNamed(`${width} lesson`);
    }

    // 既存の全問320/390監査に加え、中間幅と大きめ端末で全64問の静止レイアウトを確認。
    for(const width of [375,430]){
      await page.setViewportSize({width,height:844});
      for(const id of Array.from({length:64},(_,i)=>`Q${String(i+1).padStart(2,'0')}`)){
        await page.goto(url);await page.evaluate(({key,id})=>{
          const q=LabQuestions.find(q=>q.id===id),records={};
          LabQuestions.filter(x=>!x.practice&&x.category===q.category&&x.id!==id).forEach(x=>records[x.id]={first:{choiceId:x.answerId,correct:true,hints:0,source:'practice'},last:{choiceId:x.answerId,correct:true,hints:0,source:'practice'},attempts:1});
          localStorage.setItem(key,JSON.stringify({version:5,onboarded:id!=='Q01',records,reviews:{},daily:{},lastSeen:{},challenges:[],adaptiveSets:[],mastery:{}}));
        },{key:KEY,id});await page.reload();
        if(id!=='Q01'){await click('practice');await page.locator(`[data-category="${['回転・反転','移動・個数','重ね合わせ','複数ルール'].indexOf(await page.evaluate(id=>LabQuestions.find(q=>q.id===id).category,id))}"]`).click();}
        check((await page.locator('.question-heading .eyebrow').innerText()).startsWith(id),`${name} ${width} ${id} selected`);
        await noOverflow(`${width} ${id}`);
        const clipped=await page.locator('.board,.choices,.shape').evaluateAll((nodes,w)=>nodes.some(n=>{const r=n.getBoundingClientRect();return r.left<0||r.right>w;}),width);
        equal(clipped,false,`${name} ${width} ${id} unclipped`);
      }
    }
    equal(errors.length,0,`${name} no page errors`);
  }finally{await context.close();}

  // 同一オリジンの２タブを順に更新し、外部更新の再読込と回答の共存を確認。
  const tabs=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const a=await tabs.newPage(),b=await tabs.newPage();
  try{
    await a.goto(url);await a.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:5,onboarded:true,records:{},reviews:{},daily:{},lastSeen:{},challenges:[],adaptiveSets:[],mastery:{}})),KEY);await a.reload();await b.goto(url);
    const bReload=b.waitForEvent('load');
    await a.evaluate(()=>{const m=LabLearning.create(LabQuestions,localStorage);m.record('Q09',LabQuestions.find(q=>q.id==='Q09').answerId,0);});
    await bReload;checks++;
    await b.locator('[data-action="practice"]').click();await b.selectOption('#practice-level','1');await b.locator('[data-category="0"]').click();
    check((await b.locator('.question-heading .eyebrow').innerText()).startsWith('Q04'),`${name} second tab uses refreshed model`);
    const aReload=a.waitForEvent('load');await b.locator('[data-choice="b"]').click();await b.locator('[data-action="grade"]').click();await aReload;checks++;
    const records=await a.evaluate(key=>JSON.parse(localStorage.getItem(key)).records,KEY);
    check(records.Q09&&records.Q04,`${name} two-tab answers coexist`);
  }finally{await tabs.close();}

  fs.mkdirSync(path.join(__dirname,'screenshots','v0.5.1'),{recursive:true});
  console.log(`${name} QUALITY UI PASS: ${checks} assertions; widths 320/375/390/430, 64-question 375/430 layout, controls/a11y/timer/graph, two-tab sync; max scroll ${maxScroll}px`);
  return checks;
}
module.exports={runQualityTests};
