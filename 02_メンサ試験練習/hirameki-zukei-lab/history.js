/* 回答履歴。旧版の日時・モード・計測値を推測で補わない。 */
window.LabHistory=(()=>{
  const modes=['practice','review','challenge','guided','lesson','legacy'];
  const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const timestamp=n=>number(n)&&n>0&&Number.isFinite(new Date(n).getTime())?n:null;
  const blank=()=>({version:1,imported:false,sequence:0,events:[]});
  function clean(raw,byId){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.id!=='string'||raw.id.length>200||!byId[raw.questionId]||byId[raw.questionId].practice||!modes.includes(raw.mode))return null;
    const q=byId[raw.questionId],valid=q.choices.some(c=>c.id===raw.choiceId);
    if(!valid&&typeof raw.correct!=='boolean')return null;
    return {id:raw.id,questionId:q.id,mode:raw.mode,choiceId:valid?raw.choiceId:null,correct:valid?raw.choiceId===q.answerId:raw.correct,
      hints:Number.isInteger(raw.hints)&&raw.hints>=0&&raw.hints<=q.hints.length?raw.hints:null,
      guideUsed:typeof raw.guideUsed==='boolean'?raw.guideUsed:null,isFirst:raw.mode==='practice'&&raw.isFirst===true,
      at:timestamp(raw.at),durationMs:number(raw.durationMs)?Math.min(raw.durationMs,Number.MAX_SAFE_INTEGER):null,legacy:raw.legacy===true};
  }
  function restore(raw,data,questions,original={}){
    const byId=Object.fromEntries(questions.map(q=>[q.id,q])),result=blank();
    if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.version===1&&Array.isArray(raw.events)){
      result.sequence=Number.isSafeInteger(raw.sequence)&&raw.sequence>=0?raw.sequence:0;
      for(const r of raw.events){const e=clean(r,byId);if(e&&!result.events.some(x=>x.id===e.id))result.events.push(e);}
      result.imported=raw.imported===true;
    }
    if(result.imported)return result;
    const signatures=new Map();
    const add=(id,questionId,a,mode,isFirst=false)=>{
      if(!a||typeof a!=='object')return;
      const e=clean({id,questionId,mode,choiceId:a.choiceId,correct:a.correct,hints:a.hints,guideUsed:a.guideUsed,at:a.at,durationMs:a.durationMs,isFirst,legacy:true},byId);if(!e)return;
      // first/last/日次は同じ回答の写しを持つ。区別できない同一値は二重計上しない。
      const signature=mode==='challenge'||mode==='lesson'||mode==='guided'?id:JSON.stringify([questionId,e.at,e.choiceId,e.correct,e.hints]);
      const previous=signatures.get(signature);
      if(previous){if(previous.mode==='legacy'&&mode!=='legacy')previous.mode=mode;previous.isFirst=previous.isFirst||isFirst;return;}
      if(!result.events.some(x=>x.id===id)){result.events.push(e);signatures.set(signature,e);}
    };
    for(const [id,r] of Object.entries(data.records))for(const [key,a] of [['first',r.first],['last',r.last]]){
      const mode=a.source==='review'?'review':a.source?'practice':'legacy';
      add(`old:${id}:${key}`,id,a,mode,key==='first'&&a.source==='practice');
    }
    for(const [date,set] of Object.entries(data.daily))for(const [id,a] of Object.entries(set.answers))add(`old:daily:${date}:${id}`,id,a,'practice');
    for(const c of data.challenges)for(const [id,a] of Object.entries(c.answers))if(a.state==='answered'){
      const old=(Array.isArray(original.challenges)?original.challenges:[]).find(x=>x?.id===c.id)?.answers?.[id];
      add(`c:${c.id}:${id}`,id,{...a,at:old?.at,durationMs:number(old?.elapsedMs)&&old.elapsedMs>0&&old.elapsedMs<=c.limitMs?old.elapsedMs:null},'challenge');
    }
    for(const r of data.reasoning.runs)for(const [id,s] of Object.entries(r.states))if(s.answer){
      const oldState=(Array.isArray(original.reasoning?.runs)?original.reasoning.runs:[]).find(x=>x?.id===r.id)?.states?.[id],old=oldState?.answer;
      add(`r:${r.id}:${id}`,id,{...s.answer,hints:old?.hints??oldState?.hints??null,guideUsed:old?.guideUsed??oldState?.guideUsed??null,at:old?.at,durationMs:old?.durationMs},r.kind);
    }
    result.imported=true;return result;
  }
  function append(history,questions,raw){
    let id=raw.id;
    if(!id){do{id=`n:${++history.sequence}`;}while(history.events.some(e=>e.id===id));}
    if(history.events.some(e=>e.id===id))return null;
    const e=clean({...raw,id,legacy:false},Object.fromEntries(questions.map(q=>[q.id,q])));
    if(e)history.events.push(e);return e;
  }
  return {blank,restore,append,timestamp,modes};
})();
