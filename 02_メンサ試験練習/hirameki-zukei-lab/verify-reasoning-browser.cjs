const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const KEY='hirameki-zukei-lab:v1';
async function runReasoningTests(browser,url,name){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const r=action=>page.locator(`[data-r="${action}"]`).first().click(),a=action=>page.locator(`[data-action="${action}"]`).first().click();
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} overflow`);
  const shot=async title=>{fs.mkdirSync(path.join(__dirname,'screenshots','v0.4.0'),{recursive:true});await page.screenshot({path:path.join(__dirname,'screenshots','v0.4.0',`${title}-${name}.png`),fullPage:true});};
  async function selectRules(correct){
    const returning=await page.locator('[data-r="change"]').count();if(returning)await r('change');
    const ids=await page.evaluate(({correct,key})=>{const data=JSON.parse(localStorage.getItem(key)),run=data.reasoning.runs.find(r=>r.id===data.reasoning.resumeId),q=LabQuestions.find(q=>q.id===run.ids[run.index]),spec=LabReasoning.specs[q.id];return LabReasoning.groups(q).map(group=>spec.rules.find(h=>h.group===group&&spec.required.includes(h.id)===correct).id);},{correct,key:KEY});
    for(const id of ids)await page.locator(`[data-r="hypothesis"][data-id="${id}"]`).click();
    if(returning)await r('next');
  }
  async function noLeak(){assert.equal(await page.locator('.r-choices').count(),0);assert.equal(await page.locator('.r-board .missing svg').count(),0);assert.equal(await page.locator('.r-board .missing .unknown').count(),1);const text=await page.locator('.reasoning-surface>.eyebrow').innerText();assert(/Q\d+ · (回転・反転|移動・個数|重ね合わせ|複数ルール)/.test(text),'no rule-summary label before grading');}
  async function explain(){while(await page.locator('[data-r="explain-next"]:enabled').count()){await r('explain-next');await overflow();}assert(await page.locator('[data-r="next"]').isEnabled());const related=await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key)),run=data.reasoning.runs.find(r=>r.id===data.reasoning.resumeId),q=LabQuestions.find(q=>q.id===run.ids[run.index]);return LabReasoning.related(LabQuestions,q,data)?.id||null;},KEY);if(related)assert.equal(await page.locator(`[data-r="related"][data-id="${related}"]`).count(),1);await r('next');}
  try{
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});await page.goto(url);
      await page.evaluate(()=>{
        const m=LabLearning.create(LabQuestions,{getItem:()=>null,setItem:(k,v)=>localStorage.setItem(k,v)});m.onboard();m.record('Q02','a',1);m.daily('2026-11-21');m.adaptive();const timer=LabChallenge.create(m,LabQuestions,()=>0);timer.begin(5);timer.pause();m.data.resumeChallengeId=null;m.data.resumeAdaptiveId=null;m.save();
      });await page.reload();const before=await saved();
      await a('reasoning');
      for(let i=1;i<=4;i++){
        await page.locator(`[data-r="lesson"][data-id="L${i}"]`).click();await noLeak();await overflow();
        const features=await page.locator('[data-r="feature"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
        for(const id of features){await page.locator(`[data-r="feature"][data-id="${id}"]`).click();assert.equal(await page.locator(`[data-r="feature"][data-id="${id}"]`).getAttribute('aria-pressed'),'true');await overflow();}
        if(i===1){await page.locator('[data-r="feature"][data-id="symmetry"]').click();assert((await page.locator('.r-concept').innerText()).includes('円'));}
        if(i===2){await page.locator('[data-r="feature"][data-id="cycle"]').click();assert((await page.locator('.r-concept').innerText()).includes('周期'));}
        await r('motion');await r('pause');assert(await page.locator('.reasoning-surface.r-paused').count());await r('replay');
        if(i===1){await page.locator('[data-r="feature"][data-id="landmark"]').click();assert(await page.locator('.r-board .landmark').count());await shot(`lesson-landmark-${width}`);}
        if(i===3){await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.r-transparent .r-input-a').evaluate(n=>getComputedStyle(n).animationName),'none');await shot(`lesson-overlay-${width}`);await page.emulateMedia({reducedMotion:'no-preference'});}
        const vertical=page.locator('[data-r="axis"][data-id="vertical"]');if(await vertical.isEnabled()){await vertical.click();await r('pair');}
        await r('next');await noLeak();await selectRules(false);await r('next');await noLeak();await r('check');
        assert(await page.locator('.r-evidence.fails').count());assert(await page.locator('.r-mismatch').count());
        const st=await saved(),active=st.reasoning.runs.find(x=>x.id===st.reasoning.resumeId),checks=active.states[active.ids[active.index]].checks;
        await page.reload();assert((await page.locator('h2').innerText()).includes('STEP 3'));assert(await page.locator('.r-evidence.fails').count());await noLeak();
        await shot(`lesson-${i}-mismatch-${width}`);
        await selectRules(true);assert(await page.locator('[data-r="next"]').isDisabled());await r('check');assert.equal(await page.locator('.r-evidence.fails').count(),0);assert(await page.locator('.r-evidence.holds').count());await noLeak();
        await r('next');assert.equal(await page.locator('.r-choices .choice').count(),4);assert(await page.locator('[data-r="grade"]').isDisabled());
        const choice=await page.evaluate(({key,wrong})=>{const data=JSON.parse(localStorage.getItem(key)),run=data.reasoning.runs.find(r=>r.id===data.reasoning.resumeId),q=LabQuestions.find(q=>q.id===run.ids[run.index]);return wrong?q.choices.find(c=>c.id!==q.answerId).id:q.answerId;},{key:KEY,wrong:i===1});
        await page.locator(`[data-r="choice"][data-id="${choice}"]`).click();await page.locator('[data-r="grade"]').evaluate(b=>{b.click();b.click();});
        assert.equal(await page.locator('.r-answer-explanation').count(),1);assert(await page.locator('.rule-header').count());await explain();
        assert((await page.locator('h2').innerText()).includes('レッスンを確認'));let data=await saved();assert(data.reasoning.lessons[`L${i}`].completed);assert.equal(data.reasoning.runs.find(x=>x.id===active.id).states[active.ids[0]].checks,checks+1);await r('hub');
      }
      let after=await saved();assert.deepEqual(after.records,before.records);assert.deepEqual(after.daily,before.daily);assert.deepEqual(after.adaptiveSets,before.adaptiveSets);assert.deepEqual(after.challenges,before.challenges);assert.deepEqual(after.reviews,before.reviews);
      await r('guided');
      for(let i=0;i<8;i++){
        assert((await page.locator('.session-nav').innerText()).includes(`${i+1} / 8`));await noLeak();
        if(i===3){
          await page.locator('[data-r="axis"][data-id="horizontal"]').click();await r('motion');
          assert.equal(await page.locator('.r-exact-movement').evaluate(n=>getComputedStyle(n).getPropertyValue('--r-dx').trim()),'27.5px');
          await page.locator('.r-position-source .inner').evaluate(n=>n.getAnimations().forEach(a=>{a.pause();a.currentTime=3000;}));
          assert.equal(await page.locator('.r-position-source .inner').evaluate(n=>getComputedStyle(n).transform),'matrix(1, 0, 0, 1, 27.5, 0)');
          await page.locator('[data-r="axis"][data-id="vertical"]').click();await r('motion');
          assert.equal(await page.locator('.r-exact-movement').evaluate(n=>getComputedStyle(n).getPropertyValue('--r-dy').trim()),'27.5px');
          await page.emulateMedia({reducedMotion:'reduce'});await r('replay');
          assert.equal(await page.locator('.r-position-source .inner').evaluate(n=>getComputedStyle(n).animationName),'none');
          assert.equal(await page.locator('.r-position-source .inner').evaluate(n=>getComputedStyle(n).transform),'matrix(1, 0, 0, 1, 0, 27.5)');
          await shot(`guided-exact-movement-${width}`);await page.emulateMedia({reducedMotion:'no-preference'});
        }
        if(i<2){await r('direct');if(i===0){await r('hint');assert(await page.locator('.r-board.focus-outer').count());}}
        else{
          const id=await page.locator('[data-r="feature"]').nth(1).getAttribute('data-id');await page.locator(`[data-r="feature"][data-id="${id}"]`).focus();await page.keyboard.press('Enter');
          await r('assist');await r('assist');await r('next');await selectRules(true);await r('next');await r('check');await noLeak();await r('next');
        }
        const answer=await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key)),run=data.reasoning.runs.find(r=>r.id===data.reasoning.resumeId);return LabQuestions.find(q=>q.id===run.ids[run.index]).answerId;},KEY);
        await page.locator(`[data-r="choice"][data-id="${answer}"]`).click();await r('grade');
        if(i===6){await page.emulateMedia({reducedMotion:'reduce'});await r('replay');await shot(`guided-multiple-rules-${width}`);await page.emulateMedia({reducedMotion:'no-preference'});}
        await explain();
      }
      assert.equal(await page.locator('.result-list article').count(),8);await page.reload();assert.equal(await page.locator('.result-list article').count(),8);
      after=await saved();const guided=after.reasoning.runs.filter(r=>r.kind==='guided').at(-1);assert(guided.completed);assert.equal(guided.states.Q04.answer.guideUsed,false);assert.equal(guided.states.Q04.answer.hints,1);assert.equal(guided.states.Q06.answer.guideUsed,false);assert.equal(guided.states.Q14.answer.guideUsed,true);
      assert.deepEqual(after.records,before.records);assert.deepEqual(after.daily,before.daily);assert.deepEqual(after.adaptiveSets,before.adaptiveSets);assert.deepEqual(after.challenges,before.challenges);
      await r('hub');await r('menu');await a('records');assert((await page.locator('.reasoning-records').innerText()).includes('ガイド練習：1セット完了'));await shot(`reasoning-records-${width}`);
      await page.evaluate(key=>{const m=LabLearning.create(LabQuestions,localStorage);m.data.lastSeen.Q04=-1;m.data.resumeChallengeId=null;m.data.reasoning.resumeId=null;m.save();},KEY);await page.reload();
      await a('practice');await page.selectOption('#practice-level','1');await page.locator('[data-category="0"]').click();assert((await page.locator('.question-heading').innerText()).includes('Q04'));await page.locator('[data-choice="b"]').click();await a('grade');
      assert.equal((await saved()).records.Q04.first.source,'practice-after-reasoning');
      assert.equal(await page.evaluate(()=>{const m=LabLearning.create(LabQuestions,localStorage);return LabAnalytics.summarize(LabQuestions,m.data,LabLearning.categories).rows[0].denominator;}),0);
      while(await page.locator('[data-action="step"]:enabled').count())await a('step');assert.equal(await page.locator('[data-action="reasoning-related"]').count(),1);
      assert.deepEqual((await saved()).records.Q02.first,before.records.Q02.first);await overflow();
      console.log(`${name} ${width}px: 4 lessons complete, feature/axis/motion controls, hypotheses pass/fail/no answer leak, reload, guided 8, separate records/exposure, same-family link PASS`);
    }
    assert.deepEqual(errors,[]);
    const blocked=await browser.newContext({viewport:{width:320,height:844}});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));const p=await blocked.newPage();await p.goto(url);await p.locator('[data-action="menu"]').click();await p.locator('[data-action="reasoning"]').click();await p.locator('[data-r="lesson"][data-id="L1"]').click();assert((await p.locator('.storage-note').innerText()).includes('保存できません'));await blocked.close();
  }finally{await context.close();}
}
module.exports={runReasoningTests};
