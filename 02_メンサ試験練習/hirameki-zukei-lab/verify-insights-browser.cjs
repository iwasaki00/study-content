const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const KEY='hirameki-zukei-lab:v1';
async function runInsightsTests(browser,url,name){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.clock.install({time:new Date('2026-11-21T03:00:00Z')});
  const click=a=>page.locator(`[data-action="${a}"]`).first().click(),saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} horizontal overflow`);
  const shot=async label=>{fs.mkdirSync(path.join(__dirname,'screenshots','v0.5.0'),{recursive:true});await page.screenshot({path:path.join(__dirname,'screenshots','v0.5.0',`${label}-${name}.png`),fullPage:true});};
  async function fixture(kind){
    await page.goto(url);
    await page.evaluate(({kind,key})=>{
      let at=new Date('2026-11-21T00:00:00Z');const m=LabLearning.create(LabQuestions,{getItem:()=>null,setItem:(k,v)=>localStorage.setItem(k,v)},()=>at);m.onboard();
      if(kind!=='empty')LabReasoning.lessons.forEach(l=>m.data.reasoning.lessons[l.id]={started:true,completed:true});
      if(kind==='sparse'||kind==='mature'){
        const categories=kind==='sparse'?['重ね合わせ']:LabLearning.categories;
        for(const category of categories)LabQuestions.filter(q=>!q.practice&&q.category===category).slice(0,kind==='sparse'?4:5).forEach((q,i)=>{
          at=new Date(i===0?'2026-11-10T00:00:00Z':i===1?'2026-11-20T00:00:00Z':'2026-11-21T00:00:00Z');
          m.record(q.id,category==='重ね合わせ'?q.choices.find(c=>c.id!==q.answerId).id:q.answerId,category==='重ね合わせ'?1:0,{durationMs:1000*(i+1)});
        });
      }
      if(kind==='mature'){
        at=new Date('2026-11-21T00:00:00Z');m.record('Q15','c',0,{durationMs:2000});m.record('Q15','a',1,{originId:'Q15',durationMs:9000});
        m.daily('2026-11-21');m.adaptive();let mono=0;const c=LabChallenge.create(m,LabQuestions,()=>mono),course=c.begin(5);mono=500;c.submit(LabQuestions.find(q=>q.id===course.ids[0]).answerId,false,course.ids[0]);c.pause();
        const r=LabReasoning.create(m,LabQuestions),run=r.begin('guided');r.update(run,s=>{s.phase=3;s.choiceId='b';s.guideUsed=true;});r.submit(run);
      }
      if(kind==='legacy'){
        m.data.records.Q04={first:{correct:true,choiceId:'b',source:'practice'},last:{correct:true,choiceId:'b',source:'practice'},attempts:3,practiceStats:{answers:0,timedCount:0,totalMs:0},reviewStats:{answers:0,timedCount:0,totalMs:0}};
        m.data.lastSeen.Q04=Date.now();m.data.version=4;delete m.data.history;
      }
      if(kind==='review')m.record('Q04','a',0);
      if(kind==='stable')LabQuestions.filter(q=>!q.practice).forEach(q=>m.record(q.id,q.answerId,0,{durationMs:2000}));
      m.data.activeDaily=null;m.data.resumeAdaptiveId=null;m.data.resumeChallengeId=null;m.data.reasoning.resumeId=null;m.save();
    },{kind,key:KEY});await page.reload();await click('records');
  }
  try{
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});await fixture('empty');
      assert((await page.locator('.metric-grid').innerText()).includes('総回答数'));assert((await page.locator('.metric-grid').innerText()).includes('0回'));assert((await page.locator('.trend-panel').innerText()).includes('記録なし'));assert.equal(await page.locator('.recommendation').count(),3);await noOverflow();
      await page.locator('[data-action="insight-recommend"]').first().click();assert((await page.locator('.session-nav').innerText()).includes('LESSON 1'));await page.locator('[data-r="menu"]').count().then(async n=>{if(n)await page.locator('[data-r="menu"]').first().click();else {await page.locator('[data-r="hub"]').first().click();await page.locator('[data-r="menu"]').click();}});
      await fixture('sparse');assert((await page.locator('.insufficient').last().innerText()).includes('記録が不足'));await page.locator('[data-action="insight-recommend"]').first().click();assert(await page.locator('.review-origin').count());
      await fixture('mature');const baseline=await saved();
      const overview=await page.locator('.metric-grid').innerText();assert(overview.includes('24回'));assert(overview.includes('75%（15 / 20問）'));assert(overview.includes('25%（5 / 20問）'));assert(overview.includes('3.0秒'));
      assert((await page.locator('.trend-panel').innerText()).includes('17回答'));assert.equal(await page.locator('.trend-numbers tbody tr').count(),7);
      await page.locator('[data-action="insight-range"][data-days="30"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.trend-numbers tbody tr').count(),30);assert((await page.locator('.trend-panel').innerText()).includes('21回答'));assert.equal(await page.locator(':focus').getAttribute('data-days'),'30');
      await page.selectOption('#insight-mode','first');assert((await page.locator('.trend-panel').innerText()).includes('20回答'));await page.selectOption('#insight-mode','review');assert((await page.locator('.trend-panel').innerText()).includes('1回答'));await page.selectOption('#insight-mode','guided');assert((await page.locator('.trend-panel').innerText()).includes('1回答'));
      assert((await page.locator('.weakness-breakdown').nth(2).innerText()).includes('分類できない誤答'));assert((await page.locator('.recommendation').first().innerText()).includes('重ね合わせ'));await noOverflow();await shot(`dashboard-${width}`);
      const after=await saved();for(const key of ['records','daily','adaptiveSets','challenges','reasoning','mastery'])assert.deepEqual(after[key],baseline[key],`dashboard does not mutate ${key}`);
      await page.locator('[data-action="insight-recommend"]').first().click();assert((await page.locator('.session-nav').innerText()).includes('重ね合わせ'));assert((await page.locator('.progress').innerText()).includes('LEVEL 1'));
      await fixture('legacy');assert((await page.locator('.metric-grid').innerText()).includes('未計測'));assert((await page.locator('.trend-panel').innerText()).includes('記録なし'));assert((await page.locator('.trend-panel').innerText()).includes('日時不明'));assert.equal((await saved()).records.Q04.first.at,undefined);await noOverflow();
      await fixture('review');assert((await page.locator('.recommendation').first().innerText()).includes('同じ規則を復習'));await page.locator('[data-action="insight-recommend"]').first().click();assert((await page.locator('.review-origin').innerText()).includes('Q04'));
      await fixture('stable');assert((await page.locator('.recommendation').first().innerText()).includes('発展'));await page.locator('[data-action="insight-recommend"]').first().click();assert((await page.locator('.progress').innerText()).includes('LEVEL 3'));
      const ids=['Q03','Q22','Q24','Q39','Q40','Q43','Q56','Q57','Q58','Q62','Q63','Q64'];
      for(const id of ids){
        await page.evaluate(({id,key})=>{
          const q=LabQuestions.find(q=>q.id===id),m=LabLearning.create(LabQuestions,{getItem:()=>null,setItem:(k,v)=>localStorage.setItem(k,v)});m.onboard();LabQuestions.filter(x=>!x.practice&&x.category===q.category&&x.id!==id).forEach(x=>m.record(x.id,x.answerId,0));m.save();
        },{id,key:KEY});await page.reload();await click('practice');await page.selectOption('#practice-level','0');
        const category=await page.evaluate(id=>LabLearning.categories.indexOf(LabQuestions.find(q=>q.id===id).category),id);await page.locator(`[data-category="${category}"]`).click();assert((await page.locator('.question-heading').innerText()).includes(id));
        const wrong=await page.evaluate(id=>{const q=LabQuestions.find(q=>q.id===id);return q.choices.find(c=>c.id!==q.answerId).id;},id);await page.locator(`[data-choice="${wrong}"]`).click();await click('grade');assert.equal(await page.locator('.insight-error-visual').count(),1);assert((await page.locator('.insight-error-visual').innerText()).includes('不一致'));assert.equal(await page.locator('.rule-header').count(),1);
        while(await page.locator('[data-action="step"]:enabled').count()){
          await noOverflow();if(id==='Q62'&&await page.locator('.insight-shift-mark').count()){await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.insight-shift-mark').first().evaluate(n=>getComputedStyle(n).transform),'matrix(1, 0, 0, 1, 27.5, 0)');await shot(`Q62-shift-${width}`);await page.emulateMedia({reducedMotion:'no-preference'});}
          await click('step');
        }
        assert(await page.locator('[data-action="next"]').isEnabled());await noOverflow();if(['Q03','Q63','Q64'].includes(id))await shot(`${id}-explanation-${width}`);
      }
      console.log(`${name} ${width}px: empty/sparse/mature/undated dashboards, JST 7/30 and mode filters, explicit error groups, recommendation routes, 12 enhanced explanations, no overflow PASS`);
    }
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
}
module.exports={runInsightsTests};
