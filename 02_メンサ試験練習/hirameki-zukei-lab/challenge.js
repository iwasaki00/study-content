/* チャレンジの状態機械。経過時間は単調時計だけを利用し、壁時計を差し引かない。 */
window.LabChallenge = (() => {
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const bounded=(n,max)=>finite(n)?Math.min(max,Math.max(0,n)):0;
  const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
  function finishState(s,reason) {
    const current=s.ids.find(id=>!s.answers[id]);
    for(const id of s.ids)if(!s.answers[id])s.answers[id]={state:reason,choiceId:null,correct:null,elapsedMs:id===current?s.questionMs:0};
    s.status='finished';s.reason=reason;s.questionMs=0;s.selectedChoice=null;
  }
  function sanitize(raw,byId) {
    if(!object(raw)||typeof raw.id!=='string'||!/^c-[a-zA-Z0-9-]{1,100}$/.test(raw.id)||!Array.isArray(raw.ids)||![5,10].includes(raw.ids.length)||new Set(raw.ids).size!==raw.ids.length||!raw.ids.every(id=>byId[id]&&!byId[id].practice))return null;
    const limitMs=raw.ids.length*60000;
    const s={id:raw.id,ids:[...raw.ids],limitMs,elapsedMs:bounded(raw.elapsedMs,limitMs),questionMs:bounded(raw.questionMs,limitMs),answers:{},seenIds:[],status:raw.status==='finished'?'finished':'paused',reason:null,selectedChoice:null,startedAt:finite(raw.startedAt)?raw.startedAt:0};
    for(const id of s.ids){
      const a=object(raw.answers)&&raw.answers[id];
      if(!object(a)||!['answered','skipped','timeout','interrupted'].includes(a.state))break;
      if(a.state==='answered'&&!byId[id].choices.some(c=>c.id===a.choiceId))break;
      if(s.status!=='finished'&&!['answered','skipped'].includes(a.state))break;
      s.answers[id]={state:a.state,choiceId:a.state==='answered'?a.choiceId:null,correct:a.state==='answered'?a.choiceId===byId[id].answerId:null,elapsedMs:bounded(a.elapsedMs,limitMs)};
    }
    s.seenIds=Array.isArray(raw.seenIds)?[...new Set(raw.seenIds.filter(id=>s.ids.includes(id)))]:Object.keys(s.answers);
    const current=s.ids.find(id=>!s.answers[id]);
    if(current&&byId[current].choices.some(c=>c.id===raw.selectedChoice))s.selectedChoice=raw.selectedChoice;
    let answeredMs=Object.values(s.answers).reduce((sum,a)=>sum+a.elapsedMs,0);
    if(answeredMs>limitMs){for(const a of Object.values(s.answers))a.elapsedMs*=limitMs/answeredMs;answeredMs=limitMs;}
    s.questionMs=Math.min(s.questionMs,Math.max(0,limitMs-answeredMs));
    s.elapsedMs=Math.min(limitMs,Math.max(s.elapsedMs,answeredMs+s.questionMs));
    if(Object.keys(s.answers).length===s.ids.length){s.status='finished';s.reason=Object.values(s.answers).some(a=>a.state==='timeout')?'timeout':Object.values(s.answers).some(a=>a.state==='interrupted')?'interrupted':'complete';s.questionMs=0;s.selectedChoice=null;}
    else if(s.elapsedMs>=limitMs)finishState(s,'timeout');
    else if(s.status==='finished')finishState(s,raw.reason==='timeout'?'timeout':'interrupted');
    return s;
  }
  function create(model,questions,mono=()=>performance.now()) {
    const byId=Object.fromEntries(questions.map(q=>[q.id,q]));
    let anchor=null,lastId=model.data.activeChallengeId||model.data.challenges.at(-1)?.id;
    const active=()=>model.data.challenges.find(c=>c.id===model.data.activeChallengeId&&c.status!=='finished');
    const last=()=>model.data.challenges.find(c=>c.id===lastId);
    // 再読み込みでは同じ単調時計を引き継げないため、必ず明示的な再開を求める。
    if(active()){active().status='paused';model.save();}
    function close(s,reason){finishState(s,reason);model.data.activeChallengeId=null;anchor=null;lastId=s.id;model.save();return s;}
    function sync() {
      const s=active();
      if(!s)return last();
      if(s.status!=='running')return s;
      const current=mono();
      const delta=anchor!==null&&finite(current)?Math.max(0,current-anchor):0;
      if(finite(current))anchor=current;
      const used=Math.min(delta,s.limitMs-s.elapsedMs);
      s.elapsedMs+=used;s.questionMs+=used;
      if(s.elapsedMs>=s.limitMs)return close(s,'timeout');
      return s;
    }
    function resume(){
      const s=active();if(!s||s.status!=='paused')return s;
      s.status='running';anchor=mono();
      const id=s.ids.find(id=>!s.answers[id]);if(id&&!s.seenIds.includes(id))s.seenIds.push(id);
      model.save();return s;
    }
    function begin(count){
      if(active())return active();
      if(![5,10].includes(count))return null;
      const random=globalThis.crypto?.randomUUID?.()||`${Math.random().toString(36).slice(2)}-${model.data.challenges.length}`;
      const id=`c-${random}`;
      const s={id,ids:model.challengeSet(count,id),limitMs:count*60000,elapsedMs:0,questionMs:0,answers:{},seenIds:[],status:'paused',reason:null,selectedChoice:null,startedAt:Date.now()};
      model.data.challenges.push(s);model.data.activeChallengeId=id;model.data.resumeChallengeId=id;lastId=id;model.leaveDaily();model.save();return resume();
    }
    function pause(){const s=sync();if(s?.status==='running'){s.status='paused';anchor=null;model.save();}return s;}
    function submit(choiceId,skip=false,expectedId){
      const s=sync();if(!s||s.status!=='running')return null;
      const id=s.ids.find(id=>!s.answers[id]);
      if(!id||expectedId!==id||(!skip&&!byId[id].choices.some(c=>c.id===choiceId)))return null;
      s.answers[id]={state:skip?'skipped':'answered',choiceId:skip?null:choiceId,correct:skip?null:choiceId===byId[id].answerId,elapsedMs:s.questionMs};
      s.questionMs=0;s.selectedChoice=null;
      if(Object.keys(s.answers).length===s.ids.length){s.status='finished';s.reason='complete';model.data.activeChallengeId=null;anchor=null;}
      else {const next=s.ids.find(id=>!s.answers[id]);if(!s.seenIds.includes(next))s.seenIds.push(next);}
      lastId=s.id;model.save();return s;
    }
    return {
      get active(){return active();},get last(){return last();},
      begin,resume,pause,submit,
      tick(){const s=sync();if(s?.status==='running')model.save();return s;},
      select(choiceId){const s=sync();const id=s?.ids.find(id=>!s.answers[id]);if(s?.status==='running'&&id&&byId[id].choices.some(c=>c.id===choiceId)){s.selectedChoice=choiceId;model.save();return true;}return false;},
      interrupt(){const s=sync();return s&&s.status!=='finished'?close(s,'interrupted'):s;}
    };
  }
  function stopwatch(mono=()=>performance.now()) {
    let elapsed=0,anchor=null;
    const read=()=>elapsed+(anchor===null?0:Math.max(0,mono()-anchor));
    return {read,reset(){elapsed=0;anchor=mono();},pause(){elapsed=read();anchor=null;},resume(){if(anchor===null)anchor=mono();}};
  }
  return {create,sanitize,stopwatch};
})();
