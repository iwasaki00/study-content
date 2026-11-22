/* 読み取り専用の学習分析。保存値・確定済みセット・出題規則は変更しない。 */
window.LabInsights=(()=>{
  const labels={practice:'通常練習（初見・解き直し）',review:'復習',challenge:'チャレンジ',guided:'ガイド付き練習',lesson:'解き方レッスン',legacy:'旧版・モード不明',first:'通常の初見'};
  const tags={rotation:'回転方向の取り違えに対応',mirror:'反転規則の混同に対応',movement:'移動方向の取り違えに対応',count:'個数変化の見落としに対応',overlay:'重ね合わせ規則の混同に対応',partial:'複数ルールの一部だけ一致',order:'操作の順番・適用漏れに対応',unknown:'分類できない誤答'};
  const num=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const formatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'});
  const date=at=>formatter.format(new Date(at));
  const average=values=>{const measured=values.filter(num);return {timed:measured.length,averageMs:measured.length?measured.reduce((a,b)=>a+b,0)/measured.length:null};};
  function metric(events){const correct=events.filter(e=>e.correct).length,hintKnown=events.filter(e=>e.hints!==null&&e.hints!==undefined);return {answers:events.length,correct,known:events.length,hinted:hintKnown.filter(e=>e.hints>0).length,hintDenominator:hintKnown.length,...average(events.map(e=>e.durationMs))};}
  function firsts(questions,data){return questions.filter(q=>!q.practice&&data.records[q.id]?.first.source==='practice').map(q=>({questionId:q.id,...data.records[q.id].first}));}
  function classify(q,choiceId){return q?.errorMap?.[choiceId]||{tag:'unknown',detail:'選択肢と特徴の対応を確定できません'};}
  function summarize(questions,data){
    const pool=questions.filter(q=>!q.practice),events=data.history.events,initial=firsts(questions,data),modes={};
    for(const mode of ['practice','review']){
      const key=mode==='practice'?'practiceStats':'reviewStats';let answers=0,timed=0,totalMs=0;
      for(const q of pool){const r=data.records[q.id];if(!r)continue;const knownEvents=events.filter(e=>e.questionId===q.id&&e.mode===mode),measured=knownEvents.filter(e=>num(e.durationMs));answers+=Math.max(r[key]?.answers||0,knownEvents.length);if(measured.length>(r[key]?.timedCount||0)){timed+=measured.length;totalMs+=measured.reduce((n,e)=>n+e.durationMs,0);}else{timed+=r[key]?.timedCount||0;totalMs+=r[key]?.totalMs||0;}}
      const detail=metric(events.filter(e=>e.mode===mode));modes[mode]={...detail,answers,timed,averageMs:timed?totalMs/timed:null};
    }
    const challenge=data.challenges.flatMap(c=>Object.entries(c.answers).filter(([,a])=>a.state==='answered').map(([id,a])=>({questionId:id,correct:a.correct,hints:null,durationMs:events.find(e=>e.id===`c:${c.id}:${id}`)?.durationMs??null})));
    modes.challenge=metric(challenge);
    for(const mode of ['guided','lesson'])modes[mode]=metric(data.reasoning.runs.filter(r=>r.kind===mode).flatMap(r=>Object.entries(r.states).filter(([,s])=>s.answer).map(([id,s])=>{const event=events.find(e=>e.id===`r:${r.id}:${id}`);return {...s.answer,hints:event?.hints??null,questionId:id,durationMs:event?.durationMs??null};})));
    const recordsCount=pool.reduce((n,q)=>n+(data.records[q.id]?.attempts||0),0);
    const unknown=Math.max(0,recordsCount-modes.practice.answers-modes.review.answers);
    modes.legacy={...metric(events.filter(e=>e.mode==='legacy')),answers:unknown};
    const total=Math.max(recordsCount,modes.practice.answers+modes.review.answers)+challenge.length+modes.guided.answers+modes.lesson.answers;
    const rows=window.LabLearning.categories.map(category=>{
      const qs=pool.filter(q=>q.category===category),list=initial.filter(e=>qs.some(q=>q.id===e.questionId)),wrong=list.filter(e=>!e.correct),buckets={};
      for(const e of wrong){const c=classify(qs.find(q=>q.id===e.questionId),e.choiceId);if(!buckets[c.tag])buckets[c.tag]={tag:c.tag,answers:0,ids:[]};buckets[c.tag].answers++;if(!buckets[c.tag].ids.includes(e.questionId))buckets[c.tag].ids.push(e.questionId);}
      const hints=list.filter(e=>e.hints>0).length,correct=list.filter(e=>e.correct).length;
      const needs=list.filter(e=>!e.correct||e.hints!==0),confirmed=e=>{const q=qs.find(q=>q.id===e.questionId);return (data.mastery[q.ruleFamily]?.level||0)>=q.difficulty;};
      const unresolved=needs.filter(e=>!confirmed(e)).length,confirmedFamilies=new Set(needs.filter(confirmed).map(e=>qs.find(q=>q.id===e.questionId).ruleFamily)).size;
      return {category,...metric(list),ids:list.map(e=>e.questionId),enough:list.length>=5,need:list.length?(list.length-correct+.5*hints)/list.length:0,unresolved,confirmedFamilies,weaknesses:Object.values(buckets),pending:qs.filter(q=>data.reviews[q.id]).length};
    });
    const levels=[1,2,3].map(level=>({level,...metric(initial.filter(e=>questions.find(q=>q.id===e.questionId).difficulty===level))}));
    const outcomes=data.challenges.flatMap(c=>Object.values(c.answers));
    return {total,first:metric(initial),modes,rows,levels,pending:Object.keys(data.reviews).length,unknownMode:unknown,
      dated:events.filter(e=>e.at!==null).length,undated:events.filter(e=>e.at===null).length,unavailable:Math.max(0,total-events.length),
      skipped:outcomes.filter(a=>a.state==='skipped').length,timeout:outcomes.filter(a=>a.state==='timeout').length,interrupted:outcomes.filter(a=>a.state==='interrupted').length};
  }
  function trend(questions,data,days=7,mode='practice',now=new Date()){
    const today=date(now.getTime()),base=Date.parse(`${today}T00:00:00Z`),byId=Object.fromEntries(questions.map(q=>[q.id,q]));
    const eligible=data.history.events.filter(e=>e.at!==null&&(mode==='first'?e.isFirst:e.mode===mode));
    const byDay=new Map();for(const event of eligible){const day=date(event.at);if(!byDay.has(day))byDay.set(day,[]);byDay.get(day).push(event);}
    const rows=Array.from({length:days},(_,i)=>{
      const day=new Date(base-(days-1-i)*86400000).toISOString().slice(0,10),events=byDay.get(day)||[];
      return {day,count:events.length,correct:events.filter(e=>e.correct).length,unaided:events.filter(e=>e.correct&&(e.hints===0||e.mode==='challenge')).length,categories:Object.fromEntries(window.LabLearning.categories.map(c=>[c,events.filter(e=>byId[e.questionId].category===c).length]))};
    });
    return {rows,events:rows.reduce((n,r)=>n+r.count,0),mode,days};
  }
  function recommendations(questions,data){
    const analysis=summarize(questions,data),candidates=[];
    for(const l of window.LabReasoning.lessons)if(!data.reasoning.lessons[l.id]?.completed)candidates.push({priority:1,kind:'lesson',lessonId:l.id,title:`${l.id} ${l.title}`,reason:'解き方レッスンが未完了です。観察と検証から確かめましょう。'});
    for(const row of analysis.rows.filter(r=>r.enough&&r.need>.3&&r.unresolved>0).sort((a,b)=>b.need-a.need||a.category.localeCompare(b.category))){
      const pool=questions.filter(q=>!q.practice&&q.category===row.category),level=Math.min(...pool.map(q=>q.difficulty));
      const top=row.weaknesses.filter(b=>b.tag!=='unknown').sort((a,b)=>b.answers-a.answers)[0];
      candidates.push({priority:2,kind:'practice',category:row.category,level,title:`${row.category}の${['','基本','標準','発展'][level]}問題`,reason:`初見${row.answers}問中、正解${row.correct}問。ヒント利用${row.hinted} / ${row.hintDenominator}問（利用有無が判明）。${top?`${tags[top.tag]}の誤答が${top.answers}回答あります。`:'誤答理由を確定できないものは分類していません。'}`});
    }
    const families=[...new Set(Object.keys(data.reviews).map(id=>questions.find(q=>q.id===id)?.ruleFamily).filter(Boolean))];
    for(const family of families){const origin=questions.find(q=>data.reviews[q.id]&&q.ruleFamily===family);candidates.push({priority:3,kind:'review',family,title:`${origin.id}と同じ規則を復習`,reason:`このruleFamilyに復習待ちがあります。${origin.ruleSummary}を確認します。`});}
    for(const category of window.LabLearning.categories){const q=questions.find(q=>!q.practice&&q.category===category&&!data.records[q.id]&&!data.reasoning.exposedIds.includes(q.id)&&!data.challenges.some(c=>c.seenIds.includes(q.id)));if(q)candidates.push({priority:4,kind:'question',questionId:q.id,title:`未回答の${category}`,reason:`${q.id}は、通常回答やガイド・チャレンジでの露出記録がありません。`});}
    for(const row of analysis.rows.filter(r=>r.enough&&r.unresolved===0&&(r.confirmedFamilies>0||r.hintDenominator===r.answers&&r.correct/r.answers>=.8&&r.hinted/r.answers<=.2))){
      if(questions.some(q=>!q.practice&&q.category===row.category&&q.difficulty===3))candidates.push({priority:5,kind:'practice',category:row.category,level:3,title:`${row.category}の発展問題`,reason:row.confirmedFamilies?`初見${row.answers}問のうち、誤答・ヒント利用に対応する${row.confirmedFamilies}規則は復習で確認済みです。発展問題を試せます。`:`初見${row.answers}問中${row.correct}問正解、ヒント利用${row.hinted}問。練習記録上は安定しています。速さで判断していません。`});
    }
    return candidates.sort((a,b)=>a.priority-b.priority).slice(0,3);
  }
  return {labels,tags,firsts,classify,summarize,trend,recommendations,date};
})();
