/* 新規問題の値は出題定義とは別に記述。集合演算は９ビットで独立検算。 */
const {qs,learning,context}=require('./verify-v02.cjs');
const assert=require('node:assert/strict');
const clone=x=>JSON.parse(JSON.stringify(x));
const get=id=>qs.find(q=>q.id===id),answer=q=>q.choices.find(c=>c.id===q.answerId).shape;
const all=id=>{const q=get(id);return q.board.slice(0,-1).concat(answer(q));};
const values={
  Q41:['direction',[0,90,270,0,180,270,90]],Q42:['direction',[0,135,45,180,90,225,135]],
  Q43:['direction',[0,270,90,0,0,270,90]],Q44:['direction',[45,315,225,135,45]],
  Q46:['direction',[0,90,180,0,90,180,0]],Q47:['position',[1,2,4,3,4,6,5,6]],Q48:['position',[0,2,4,0,2,4,0]],
  Q49:['position',[0,1,2,3,0,1]],Q50:['count',[15,14,12,9,5,0]],Q60:['position',[0,1,2,0,1,2,0]],Q61:['position',[0,1,2,0,1,2]]
};
for(const [id,[key,expected]] of Object.entries(values))assert.deepEqual(all(id).map(s=>s[key]),expected,id);
assert.deepEqual(all('Q43').map(s=>s.mirror),[false,false,true,true,false,false,true]);
assert(all('Q44').every(s=>s.mirror));
assert.deepEqual(all('Q45').map(s=>[s.direction,s.secondDirection]),[[0,0],[90,270],[180,180],[270,90],[0,0]]);
assert.deepEqual(all('Q49').map(s=>s.count),[1,2,3,1,2,3]);
assert.deepEqual(all('Q52').map(s=>[s.position,s.secondPosition]),[[0,4],[1,3],[2,2],[3,1],[4,0],[0,4],[1,3],[2,2]]);
assert.deepEqual(all('Q60').map(s=>s.mirror),[false,true,false,true,false,true,false]);
assert.deepEqual(all('Q61').map(s=>s.paint),['outline','solid','outline','solid','outline','solid']);
all('Q51').forEach((s,i)=>assert.deepEqual(s.cells,[i]));
all('Q59').forEach((s,i)=>{assert.equal(s.direction,45+i%3*90);assert.equal(s.count,1+Math.floor(i/3));assert.equal(s.paint,'striped');});
all('Q63').forEach((s,i)=>{const row=Math.floor(i/3),col=i%3;assert.equal(s.position,col);assert.equal(s.direction,(row+col)*90%360);assert.equal(s.paint,['outline','striped','solid'][col]);});
// 独立した点座標で、回転・反転の観測例を検算。
const base=[[25,20],[78,20],[60,42],[43,42],[43,63],[57,63],[57,80],[25,80]];
const points=s=>base.map(([x,y])=>{x=(x-50)*(s.mirror?-1:1);y-=50;const a=s.direction*Math.PI/180;return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];});
const turn=(p,degrees)=>p.map(([x,y])=>{const a=degrees*Math.PI/180;return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];});
const equal=(a,b)=>a.every((p,i)=>p.every((n,j)=>Math.abs(n-b[i][j])<1e-5));
for(const id of ['Q41','Q42','Q43','Q44']){
  const list=all(id);
  for(let i=1;i<list.length;i++){
    let p=points(list[i-1]);
    p=id==='Q43'&&i%2===0?p.map(([x,y])=>[-x,y]):turn(p,id==='Q41'?(i%2?90:180):id==='Q42'?(i%2?135:-90):-90);
    assert(equal(p,points(list[i])),`${id} independent transition ${i}`);
  }
  const fits=[];
  for(const a of [-135,-90,-45,45,90,135,180])if(list.slice(1,-1).every((s,i)=>equal(turn(points(list[i]),a),points(s))))fits.push(a);
  assert.deepEqual(fits,id==='Q44'?[-90]:[],`${id} no competing fixed turn`);
}
const bits=c=>c.reduce((n,i)=>n|1<<i,0),cells=n=>Array.from({length:9},(_,i)=>i).filter(i=>n&(1<<i));
const rotate=c=>c.map(i=>3*(i%3)+2-Math.floor(i/3)).sort((a,b)=>a-b);
const shift=c=>c.map(i=>3*Math.floor(i/3)+(i%3+1)%3).sort((a,b)=>a-b);
const specs={Q53:['or',0,false,0,false,2],Q54:['and',0,false,0,false,2],Q55:['xor',0,false,0,false,2],Q56:['and',0,false,0,false,3],Q57:['or',1,false,0,false,2],Q58:['or',0,true,0,false,2],Q62:['or',0,false,0,true,2],Q64:['and',0,false,1,true,2]};
function solve(input,op,pre,keep,rotation,movement){
  input=input.map((c,i)=>i===1&&pre?rotate(c):c);
  let n=input.map(bits).reduce((a,b)=>op==='or'?a|b:op==='and'?a&b:a^b);
  let c=cells(n);if(rotation)c=rotate(c);if(movement)c=shift(c);if(keep)c=c.filter(i=>i>=3&&i<=5);return c;
}
for(const [id,spec] of Object.entries(specs)){
  const q=get(id),[op,pre,keep,rotation,movement,inputs]=spec,cols=inputs+1;
  assert.equal(q.columns,cols);assert.equal(q.board.length,cols*3);
  for(let r=0;r<3;r++){
    const input=q.board.slice(r*cols,r*cols+inputs).map(s=>s.cells);
    assert.deepEqual((r===2?answer(q):q.board[r*cols+inputs]).cells,solve(input,op,pre,keep,rotation,movement),`${id} row ${r}`);
  }
  // 自然な候補：OR/AND/XOR、回す順、中央段フィルター、右移動。
  const plausible=[];
  for(const method of ['or','and','xor'])for(const before of [0,1])for(const filter of [false,true])for(const after of [0,1])for(const move of [false,true]){
    if([0,1].every(r=>JSON.stringify(solve(q.board.slice(r*cols,r*cols+inputs).map(s=>s.cells),method,before,filter,after,move))===JSON.stringify(q.board[r*cols+inputs].cells)))plausible.push([method,before,filter,after,move]);
  }
  // 複数の候補が見本に合っても、選択肢の別解が成立してはいけない。
  const possibleAnswers=new Set(plausible.map(p=>JSON.stringify(solve(q.board.slice(2*cols,2*cols+inputs).map(s=>s.cells),...p))));
  assert.equal(q.choices.filter(c=>possibleAnswers.has(JSON.stringify(c.shape.cells))).length,1,`${id} competing recipe answer`);
  if(id==='Q56')assert.notDeepEqual(q.board[3].cells,cells(bits(q.board[0].cells)&bits(q.board[1].cells)),'third input must matter');
  if(id==='Q56')for(let omit=0;omit<3;omit++)assert.notDeepEqual(q.board[3].cells,cells(q.board.slice(0,3).filter((s,i)=>i!==omit).map(s=>bits(s.cells)).reduce((a,b)=>a&b)),`each input matters: ${omit}`);
}
for(const q of qs){
  assert(q.choices.filter(c=>c.id!==q.answerId).every(c=>c.feedback));
  for(const e of q.explanations){const html=context.window.LabExplanations.render(q,e);assert(html.includes('<svg'));assert(!html.includes('undefined'));}
  const before=JSON.stringify(q.board);q.hints.forEach(h=>assert(h.text&&h.focus&&!h.answerId&&!h.shape));assert.equal(JSON.stringify(q.board),before);
}
console.log('V03 DATA PASS: 24 independent audits, 64 definitions, 192 distractors, recipe alternatives, graphical explanation output');
const memory=initial=>{let raw=initial?JSON.stringify(initial):null;return {getItem:()=>raw,setItem:(k,v)=>raw=v};};
const Adaptive=context.window.LabAdaptive;
const make=()=>learning.create(qs,memory());
function balanced(set){assert.equal(set.ids.length,8);assert.equal(new Set(set.ids).size,8);assert(!set.ids.includes('Q01'));const counts=learning.categories.map(c=>set.entries.filter(e=>e.category===c).length);assert(counts.every(n=>n>=1&&n<=4));return Array.from(counts);}
let m=make(),s=m.adaptive();assert.deepEqual(balanced(s),[2,2,2,2]);assert(s.ids.every(id=>get(id).difficulty<=2));assert(s.entries.every(e=>e.reasons.length>=3&&!e.repeated));
for(const category of learning.categories)for(const level of [1,2,3])assert.deepEqual(Array.from(m.practice(category,level)),Array.from(m.practice(category)).filter(id=>get(id).difficulty===level));
const frozen=Array.from(s.ids),snapshot=JSON.stringify(s.entries),profiles=clone(s.profiles);
m.record(frozen[0],get(frozen[0]).answerId,0,{adaptiveId:s.id});assert.equal(m.record(frozen[0],get(frozen[0]).answerId,0,{adaptiveId:s.id}),null);
const saved=clone(m.data);m=learning.create(qs,memory(saved));assert.deepEqual(Array.from(m.adaptive().ids),frozen);assert.equal(JSON.stringify(m.adaptive().entries),snapshot);assert.equal(Object.keys(m.adaptive().answers).length,1);
assert.deepEqual(clone(m.adaptive().profiles),profiles,'selection snapshot stays fixed after reload');
assert.equal(m.data.records[frozen[0]].attempts,1);
assert(Adaptive.guide(qs,m.data).text.includes('記録が少ない'));
const recent=make();const recentSet=Adaptive.select(qs,recent.data,'recent');recentSet.ids.forEach(id=>recent.data.lastSeen[id]=999999);assert(Adaptive.select(qs,recent.data,'recent').ids.every(id=>!recentSet.ids.includes(id)),'avoid recently displayed when alternatives match');
// 一部分野だけ十分でも均等。５問ずつそろってから弱い複数分野へ配分。
m=make();
for(const [index,category] of learning.categories.entries()){
  const selected=qs.filter(q=>q.category===category&&!q.practice).slice(0,5);
  selected.forEach((q,i)=>m.record(q.id,index<2?q.choices.find(c=>c.id!==q.answerId).id:q.answerId,index===1?1:0,{durationMs:1}));
  if(index===0)assert.deepEqual(balanced(Adaptive.select(qs,m.data,'partial')),[2,2,2,2]);
}
s=Adaptive.select(qs,m.data,'weak');const counts=balanced(s);assert(counts[0]+counts[1]>counts[2]+counts[3]);assert(s.enough);assert(Adaptive.guide(qs,m.data).text.includes('基本'));
const slow=clone(m.data);for(const r of Object.values(slow.records))r.first.durationMs=999999;assert.deepEqual(clone(Adaptive.select(qs,slow,'weak')).ids,clone(s.ids),'speed must not change selection');
const multiWeak=make();for(const category of learning.categories)qs.filter(q=>!q.practice&&q.category===category).slice(0,5).forEach(q=>multiWeak.record(q.id,category==='複数ルール'?q.choices.find(c=>c.id!==q.answerId).id:q.answerId,0));const multiGuide=Adaptive.guide(qs,multiWeak.data);assert.equal(multiGuide.category,'複数ルール');assert.equal(multiGuide.level,2);assert(multiWeak.practice(multiGuide.category,multiGuide.level).length>0,'guide must recommend an existing level');
assert(Adaptive.profile(qs,m.data).every(r=>r.level<=2));
// 10回の安定した初見で１→２→３。ヒント多用では発展へ飛ばさない。
m=make();for(const c of learning.categories)qs.filter(q=>!q.practice&&q.category===c).slice(0,10).forEach(q=>m.record(q.id,q.answerId,0));
assert(Adaptive.profile(qs,m.data).every(r=>r.level===3));
for(const q of qs.filter(q=>!q.practice))m.record(q.id,q.answerId,0);
s=Adaptive.select(qs,m.data,'all');balanced(s);assert(s.entries.every(e=>e.repeated));
const allWeak=make();for(const q of qs.filter(q=>!q.practice))allWeak.record(q.id,q.choices.find(c=>c.id!==q.answerId).id,1);assert(Adaptive.select(qs,allWeak.data,'weak-all').ids.every(id=>get(id).difficulty<=2),'do not jump from a weak basic profile to advanced just to find unseen questions');
// 同難易度以下の異なる見た目、元問へのフォールバック、習熟非削除。
m=make();m.record('Q02','a',0);const first=clone(m.data.records.Q02.first);let plan=m.reviewPlan()[0];assert.notEqual(plan.questionId,'Q02');assert.equal(get(plan.questionId).ruleFamily,get('Q02').ruleFamily);assert(get(plan.questionId).difficulty<=2);assert.notEqual(get(plan.questionId).appearance,get('Q02').appearance);
m.record(plan.questionId,get(plan.questionId).answerId,0,{originId:'Q02'});assert(!m.data.reviews.Q02);assert.equal(m.data.mastery[get('Q02').ruleFamily].level,2);const mastery=clone(m.data.mastery);
m.record('Q59','a',0,{originId:'Q02'});assert.deepEqual(clone(m.data.mastery),mastery);assert.deepEqual(clone(m.data.records.Q02.first),first);
const custom=clone(qs);custom.find(q=>q.id==='Q59').difficulty=3;
const higher=learning.create(custom,memory(m.data));assert(higher.higherPlan().some(e=>e.questionId==='Q59'),'failed higher remains available as a challenge');
const cleanHigher=clone(m.data);delete cleanHigher.records.Q59;const proposed=learning.create(custom,memory(cleanHigher));assert(proposed.higherPlan().some(e=>e.questionId==='Q59'));proposed.record('Q59','a',0,{originId:'Q02'});assert.equal(proposed.data.mastery[get('Q02').ruleFamily].level,2);
const rotationReview=make();rotationReview.record('Q08','a',0);assert.equal(rotationReview.reviewPlan()[0].questionId,'Q08','higher variant is not the first review');rotationReview.record('Q08','c',0,{originId:'Q08'});assert(rotationReview.higherPlan().some(e=>e.questionId==='Q43'));rotationReview.record('Q43','a',0,{originId:'Q08'});assert.equal(rotationReview.data.mastery['alternate-rotate-mirror'].level,2);assert(!rotationReview.data.reviews.Q08);
// v2の既存固定セット・レビュー完了・初見を保持。
const legacy=clone(m.data);legacy.version=2;delete legacy.adaptiveSets;delete legacy.mastery;delete legacy.resumeAdaptiveId;
const oldDaily=['Q02','Q04','Q09','Q15','Q22'];legacy.daily['2026-11-21']={ids:oldDaily,answers:{}};
const oldModel=learning.create(qs,memory(legacy));assert.deepEqual(clone(oldModel.data.records),legacy.records);assert.deepEqual(clone(oldModel.data.reviews),legacy.reviews);assert.deepEqual(Array.from(oldModel.daily('2026-11-21').ids),oldDaily);assert.equal(oldModel.data.version,3);
const courseModel=make();let mono=0;const timer=context.window.LabChallenge.create(courseModel,qs,()=>mono),course=timer.begin(5);mono=5000;timer.submit(get(course.ids[0]).answerId,false,course.ids[0]);timer.pause();const v2=clone(courseModel.data);v2.version=2;delete v2.adaptiveSets;delete v2.mastery;delete v2.resumeAdaptiveId;const carried=learning.create(qs,memory(v2));const resumed=context.window.LabChallenge.create(carried,qs,()=>0);assert.deepEqual(clone(resumed.active.ids),v2.challenges[0].ids);assert.deepEqual(clone(resumed.active.answers),v2.challenges[0].answers);assert.equal(resumed.active.elapsedMs,5000);assert.equal(resumed.active.status,'paused');
const corrupt=clone(saved);corrupt.adaptiveSets.push(null,{id:'bad',ids:['Q01']});corrupt.mastery={bad:{level:100}};const restored=learning.create(qs,memory(corrupt));assert.equal(restored.adaptive().ids.length,8);assert(restored.recovered);
const blocked=learning.create(qs,{getItem(){throw Error();},setItem(){throw Error();}});assert.equal(blocked.adaptive().ids.length,8);assert(!blocked.persistent);
console.log('V03 LOGIC PASS: strict levels, cold/partial/weak/all answered profiles, 8 balance/freeze/resume/dedup/reasons, speed exclusion, mastery, v2 compatibility/corruption/storage failure');
console.log('LEVEL COUNTS (Q02–Q64):',JSON.stringify([1,2,3].map(level=>({level,count:qs.filter(q=>!q.practice&&q.difficulty===level).length}))));
module.exports={qs,learning,context};
