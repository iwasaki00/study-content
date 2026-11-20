/* 出題データとは別に、図形の座標・数・集合演算から正答を検算する。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {}, Intl, Date };
for (const file of ['questions.js','questions-extra.js','learning.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'), context);
const qs = JSON.parse(JSON.stringify(context.window.LabQuestions));
const learning = context.window.LabLearning;
const get = id => qs.find(q=>q.id===id);
const answer = q => q.choices.find(c=>c.id===q.answerId).shape;
const sorted = cells => [...cells].sort((a,b)=>a-b);
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
const base = [[25,20],[78,20],[60,42],[43,42],[43,63],[57,63],[57,80],[25,80]];
// 描画コードを使わず、非対称多角形の各頂点を移して比較。
function points(s) {
  return base.map(([x,y])=>{
    x=(x-50)*(s.mirror?-1:1); y-=50;
    for(let i=0;i<s.direction/90;i++) [x,y]=[-y,x];
    return [x,y];
  });
}
const operations = {
  cw: ([x,y])=>[-y,x], ccw: ([x,y])=>[y,-x], half: ([x,y])=>[-x,-y],
  mx: ([x,y])=>[-x,y], my: ([x,y])=>[x,-y]
};
const visualKey = s => s.kind==='flag' ? JSON.stringify([points(s),s.paint,s.count]) : JSON.stringify(s);
assert.deepEqual(qs.map(q=>q.id),Array.from({length:24},(_,i)=>`Q${String(i+1).padStart(2,'0')}`));
for(const category of learning.categories)assert.equal(qs.filter(q=>q.category===category).length,6);
assert.equal(qs.filter(q=>!q.practice).length,23);
for(const q of qs){
  assert.equal(q.choices.length,4,q.id);
  assert.equal(new Set(q.choices.map(c=>c.id)).size,4,q.id);
  assert.equal(new Set(q.choices.map(c=>visualKey(c.shape))).size,4,`${q.id} duplicate geometry`);
  assert(q.choices.some(c=>c.id===q.answerId));
  assert.equal(q.board.filter(s=>s===null).length,1);
  assert.equal(q.board.at(-1),null);
  assert(q.ruleFamily && [1,2,3].includes(q.difficulty));
  assert.equal(q.hints.length,q.practice?0:2);
  assert(q.explanations.length>0 && q.explanations.every(e=>e.text && e.demo && e.focus));
  if(Number(q.id.slice(1))>=4)assert(q.choices.filter(c=>c.id!==q.answerId).every(c=>c.feedback));
}
assert.deepEqual(qs.slice(0,3).map(q=>q.answerId),['c','b','d']);
assert.deepEqual(get('Q01').board.map(s=>s?.direction??null),[0,90,180,null]);
assert.deepEqual(get('Q01').choices.map(c=>c.shape.direction),[0,90,270,180]);
assert.deepEqual(get('Q02').choices.map(c=>[c.shape.direction,c.shape.count]),[[180,2],[180,3],[90,3],[270,3]]);
assert.deepEqual(get('Q03').choices.map(c=>[c.shape.direction,c.shape.count]),[[-180,2],[-90,1],[0,2],[-180,1]]);
for(const id of ['Q02','Q03'])assert.deepEqual(get(id).explanations.map(e=>e.demo),['rotation','counts','combine']);
for(const [id,operation] of [['Q04','ccw'],['Q05','half'],['Q06','mx'],['Q07','my'],['Q08','alternate']]){
  const q=get(id), all=q.board.slice(0,-1).concat(answer(q));
  for(let i=1;i<all.length;i++){
    const op=operation==='alternate'?(i%2?'cw':'mx'):operation;
    assert.deepEqual(points(all[i-1]).map(operations[op]),points(all[i]),`${id} transition ${i}`);
  }
  // 一定回転／一定反転、回転と反転の交互を競合候補として全観測例に照合。
  const models=['cw','ccw','half','mx','my','alternate'];
  const observed=q.board.slice(0,-1);
  const plausible=models.filter(rule=>observed.slice(1).every((s,i)=>same(points(observed[i]).map(operations[rule==='alternate'?(i%2?'mx':'cw'):rule]),points(s))));
  assert.deepEqual(plausible,[operation],`${id} ambiguous transform`);
}
for(const [id,values] of [['Q09',[0,1,2,3,4]],['Q10',[2,3,0,1,2,3]],['Q11',[1,3,1,3,1,3]]]){
  const q=get(id);assert.deepEqual(q.board.slice(0,-1).concat(answer(q)).map(s=>s.position),values);
  if(id==='Q11')assert.notEqual((1+2+2)%5,1,'fixed modular movement cannot explain alternation');
}
for(const [id,values] of [['Q12',[1,3,5,7,9]],['Q13',[9,7,5,3,1]],['Q14',[1,2,4,7,11,16]]]){
  const q=get(id),actual=q.board.slice(0,-1).concat(answer(q)).map(s=>s.count);
  assert.deepEqual(actual,values);
  const differences=actual.slice(1).map((n,i)=>n-actual[i]);
  assert.deepEqual(differences,id==='Q14'?[1,2,3,4,5]:Array(differences.length).fill(id==='Q12'?2:-2));
}
// 集合演算も、描画用setResultから独立した９ビットで検算。
const bits = cells=>cells.reduce((n,i)=>n|(1<<i),0);
const fromBits = n=>Array.from({length:9},(_,i)=>i).filter(i=>n&(1<<i));
const rotate = cells=>sorted(cells.map(i=>{const row=Math.floor(i/3),column=i%3;return 3*column+2-row;}));
for(const id of ['Q15','Q16','Q17','Q18','Q19','Q20','Q24']){
  const q=get(id), expectedOperation=['Q15','Q16','Q24'].includes(id)?'or':['Q17','Q18'].includes(id)?'and':'xor';
  for(let row=0;row<3;row++){
    const a=q.board[row*3].cells,b=q.board[row*3+1].cells;
    assert(a.some(i=>b.includes(i)) && a.some(i=>!b.includes(i)) && b.some(i=>!a.includes(i)),`${id} must show common and exclusive marks`);
    const n=expectedOperation==='or'?bits(a)|bits(b):expectedOperation==='and'?bits(a)&bits(b):bits(a)^bits(b);
    const expected=id==='Q24'?rotate(fromBits(n)):fromBits(n);
    assert.deepEqual(sorted((row<2?q.board[row*3+2]:answer(q)).cells),expected,`${id} row ${row}`);
  }
  const fitting=['or','and','xor'].filter(op=>[0,1].every(row=>{
    const a=bits(q.board[row*3].cells),b=bits(q.board[row*3+1].cells);
    let expected=fromBits(op==='or'?a|b:op==='and'?a&b:a^b);
    if(id==='Q24')expected=rotate(expected);
    return same(sorted(q.board[row*3+2].cells),expected);
  }));
  assert.deepEqual(fitting,[expectedOperation],`${id} ambiguous overlay`);
  if(id==='Q24'){
    const candidates=[];
    for(const op of ['or','and','xor'])for(let turns=0;turns<4;turns++){
      const fits=[0,1].every(row=>{
        const a=bits(q.board[row*3].cells),b=bits(q.board[row*3+1].cells);
        let result=fromBits(op==='or'?a|b:op==='and'?a&b:a^b);
        for(let t=0;t<turns;t++)result=rotate(result);
        return same(result,sorted(q.board[row*3+2].cells));
      });
      if(fits)candidates.push(`${op}:${turns*90}`);
    }
    assert.deepEqual(candidates,['or:90'],'Q24 must exclude other set operations and rotation directions');
  }
}
for(const id of ['Q02','Q03','Q21','Q22','Q23']){
  const q=get(id), all=q.board.slice(0,-1).concat(answer(q));
  all.forEach((s,i)=>{
    const r=Math.floor(i/3),c=i%3;
    if(id==='Q02'){assert.equal(s.direction,c*90);assert.equal(s.count,r+1);}
    if(id==='Q03'){assert.equal(s.direction,(-c*90)||0);assert.equal(s.count,3-r);}
    if(id==='Q21'){assert.equal(s.position,c);assert.equal(s.count,r+1);}
    if(id==='Q22'){assert.equal(s.direction,[0,270,180][r]);assert.equal(s.count,3-c);}
    if(id==='Q23'){assert.equal(s.mirror,c===1);assert.equal(s.paint,['outline','striped','solid'][r]);}
  });
}
assert.equal(get('Q02').ruleFamily,get('Q03').ruleFamily);
assert.equal(get('Q02').ruleFamily,get('Q22').ruleFamily);
console.log('DATA PASS: 24 questions, independent geometry/count/set audit, competing simple rules, original 3 regression');

function memory(initial) { let value=initial?JSON.stringify(initial):null;return {getItem:()=>value,setItem:(key,next)=>{value=next;},get value(){return value;}}; }
let date=new Date('2026-11-20T14:59:00Z');
const clock=()=>date;
const store=memory();
let model=learning.create(qs,store,clock);
const untouched=learning.create(qs,memory(),clock);
assert.notDeepEqual(Array.from(untouched.daily('2026-11-20').ids),Array.from(untouched.daily('2026-11-21').ids),'date changes should vary equally eligible unanswered questions');
assert.equal(learning.jstDate(date),'2026-11-20');
const set=model.daily();
assert.equal(set.ids.length,5);assert.equal(new Set(set.ids).size,5);assert(!set.ids.includes('Q01'));
assert.equal(new Set(set.ids.map(id=>get(id).category)).size,4);
const firstId=set.ids[0];
const initialSet=Array.from(set.ids);
model.record(firstId,get(firstId).answerId,0,{dailyDate:'2026-11-20'});
assert.equal(model.record(firstId,get(firstId).answerId,0,{dailyDate:'2026-11-20'}),null);
model=learning.create(qs,store,clock);
assert.deepEqual(Array.from(model.daily().ids),initialSet);
assert.equal(Object.keys(model.daily().answers).length,1);
date=new Date('2026-11-20T15:01:00Z');
assert.equal(learning.jstDate(date),'2026-11-21');
model.record(initialSet[1],get(initialSet[1]).answerId,0,{dailyDate:'2026-11-20'});
assert.equal(Object.keys(model.data.daily['2026-11-20'].answers).length,2);
assert.equal(model.data.daily['2026-11-21'],undefined,'active set must not switch at midnight');
const next=model.daily();assert.equal(new Set(next.ids).size,5);assert(!next.ids.includes(firstId));
assert.equal(model.data.daily['2026-11-20'].ids.join(),initialSet.join());

const scarce=learning.create(qs,memory(),clock);
for(const q of qs.filter(q=>!q.practice && !['Q23','Q24'].includes(q.id)))scarce.record(q.id,q.answerId,0);
const scarceSet=scarce.daily();assert(scarceSet.ids.includes('Q23')&&scarceSet.ids.includes('Q24'));assert.equal(new Set(scarceSet.ids).size,5);
const allSeen=learning.create(qs,memory(),clock);
for(const q of qs.filter(q=>!q.practice)){date=new Date(date.getTime()+1000);allSeen.record(q.id,q.answerId,0);}
assert.deepEqual(Array.from(allSeen.daily().ids),['Q02','Q03','Q04','Q05','Q06'],'oldest seen fills completed pool');

const review=learning.create(qs,memory(),clock);
review.record('Q01','a',0);assert.equal(Object.keys(review.data.records).length,0);
review.record('Q02','a',0);review.record('Q02','a',0);
assert.equal(Object.keys(review.data.reviews).length,1);
let plan=review.reviewPlan();assert.equal(plan[0].originId,'Q02');assert.equal(plan[0].questionId,'Q22');
const firstJSON=JSON.stringify(review.data.records.Q02.first);
review.record('Q22','b',1,{originId:'Q02'});assert(review.data.reviews.Q02);assert.equal(Object.keys(review.data.reviews).length,1);
review.record('Q03','d',0);
plan=review.reviewPlan();assert.equal(plan[0].questionId,'Q02','fallback original when all similar questions answered');
review.record('Q02','b',0,{originId:'Q02'});assert.equal(Object.keys(review.data.reviews).length,0);
assert.equal(JSON.stringify(review.data.records.Q02.first),firstJSON);
review.record('Q04','b',1);assert(review.data.reviews.Q04);
review.record('Q04','b',0,{originId:'Q04'});assert(!review.data.reviews.Q04);
assert.equal(review.data.records.Q04.first.hints,1);
const broken=learning.create(qs,{getItem(){throw Error('blocked')},setItem(){throw Error('quota')}},clock);
assert(!broken.persistent);assert.equal(broken.daily().ids.length,5);broken.record('Q02','b',0);assert(broken.data.records.Q02);
const malformed=learning.create(qs,memory({version:1,records:{},reviews:{},lastSeen:{},daily:{'2026-11-21':{ids:['Q01','Q01'],answers:{}}}}),clock);
assert.equal(malformed.daily().ids.length,5);
console.log('LEARNING PASS: JST dates, fixed 5, resume, rollover, scarce unseen, oldest seen, related review/fallback/dedup, immutable first attempt, storage failure');
module.exports={qs,learning};
