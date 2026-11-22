const {qs,learning,context}=require('./verify-v03.cjs');
const assert=require('node:assert/strict');
const R=context.window.LabReasoning,clone=x=>JSON.parse(JSON.stringify(x));
const get=id=>qs.find(q=>q.id===id),memory=initial=>{let raw=initial?JSON.stringify(initial):null;return {getItem:()=>raw,setItem:(k,v)=>raw=v};};
assert.equal(qs.length,64);assert.equal(R.lessons.length,4);assert.deepEqual(Array.from(R.guidedIds),['Q04','Q06','Q14','Q51','Q15','Q19','Q02','Q23']);
for(const category of learning.categories)assert.equal(R.guidedIds.filter(id=>get(id).category===category).length,2);
for(const [id,spec] of Object.entries(R.specs)){
  const q=get(id);assert(q);assert.equal(spec.names.length,q.explanations.length);assert(spec.order);
  const positive=[];
  // 正解・選択肢を参照すると例外。仮説検証は既知の盤面だけで成立すること。
  const hidden=new Proxy(q,{get(target,key){if(['choices','answerId'].includes(key))throw Error('answer leak');return target[key];}});
  for(const h of spec.rules){
    const check=R.verify(hidden,h.id);assert(check.evidence.length>=2,`${id}/${h.id} other examples`);
    for(const e of check.evidence){assert(q.board[e.target]);assert(e.indices.every(i=>q.board[i]));}
    if(check.holds)positive.push(h.id);else assert(check.evidence.some(e=>!e.match));
  }
  assert.deepEqual(positive,Array.from(spec.required),`${id} valid hypotheses`);
}
// 独立した数値期待値で、差分／周期の反例と２方向・集合演算を確認。
assert.deepEqual(clone(R.verify(get('Q14'),'growing').evidence.map(e=>e.expected.count)),[2,4,7,11]);
assert.deepEqual(clone(R.verify(get('Q14'),'plus-one').evidence.map(e=>e.match)),[true,false,false,false]);
assert.equal(R.verify(get('Q14'),'cycle-three').evidence[2].expected.count,1);
assert.deepEqual(clone(R.verify(get('Q51'),'right').evidence.map(e=>e.expected.cells)),[[1],[2],[4],[5],[7]]);
assert.deepEqual(clone(R.verify(get('Q51'),'down').evidence.map(e=>e.expected.cells)),[[3],[4],[5],[6],[7]]);
assert.deepEqual(clone(R.verify(get('Q15'),'union').evidence.map(e=>e.expected.cells)),[[0,4,8],[1,3,7]]);
assert.deepEqual(clone(R.verify(get('Q19'),'xor').evidence.map(e=>e.expected.cells)),[[0,8],[1,6,7]]);
assert(R.verify(get('Q23'),'mirror').holds);assert(R.verify(get('Q23'),'paint-down').holds);
const changed=clone(get('Q02'));changed.board[4].direction=270;assert(!R.verify(changed,'cw').holds,'must actually check another row');
assert(get('Q06').choices[0].feedback.includes('上下反転'));assert(get('Q06').choices[2].feedback.includes('半回転'));
let m=learning.create(qs,memory()),controller=R.create(m,qs);
const legacyRecords=clone(m.data.records),daily=m.daily('2026-11-21');m.record('Q02','a',1);const first=clone(m.data.records.Q02.first);
const frozenDaily=clone(daily),reviews=clone(m.data.reviews),adaptive=m.adaptive(),frozenAdaptive=clone(adaptive.ids);
const c=context.window.LabChallenge.create(m,qs,()=>0),course=c.begin(5);c.pause();const fixedCourse=clone(course);
let run=controller.begin('lesson','L1');assert.equal(m.data.reasoning.lessons.L1.started,true);assert(!m.data.reasoning.lessons.L1.completed);
let st=controller.current(run);controller.update(run,s=>{s.focus='landmark';s.guideUsed=true;s.phase=2;s.visited=[0,1,2];s.hypotheses=['cw'];});controller.check(run);assert(!R.verify(get('Q04'),'cw').holds);
controller.update(run,s=>{s.hypotheses=['ccw'];s.verified=false;});controller.check(run);assert.equal(st.checks,2);
const storage=memory(m.data),restored=learning.create(qs,storage);controller=R.create(restored,qs);run=controller.resume;st=controller.current(run);assert.equal(st.phase,2);assert.equal(st.focus,'landmark');assert.equal(st.checks,2);assert(st.guideUsed);
controller.update(run,s=>{s.phase=3;s.visited.push(3);s.choiceId='a';});assert(controller.submit(run));assert(!controller.submit(run),'duplicate submit blocked');assert(!controller.finish(run),'must inspect all explanation steps');
controller.update(run,s=>{s.explanationStep=1;s.explained=true;});assert(controller.finish(run));assert(run.completed,'wrong answer still completes observed/verified/explained lesson');assert(restored.data.reasoning.lessons.L1.completed);
assert.deepEqual(clone(restored.data.records.Q02.first),first);assert.equal(restored.data.records.Q04,undefined,'lesson cannot create a normal first');assert.deepEqual(clone(restored.data.reviews),reviews);assert.deepEqual(clone(restored.data.daily['2026-11-21']),frozenDaily);assert.deepEqual(clone(restored.data.adaptiveSets[0].ids),frozenAdaptive);assert.deepEqual(clone(restored.data.challenges[0]),fixedCourse);
restored.record('Q04','b',0);assert.equal(restored.data.records.Q04.first.source,'practice-after-reasoning');const analysis=context.window.LabAnalytics.summarize(qs,restored.data,learning.categories);assert.equal(analysis.rows.find(r=>r.category==='回転・反転').denominator,0);
controller.begin('lesson','L1');assert(restored.data.reasoning.lessons.L1.completed,'redo cannot remove previous completion');
// ガイドなし・ヒントだけ・ガイド利用を別々に保持。８問を全問誤答しても解説確認で完了。
run=controller.begin('guided');for(const [i,id] of run.ids.entries()){
  controller.update(run,s=>{s.phase=3;s.choiceId=get(id).choices.find(c=>c.id!==get(id).answerId).id;s.hints=i===0?1:0;s.guideUsed=i===1;});
  assert(controller.submit(run));controller.update(run,s=>s.explained=true);assert(controller.finish(run));
}
assert(run.completed);assert.equal(run.states.Q04.answer.guideUsed,false);assert.equal(run.states.Q04.answer.hints,1);assert.equal(run.states.Q06.answer.guideUsed,true);assert.equal(run.states.Q06.answer.hints,0);
const saved=clone(restored.data);const again=learning.create(qs,memory(saved));assert.deepEqual(clone(again.data.reasoning.runs.find(r=>r.id===run.id).states),clone(run.states));
const legacy=clone(saved);legacy.version=3;delete legacy.reasoning;const migrated=learning.create(qs,memory(legacy));assert.equal(migrated.data.version,5);assert.deepEqual(clone(migrated.data.records),legacy.records);assert.deepEqual(clone(migrated.data.reviews),legacy.reviews);assert.deepEqual(clone(migrated.data.daily),legacy.daily);assert.deepEqual(clone(migrated.data.adaptiveSets),legacy.adaptiveSets);assert.deepEqual(clone(migrated.data.challenges),legacy.challenges);
const poison=clone(saved);poison.reasoning.runs.push(null,{id:'bad',kind:'guided',ids:['Q999']});poison.reasoning.runs[0].states.Q04.hypotheses=['bad'];poison.reasoning.runs[0].states.Q04.focus='<script>';assert.doesNotThrow(()=>learning.create(qs,memory(poison)));const bad=learning.create(qs,memory(poison));assert(!bad.data.reasoning.runs.some(r=>r.id==='bad'));assert.equal(bad.data.reasoning.runs[0].states.Q04.focus,'all');
const blocked=learning.create(qs,{getItem(){throw Error();},setItem(){throw Error();}});assert(R.create(blocked,qs).begin('guided'));assert(!blocked.persistent);
const related=R.related(qs,get('Q15'),again.data);assert.equal(related.ruleFamily,get('Q15').ruleFamily);assert.equal(related.appearance,'marks-square');assert.equal(R.related(qs,get('Q14'),again.data),null);
console.log('V04 PASS: 4 lessons / 8 guided questions, independent hypothesis evidence, no answer access, mismatch on other rows, completion independent of correctness, resume, guide vs hint, immutable normal records / fixed sets, v3 migration, corruption, related families');
module.exports={qs,learning,context};
