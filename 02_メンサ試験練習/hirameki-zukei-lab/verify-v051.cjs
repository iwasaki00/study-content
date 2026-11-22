/* v0.5.1 QUALITY GATE：新機能を増やさず、定義・保存・表示契約を監査する。 */
const {qs,learning,context}=require('./verify-v05.cjs');
const assert=require('node:assert/strict');
const clone=value=>JSON.parse(JSON.stringify(value));
const memory=initial=>{let value=initial?JSON.stringify(initial):null;return {getItem:()=>value,setItem:(key,next)=>{value=next;},get value(){return value;}};};
const now=()=>new Date('2026-11-22T03:00:00Z');
let checks=0;
const check=(value,message)=>{checks++;assert(value,message);};
const equal=(actual,expected,message)=>{checks++;assert.equal(actual,expected,message);};
const deep=(actual,expected,message)=>{checks++;assert.deepEqual(actual,expected,message);};

equal(qs.length,64,'64 questions stay fixed');
equal(qs.filter(q=>q.practice).length,1,'Q01 only tutorial');
for(const q of qs){
  check(q.prompt.length>0,`${q.id} prompt`);
  equal(q.choices.length,4,`${q.id} four choices`);
  equal(q.choices.filter(c=>c.id===q.answerId).length,1,`${q.id} unique answer id`);
  equal(new Set(q.choices.map(c=>JSON.stringify(c.shape))).size,4,`${q.id} visually distinct choices`);
  equal(q.board.filter(x=>x===null).length,1,`${q.id} one missing cell`);
  check(q.explanations.every(e=>e.text&&e.demo&&e.focus),`${q.id} complete explanations`);
  check(q.hints.every(h=>!/(?:正解|答えは|選択肢\s*[1-4一二三四]|[1-4]番が答え)/.test(h.text)),`${q.id} hint does not name answer`);
  check(q.choices.filter(c=>c.id!==q.answerId).every(c=>typeof c.feedback==='string'&&c.feedback.length>0),`${q.id} distractor feedback`);
  check(typeof q.ruleFamily==='string'&&q.ruleFamily.length>0,`${q.id} rule family`);
  check([1,2,3].includes(q.difficulty),`${q.id} difficulty`);
}

const families=Object.groupBy(qs.filter(q=>!q.practice),q=>q.ruleFamily);
for(const [family,items] of Object.entries(families)){
  check(items.every(q=>q.ruleFamily===family),`${family} stable family`);
  check(new Set(items.map(q=>q.category)).size===1,`${family} does not cross broad categories`);
}
const levelCounts=[1,2,3].map(level=>qs.filter(q=>!q.practice&&q.difficulty===level).length);
deep(levelCounts,[28,27,8],'difficulty distribution remains reviewed baseline');

// v0.1.0〜v0.5.0相当（schema 1〜5）を読み込み、初見を変えずに現行schemaへ移行する。
const legacyFirst={choiceId:'a',correct:false,hints:1,status:'解説で確認',at:12345};
for(const version of [1,2,3,4,5]){
  const raw={version,onboarded:true,records:{Q02:{first:legacyFirst,last:legacyFirst,attempts:1}},reviews:{Q02:{originId:'Q02',createdAt:12345}},daily:{},lastSeen:{Q02:12345}};
  if(version>=2)raw.challenges=[];
  if(version>=3){raw.adaptiveSets=[];raw.mastery={};}
  if(version>=4)raw.reasoning=context.window.LabReasoning.blank();
  if(version>=5)raw.history=context.window.LabHistory.blank();
  const model=learning.create(qs,memory(raw),now);
  equal(model.data.version,5,`schema ${version} migrates`);
  deep(clone(model.data.records.Q02.first),legacyFirst,`schema ${version} keeps first`);
  equal(model.data.reviews.Q02.originId,'Q02',`schema ${version} keeps review origin`);
}

const store=memory(),model=learning.create(qs,store,now);
model.record('Q02','a',1,{durationMs:2000});
const first=clone(model.data.records.Q02.first),firstSummary=context.window.LabInsights.summarize(qs,model.data).first;
model.record('Q02','b',0,{originId:'Q02',durationMs:3000});
deep(clone(model.data.records.Q02.first),first,'review never overwrites first');
equal(context.window.LabInsights.summarize(qs,model.data).first.answers,firstSummary.answers,'review does not enter first denominator');
equal(context.window.LabInsights.summarize(qs,model.data).modes.review.answers,1,'review stays separate');

const guided=context.window.LabReasoning.create(model,qs),run=guided.begin('guided');
guided.update(run,state=>{state.phase=3;state.choiceId='a';state.guideUsed=true;});guided.submit(run);
equal(context.window.LabInsights.summarize(qs,model.data).modes.guided.answers,1,'guided result is separate');
equal(context.window.LabInsights.summarize(qs,model.data).first.answers,firstSummary.answers,'guided does not enter first');

const boundary=model.data.history.events[0].at;
equal(learning.jstDate(new Date('2026-11-21T14:59:59.999Z')),'2026-11-21','JST before midnight');
equal(learning.jstDate(new Date('2026-11-21T15:00:00.000Z')),'2026-11-22','JST at midnight');
check(Number.isFinite(boundary),'new answers have real timestamp');
equal(context.window.LabInsights.trend(qs,model.data,7,'first',new Date('2026-11-22T03:00:00Z')).rows.length,7,'7-day boundary');
equal(context.window.LabInsights.trend(qs,model.data,30,'first',new Date('2026-11-22T03:00:00Z')).rows.length,30,'30-day boundary');

console.log(`V051 QUALITY DATA PASS: ${checks} assertions; 64 definitions, hints/feedback/family/difficulty, schema 1-5, mode separation, JST 7/30`);
module.exports={qs,learning,context,checks};
