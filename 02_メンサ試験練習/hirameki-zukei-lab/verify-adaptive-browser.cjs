const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const KEY='hirameki-zukei-lab:v1';
async function runAdaptiveTests(browser,url,name){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=a=>page.locator(`[data-action="${a}"]`).click();
  const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const finish=async()=>{while(await page.locator('[data-action="step"]:enabled').count())await click('step');await click('next');};
  try{
    await page.goto(url);await click('menu');
    for(const width of [320,390]){
      await page.setViewportSize({width,height:844});await click('practice');
      for(const level of [1,2,3]){
        await page.selectOption('#practice-level',String(level));
        const counts=await page.locator('.menu-options button').allTextContents();assert.equal(counts.length,4);
        if(level===3)assert(await page.locator('[data-category="1"]').isDisabled(),'no advanced movement questions: never substitute another level');
        await page.locator('[data-category="0"]').click();
        assert((await page.locator('.progress').innerText()).includes(`LEVEL ${level}`));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await click('menu');await click('practice');
      }
      await click('menu');await click('records');assert((await page.locator('.learning-guide').innerText()).includes('記録が少ない'));await click('menu');
    }
    await click('adaptive');
    let saved=await state(),set=saved.adaptiveSets.at(-1),ids=set.ids;
    assert.equal(new Set(ids).size,8);assert.equal(new Set(set.entries.map(e=>e.category)).size,4);
    assert((await page.locator('.progress').innerText()).includes('1 / 8'));
    const firstAnswer=await page.evaluate(id=>LabQuestions.find(q=>q.id===id).answerId,ids[0]);
    await page.locator(`[data-choice="${firstAnswer}"]`).focus();await page.keyboard.press('Enter');
    await click('grade');await page.locator('[data-action="grade"]').count().then(n=>assert.equal(n,0));
    const first=JSON.stringify((await state()).records[ids[0]].first);
    await page.reload();assert((await page.locator('.question-heading').innerText()).includes(ids[1]));
    assert.deepEqual((await state()).adaptiveSets.at(-1).ids,ids);
    for(let i=1;i<8;i++){
      assert((await page.locator('.progress').innerText()).includes(`${i+1} / 8`));
      if(i===1)await click('hint');
      const correct=await page.evaluate(id=>LabQuestions.find(q=>q.id===id).answerId,ids[i]);
      await page.locator(`[data-choice="${correct}"]`).click();await click('grade');await finish();
    }
    assert.equal(await page.locator('.result-list article').count(),8);
    assert.equal(JSON.stringify((await state()).records[ids[0]].first),first);
    assert.equal(Object.keys((await state()).adaptiveSets.at(-1).answers).length,8);
    const debug=await page.evaluate(()=>LabDebug.adaptive());assert(debug.entries.every(e=>e.reasons.length>=3));
    assert(await page.evaluate(()=>{const copy=LabDebug.adaptive();copy.ids[0]='Q999';return LabDebug.adaptive().ids[0]!=='Q999';}));
    await page.goto(url+'?debug=1');assert.equal(await page.locator('.result-list article').count(),8);
    assert.deepEqual(JSON.parse(await page.locator('.debug-reasons').textContent()).ids,ids);
    fs.mkdirSync(path.join(__dirname,'screenshots','v0.3.0'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`adaptive-results-${name}.png`),fullPage:true});
    await click('adaptive-new');assert.notEqual((await state()).adaptiveSets.at(-1).id,set.id);
    await click('menu');await click('records');assert.equal(await page.locator('.learning-guide').count(),1);
    // 全回答済みと成熟データのおすすめ、再出題の案内。
    await page.evaluate(()=>{
      const m=LabLearning.create(LabQuestions,localStorage);m.data.adaptiveSets=[];m.data.resumeAdaptiveId=null;
      LabQuestions.filter(q=>!q.practice).forEach(q=>m.record(q.id,q.answerId,0));m.save();
    });
    await page.reload();await click('adaptive');assert((await page.locator('.adaptive-note').innerText()).includes('解いた問題も含みます'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await click('menu');await click('review');
    assert((await page.locator('.mastery-list').innerText()).includes('確認済み'));
    // 実際の問題バンクで、確認済み標準→発展を提案。誤答しても標準の習熟を保持。
    await page.evaluate(()=>{
      const m=LabLearning.create(LabQuestions,localStorage);delete m.data.records.Q43;m.data.resumeAdaptiveId=null;
      m.record('Q08','a',0);m.record('Q08','c',0,{originId:'Q08'});m.save();
    });await page.reload();await click('review');
    assert((await page.locator('.mastery-list').innerText()).includes('LEVEL 2 確認済み'));
    await page.locator('[data-action="higher"][data-question="Q43"]').click();
    await page.locator('[data-choice="a"]').click();await click('grade');await finish();
    assert.equal((await state()).mastery['alternate-rotate-mirror'].level,2);
    assert(!(await state()).reviews.Q08);
    await click('menu');await click('review');
    await page.screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`mastery-review-${name}.png`),fullPage:true});
    // 新しい描画と多段階解説の保存画像。縮小／reduced-motionでも静止内容を維持。
    for(const width of [320,390])for(const id of ['Q41','Q42','Q45','Q56','Q63','Q64']){
      await page.setViewportSize({width,height:844});
      await page.evaluate(({id,key})=>{
        const q=LabQuestions.find(q=>q.id===id),m=LabLearning.create(LabQuestions,{getItem:()=>null,setItem:(k,v)=>localStorage.setItem(k,v)});m.onboard();
        LabQuestions.filter(x=>!x.practice&&x.category===q.category&&x.id!==id).forEach(x=>m.record(x.id,x.answerId,0));m.save();
      },{id,key:KEY});await page.reload();await click('practice');await page.selectOption('#practice-level','0');
      const category=await page.evaluate(id=>LabLearning.categories.indexOf(LabQuestions.find(q=>q.id===id).category),id);
      await page.locator(`[data-category="${category}"]`).click();assert((await page.locator('.question-heading').innerText()).includes(id));
      await page.screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`${id}-${width}-${name}.png`),fullPage:true});
      const a=await page.evaluate(id=>LabQuestions.find(q=>q.id===id).answerId,id);await page.locator(`[data-choice="${a}"]`).click();await click('grade');
      let stage=0;
      do{
        if((id==='Q56'&&stage===0)||(id==='Q64'&&stage===4))await page.screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`${id}-step-${stage+1}-${width}-${name}.png`),fullPage:true});
        if(!await page.locator('[data-action="step"]:enabled').count())break;
        await click('step');stage++;
      }while(true);
      await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:path.join(__dirname,'screenshots','v0.3.0',`${id}-explanation-${width}-${name}.png`),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.emulateMedia({reducedMotion:'no-preference'});
    }
    assert.deepEqual(errors,[]);
    console.log(`${name}: adaptive 8 resume/freeze/results/repeat/debug, strict level filters 320/390, keyboard, guide/mastery UI PASS`);
  }finally{await context.close();}
}
module.exports={runAdaptiveTests};
