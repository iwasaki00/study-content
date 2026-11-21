const {qs,learning,context}=require('./verify-data.cjs');
const assert=require('node:assert/strict');
const clone=x=>JSON.parse(JSON.stringify(x));
const get=id=>qs.find(q=>q.id===id),answer=q=>q.choices.find(c=>c.id===q.answerId).shape;
const almost=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const base=[[25,20],[78,20],[60,42],[43,42],[43,63],[57,63],[57,80],[25,80]].map(([x,y])=>[x-50,y-50]);
const turn=(points,angle)=>points.map(([x,y])=>{const a=angle*Math.PI/180;return [x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];});
const points=s=>turn(base.map(([x,y])=>[s.mirror?-x:x,y]),s.direction);
const compare=(a,b)=>a.forEach((p,i)=>p.forEach((v,j)=>almost(v,b[i][j])));
for(const [id,angles] of [['Q25',[0,315,270,225,180]],['Q26',[0,135,270,45,180]],['Q28',[0,90,45,135,90,180,135]]]){
  const q=get(id),all=q.board.slice(0,-1).concat(answer(q));assert.deepEqual(all.map(s=>s.direction),angles);
  for(let i=1;i<all.length;i++)compare(turn(points(all[i-1]),id==='Q25'?-45:id==='Q26'?135:i%2?90:-45),points(all[i]));
  const candidates=[];
  for(const degrees of [-135,-90,-45,45,90,135,180])if(all.slice(1,-1).every((s,i)=>{
    try{compare(turn(points(all[i]),degrees),points(s));return true;}catch{return false;}
  }))candidates.push(degrees);
  assert.deepEqual(candidates,id==='Q25'?[-45]:id==='Q26'?[135]:[]);
}
{
  const q=get('Q27'),all=q.board.slice(0,-1).concat(answer(q));
  for(let i=1;i<all.length;i++)compare(points(all[i-1]).map(([x,y])=>[y,x]),points(all[i]));
}
for(const [id,key,values] of [['Q29','position',[1,4,2,0,3,1]],['Q30','position',[4,5,3,4,2,3,1]],['Q31','count',[2,5,4,7,6,9,8]],['Q32','count',[9,10,8,9,7,8,6]]]){
  const q=get(id);assert.deepEqual(q.board.slice(0,-1).concat(answer(q)).map(s=>s[key]),values);
}
const bits=a=>a.reduce((n,i)=>n|(1<<i),0),cells=n=>Array.from({length:9},(_,i)=>i).filter(i=>n&(1<<i));
const rotate=a=>a.map(i=>(i%3)*3+2-Math.floor(i/3)).sort((a,b)=>a-b);
for(const id of ['Q33','Q34','Q35','Q36','Q40']){
  const q=get(id),op=id==='Q33'?'or':['Q34','Q40'].includes(id)?'and':'xor';
  const candidates=[];
  for(const method of ['or','and','xor'])for(const turns of (id==='Q40'?[0,1,2,3]:[0])){
    let fits=true;
    for(let r=0;r<3;r++){
      const a=q.board[r*3].cells,b=q.board[r*3+1].cells;
      assert(a.some(i=>b.includes(i))&&a.some(i=>!b.includes(i))&&b.some(i=>!a.includes(i)));
      let expected=cells(method==='or'?bits(a)|bits(b):method==='and'?bits(a)&bits(b):bits(a)^bits(b));
      for(let t=0;t<turns;t++)expected=rotate(expected);
      if(r<2&&JSON.stringify(expected)!==JSON.stringify(q.board[r*3+2].cells))fits=false;
      if(method===op&&turns===(id==='Q40'?3:0))assert.deepEqual(expected,(r<2?q.board[r*3+2]:answer(q)).cells,`${id} row ${r}`);
    }
    if(fits)candidates.push(`${method}:${turns}`);
  }
  assert.deepEqual(candidates,[`${op}:${id==='Q40'?3:0}`]);
}
for(const id of ['Q37','Q38','Q39']){
  const q=get(id);q.board.slice(0,-1).concat(answer(q)).forEach((s,i)=>{
    const r=Math.floor(i/3),c=i%3;
    if(id==='Q37'){assert.equal(s.position,3-c);assert.equal(s.count,3-r);}
    if(id==='Q38'){assert.equal(s.direction,45+90*c);assert.equal(s.paint,['outline','striped','solid'][r]);}
    if(id==='Q39'){assert.equal(s.position,r);assert.equal(s.mirror,c===1);}
  });
}
// 解説の変換結果を静止正解と照合。ソースの図形は独立した座標計算で変換。
for(const q of qs)for(const e of q.explanations){
  if(e.demo==='transform'||e.demo==='component-mirror'){
    const s=q.board[e.from],target=e.to==='answer'?answer(q):q.board[e.to];
    if(!['flag','moving-flag'].includes(s.kind))continue;
    const op=e.demo==='component-mirror'?'mirror-x':e.transform;
    const before=points(s);
    const result=op==='mirror-x'?before.map(([x,y])=>[-x,y]):op==='mirror-y'?before.map(([x,y])=>[x,-y]):op==='diagonal'?before.map(([x,y])=>[y,x]):turn(before,{cw:90,ccw:-90,half:180,ccw45:-45,cw135:135}[op]);
    compare(result,points(target));
  }
}
console.log('V02 DATA PASS: 16 added questions, independent geometry/count/set checks, static/animation targets, alternative rules');

const memory=initial=>{let raw=initial===undefined?null:typeof initial==='string'?initial:JSON.stringify(initial);return {getItem:()=>raw,setItem:(k,v)=>{raw=v;},get raw(){return raw;}};};
const Challenge=context.window.LabChallenge,Analytics=context.window.LabAnalytics;
const legacyFirst={choiceId:'a',correct:false,hints:0,status:'解説で確認',at:100};
const legacy={version:1,onboarded:true,records:{Q02:{first:legacyFirst,last:legacyFirst,attempts:3}},reviews:{Q02:{originId:'Q02',createdAt:100}},daily:{'2026-11-21':{ids:['Q02','Q04','Q09','Q15','Q22'],answers:{}}},lastSeen:{Q02:100},activeDaily:'2026-11-21'};
const store=memory(legacy);let m=learning.create(qs,store);m.record('Q02','b',0,{durationMs:5000});
assert.deepEqual(clone(m.data.records.Q02.first),legacyFirst);m.save();m=learning.create(qs,store);
assert.equal(m.data.version,3);assert.deepEqual(Array.from(m.daily('2026-11-21').ids),legacy.daily['2026-11-21'].ids);
assert.equal(m.data.activeDaily,'2026-11-21');assert(m.data.reviews.Q02);assert.equal(m.reviewPlan()[0].questionId,'Q59');
assert.deepEqual(clone(m.data.records.Q02.first),legacyFirst);
const poisoned=clone(legacy);poisoned.daily['2026-11-21'].answers.Q02={choiceId:'b',hints:0,id:'Q999',status:'bad'};
const safeDaily=learning.create(qs,memory(poisoned)).daily('2026-11-21');
assert.equal(safeDaily.answers.Q02.id,undefined);assert.equal(safeDaily.answers.Q02.status,'自力で正解');
for(const raw of ['{bad','null','[]',{}, {version:2,records:{Q02:null,Q03:{first:legacyFirst,attempts:'broken'}},daily:{'2026-11-21':null},reviews:null,lastSeen:[],challenges:[null,{id:'c-bad',ids:['Q01']}] }]){
  const restored=learning.create(qs,memory(raw));assert.equal(restored.daily('2026-11-21').ids.length,5);restored.record('Q04','b',0,{durationMs:10});assert(restored.data.records.Q04);
}
for(const count of [5,10]){
  const model=learning.create(qs,memory());
  for(let seed=0;seed<10;seed++){
    const ids=model.challengeSet(count,String(seed));assert.equal(new Set(ids).size,count);assert(!ids.includes('Q01'));
    const counts=learning.categories.map(category=>ids.filter(id=>get(id).category===category).length);
    assert(Math.max(...counts)-Math.min(...counts)<=1);
  }
  let mono=0;const storage=memory(),model2=learning.create(qs,storage);
  let timer=Challenge.create(model2,qs,()=>mono),s=timer.begin(count),ids=Array.from(s.ids);
  assert.equal(s.limitMs,count*60000);mono=10000;timer.tick();assert.equal(s.elapsedMs,10000);
  timer.pause();mono+=100000;timer.tick();assert.equal(s.elapsedMs,10000);timer.resume();mono+=5000;
  const id=ids[0];timer.select(get(id).answerId);timer.submit(get(id).answerId,false,id);
  assert.equal(s.answers[id].elapsedMs,15000);assert.equal(timer.submit('a',false,id),null,'stale duplicate cannot answer next question');
  assert.equal(Object.keys(model2.data.records).length,0,'challenge must not write first/practice records');
  timer.submit(null,true,ids[1]);assert.equal(s.answers[ids[1]].state,'skipped');
  mono+=3000;timer.tick();const saved=JSON.parse(storage.raw);assert.equal(saved.challenges[0].elapsedMs,18000);
  const restored=learning.create(qs,storage);timer=Challenge.create(restored,qs,()=>0);
  assert.equal(timer.active.status,'paused');assert.deepEqual(Array.from(timer.active.ids),ids);assert.equal(timer.active.elapsedMs,18000);
  timer.resume();timer.interrupt();assert.equal(timer.last.status,'finished');assert.equal(timer.last.answers[ids[2]].state,'interrupted');
  assert.equal(timer.last.answers[ids[1]].state,'skipped');
}
{
  let mono=0;const model=learning.create(qs,memory()),timer=Challenge.create(model,qs,()=>mono),s=timer.begin(5);
  const first=s.ids[0];mono=1000;timer.submit(get(first).answerId,false,first);mono=300001;timer.tick();
  assert.equal(s.reason,'timeout');assert.equal(s.elapsedMs,300000);assert.equal(Object.values(s.answers).filter(a=>a.state==='timeout').length,4);
  assert.equal(s.answers[first].correct,true);assert.equal(timer.submit('a',false,first),null);
  assert.equal(Object.keys(model.data.records).length,0);
  model.record(first,get(first).answerId,0,{durationMs:2000});assert.equal(model.data.records[first].first.source,'practice-after-challenge');
}
{
  const model=learning.create(qs,memory());
  model.record('Q02','a',1,{durationMs:10000});const first=clone(model.data.records.Q02.first);
  model.record('Q02','b',0,{originId:'Q02',durationMs:90000});assert.deepEqual(clone(model.data.records.Q02.first),first);
  let a=Analytics.summarize(qs,model.data,learning.categories),row=a.rows.find(r=>r.category==='複数ルール');
  assert.equal(row.denominator,1);assert.equal(row.correct,0);assert.equal(row.hinted,1);assert.equal(row.averageMs,10000);assert.equal(row.reviewAnswers,1);assert.equal(a.weakest,null);
  for(const category of learning.categories){
    for(const q of qs.filter(q=>!q.practice&&q.category===category&&q.id!=='Q02').slice(0,5))model.record(q.id,q.answerId,0,{durationMs:2000});
  }
  a=Analytics.summarize(qs,model.data,learning.categories);assert.equal(a.weakest,'複数ルール');
  model.record('Q40','d',0,{originId:'Q02',durationMs:3000});assert.equal(model.data.records.Q40.first.source,'review');
  const legacyAnalytics=Analytics.summarize(qs,m.data,learning.categories);assert.equal(legacyAnalytics.rows.find(r=>r.category==='複数ルール').denominator,0);assert.equal(legacyAnalytics.rows.find(r=>r.category==='複数ルール').legacyCount,1);
}
console.log('V02 LOGIC PASS: v1 migration/corruption, 5/10 balanced sets, monotonic timing/pause/reload/skip/timeout/interruption, immutable first, separate analytics');
{
  const ids=['Q02','Q04','Q09','Q15','Q22'],byId=Object.fromEntries(qs.map(q=>[q.id,q]));
  const raw={id:'c-corrupt',ids,status:'finished',reason:'complete',elapsedMs:-100,questionMs:Infinity,answers:{}};
  ids.slice(0,2).forEach(id=>raw.answers[id]={state:'answered',choiceId:get(id).answerId,correct:false,elapsedMs:999999});
  const s=Challenge.sanitize(raw,byId);
  assert.equal(s.elapsedMs,300000);assert.equal(s.reason,'timeout');assert.equal(Object.keys(s.answers).length,5);
  assert.equal(s.answers.Q02.correct,true);assert(Object.values(s.answers).reduce((sum,a)=>sum+a.elapsedMs,0)<=300000);
  let mono=0;const watch=Challenge.stopwatch(()=>mono);watch.reset();mono=1000;watch.pause();mono=99999;assert.equal(watch.read(),1000);watch.resume();mono=100999;assert.equal(watch.read(),2000);
}
module.exports={qs,learning,context};
