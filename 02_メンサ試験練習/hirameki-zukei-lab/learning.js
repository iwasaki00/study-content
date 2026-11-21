/* 保存・出題・学習記録。DOMや図形描画に依存しない。 */
window.LabLearning = (() => {
  const KEY = 'hirameki-zukei-lab:v1';
  const categories = ['回転・反転', '移動・個数', '重ね合わせ', '複数ルール'];
  const blank = () => ({ version: 3, onboarded: false, records: {}, reviews: {}, daily: {}, lastSeen: {}, activeDaily: null, challenges: [], activeChallengeId: null, resumeChallengeId: null, adaptiveSets:[],resumeAdaptiveId:null,mastery:{} });
  const status = (correct, hints) => !correct ? '解説で確認' : hints ? 'ヒントを使って正解' : '自力で正解';
  const firstStatus = attempt => !attempt.correct ? '初見で不正解' : attempt.hints ? '初見でヒントあり正解' : '初見でヒントなし正解';
  const jstDate = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  function create(questions, storage, now = () => new Date()) {
    const byId = Object.fromEntries(questions.map(q => [q.id, q]));
    const pool = questions.filter(q => !q.practice);
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
    const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
    const stats=raw=>{
      const answers=Number.isSafeInteger(raw?.answers)&&raw.answers>=0?raw.answers:0;
      const timedCount=Math.min(answers,Number.isSafeInteger(raw?.timedCount)&&raw.timedCount>=0?raw.timedCount:0);
      return {answers,timedCount,totalMs:timedCount&&number(raw?.totalMs)?Math.min(raw.totalMs,Number.MAX_SAFE_INTEGER):0};
    };
    function attempt(raw,q) {
      if(!obj(raw)||typeof raw.correct!=='boolean'||!Number.isInteger(raw.hints)||raw.hints<0||raw.hints>q.hints.length)return null;
      const a={...raw};
      if(a.durationMs!==undefined&&!number(a.durationMs))delete a.durationMs;
      if(a.source!==undefined&&!['practice','review','practice-after-challenge'].includes(a.source))delete a.source;
      return a;
    }
    let data = blank(), persistent = true, recovered = false;
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        let loaded;
        try{loaded=JSON.parse(raw);}catch{loaded={};recovered=true;}
        if(!obj(loaded)){loaded={};recovered=true;}
        if(![1,2,3].includes(loaded.version))recovered=true;
        for(const key of ['records','reviews','daily','lastSeen'])if(!obj(loaded[key])){loaded[key]={};recovered=true;}
        data.onboarded = loaded.onboarded === true;
        data.activeDaily = /^\d{4}-\d{2}-\d{2}$/.test(loaded.activeDaily) ? loaded.activeDaily : null;
        for (const q of pool) {
          const record = loaded.records[q.id];
          const first=attempt(record?.first,q);
          if (first) {
            data.records[q.id] = {first,last:attempt(record.last,q)||{...first},attempts:Number.isInteger(record.attempts)&&record.attempts>0?record.attempts:1,practiceStats:stats(record.practiceStats),reviewStats:stats(record.reviewStats)};
          } else if(record)recovered=true;
          if(obj(loaded.reviews[q.id])){
            data.reviews[q.id] = { originId: q.id, createdAt: Number(loaded.reviews[q.id].createdAt) || 0 };
          }
          if (Number.isFinite(loaded.lastSeen[q.id])) data.lastSeen[q.id] = loaded.lastSeen[q.id];
        }
        for (const [date, set] of Object.entries(loaded.daily)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !obj(set) || !Array.isArray(set.ids) || set.ids.length !== 5 || new Set(set.ids).size !== 5 || !set.ids.every(id => byId[id] && !byId[id].practice)) {recovered=true;continue;}
          const answers = {};
          for (const id of set.ids) {
            const a = set.answers && set.answers[id];
            if (obj(a) && byId[id].choices.some(c => c.id === a.choiceId) && Number.isInteger(a.hints) && a.hints >= 0 && a.hints<=byId[id].hints.length) {
              const correct = a.choiceId === byId[id].answerId;
              const clean={choiceId:a.choiceId,correct,hints:a.hints,status:status(correct,a.hints)};
              if(number(a.at))clean.at=a.at;
              if(number(a.durationMs))clean.durationMs=a.durationMs;
              if(['practice','review','practice-after-challenge'].includes(a.source))clean.source=a.source;
              answers[id] = clean;
            }
          }
          data.daily[date] = { ids: set.ids, answers };
        }
        if(Array.isArray(loaded.challenges))for(const rawChallenge of loaded.challenges){
          const s=window.LabChallenge.sanitize(rawChallenge,byId);
          if(s&&!data.challenges.some(c=>c.id===s.id))data.challenges.push(s);else recovered=true;
        }
        const pending=data.challenges.filter(c=>c.status!=='finished');
        const active=pending.find(c=>c.id===loaded.activeChallengeId)||pending.at(-1);
        if(active){
          data.activeChallengeId=active.id;
          data.challenges=data.challenges.filter(c=>c.status==='finished'||c.id===active.id);
          if(pending.length>1)recovered=true;
        }
        if(data.challenges.some(c=>c.id===loaded.resumeChallengeId))data.resumeChallengeId=loaded.resumeChallengeId;
        if(Array.isArray(loaded.adaptiveSets))for(const s of loaded.adaptiveSets){
          if(!obj(s)||typeof s.id!=='string'||s.id.length>100||data.adaptiveSets.some(x=>x.id===s.id)||!Array.isArray(s.ids)||s.ids.length!==8||new Set(s.ids).size!==8||!s.ids.every(id=>byId[id]&&!byId[id].practice)){recovered=true;continue;}
          const answers={};
          for(const id of s.ids){const a=s.answers?.[id];if(obj(a)&&byId[id].choices.some(c=>c.id===a.choiceId)&&Number.isInteger(a.hints)&&a.hints>=0&&a.hints<=byId[id].hints.length){const correct=a.choiceId===byId[id].answerId;answers[id]={choiceId:a.choiceId,correct,hints:a.hints,status:status(correct,a.hints),...(number(a.at)?{at:a.at}:{}),...(number(a.durationMs)?{durationMs:a.durationMs}:{})};}}
          // 理由は表示時にもテキストとして扱い、保存内容をHTMLにしない。
          const entries=s.ids.map(id=>{const raw=Array.isArray(s.entries)?s.entries.find(e=>e?.questionId===id):null;return {questionId:id,category:byId[id].category,level:byId[id].difficulty,repeated:raw?.repeated===true,reasons:Array.isArray(raw?.reasons)?raw.reasons.filter(x=>typeof x==='string').map(x=>x.slice(0,200)):['保存済みセットを再開']};});
          data.adaptiveSets.push({id:s.id,algorithm:typeof s.algorithm==='string'?s.algorithm:'adaptive-1',seed:typeof s.seed==='string'?s.seed.slice(0,100):'',ids:[...s.ids],entries,answers,profiles:Array.isArray(s.profiles)?s.profiles.filter(obj).map(r=>({category:categories.includes(r.category)?r.category:'',n:number(r.n)?r.n:0,correct:number(r.correct)?r.correct:0,hinted:number(r.hinted)?r.hinted:0,unaided:number(r.unaided)?r.unaided:0,level:[1,2,3].includes(r.level)?r.level:1,need:number(r.need)?Math.min(1.5,r.need):1})):[],enough:s.enough===true});
        }
        if(data.adaptiveSets.some(s=>s.id===loaded.resumeAdaptiveId))data.resumeAdaptiveId=loaded.resumeAdaptiveId;
        if(obj(loaded.mastery))for(const [family,m] of Object.entries(loaded.mastery)){
          if(pool.some(q=>q.ruleFamily===family)&&obj(m)&&[1,2,3].includes(m.level))data.mastery[family]={level:m.level,questionId:byId[m.questionId]?.ruleFamily===family?m.questionId:null,at:number(m.at)?m.at:0};
        }
      }
    } catch { persistent = false; }
    function save() {
      try { storage.setItem(KEY, JSON.stringify(data)); persistent = true; } catch { persistent = false; }
      return persistent;
    }
    const hash = value => {
      let n = Array.from(value).reduce((n,c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 17);
      n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
      n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
      return (n ^ (n >>> 16)) >>> 0;
    };
    function daily(date = jstDate(now())) {
      if (data.daily[date]) return data.daily[date];
      const ids = [], used = Object.fromEntries(categories.map(c => [c, 0]));
      while (ids.length < 5) {
        const remaining = pool.filter(q => !ids.includes(q.id));
        remaining.sort((a,b) => {
          const answered = Number(!!data.records[a.id]) - Number(!!data.records[b.id]);
          if (answered) return answered;
          // 未回答は分野を分散。既回答は最後に見た日時が古い問題を優先。
          if (data.records[a.id]) {
            const age = (data.lastSeen[a.id] || 0) - (data.lastSeen[b.id] || 0);
            if (age) return age;
          }
          return used[a.category] - used[b.category] || hash(`${date}:${a.id}`) - hash(`${date}:${b.id}`) || a.id.localeCompare(b.id);
        });
        const next = remaining[0];
        ids.push(next.id); used[next.category]++;
      }
      const set = { ids, answers: {} };
      data.daily[date] = set;
      ids.forEach(id => { data.lastSeen[id] = now().getTime(); });
      save(); return set;
    }
    function practice(category,level=0) {
      return pool.filter(q => q.category === category&&(!level||q.difficulty===Number(level))).sort((a,b) => Number(!!data.records[a.id]) - Number(!!data.records[b.id]) || (data.lastSeen[a.id] || 0) - (data.lastSeen[b.id] || 0) || a.id.localeCompare(b.id)).map(q => q.id);
    }
    function challengeSet(count,seed){
      const ids=[],used=Object.fromEntries(categories.map(c=>[c,0]));
      while(ids.length<count){
        const next=pool.filter(q=>!ids.includes(q.id)).sort((a,b)=>used[a.category]-used[b.category]||hash(`${seed}:${a.id}`)-hash(`${seed}:${b.id}`)||a.id.localeCompare(b.id))[0];
        ids.push(next.id);used[next.category]++;
      }
      return ids;
    }
    function reviewPlan() {
      const reserved = new Set();
      return Object.values(data.reviews).sort((a,b) => a.createdAt - b.createdAt || a.originId.localeCompare(b.originId)).map(item => {
        const original = byId[item.originId];
        const similar = pool.filter(q => q.id !== original.id && q.ruleFamily === original.ruleFamily && q.difficulty<=original.difficulty && !data.records[q.id] && !reserved.has(q.id))
          .sort((a,b) => Number(a.appearance===original.appearance)-Number(b.appearance===original.appearance)||Math.abs(a.difficulty-original.difficulty)-Math.abs(b.difficulty-original.difficulty)||b.id.localeCompare(a.id))[0];
        const questionId = similar ? similar.id : original.id;
        reserved.add(questionId);
        return { originId: original.id, questionId };
      });
    }
    function record(questionId, choiceId, hints, context = {}) {
      const q = byId[questionId];
      if (!q || !q.choices.some(c => c.id === choiceId)) return null;
      if (context.dailyDate && data.daily[context.dailyDate]?.answers[questionId]) return null;
      const adaptive=context.adaptiveId&&data.adaptiveSets.find(s=>s.id===context.adaptiveId);
      if(context.adaptiveId&&(!adaptive||!adaptive.ids.includes(questionId)||adaptive.answers[questionId]))return null;
      hints=Number.isInteger(hints)?Math.max(0,Math.min(hints,q.hints.length)):0;
      const correct = choiceId === q.answerId;
      const exposed=data.challenges.some(c=>c.seenIds.includes(questionId));
      const source=context.originId?'review':exposed?'practice-after-challenge':'practice';
      const attempt = { choiceId, correct, hints, status: status(correct, hints), at: now().getTime(), source };
      if(number(context.durationMs))attempt.durationMs=context.durationMs;
      if (!q.practice) {
        const previous = data.records[questionId];
        const record={ first: previous ? previous.first : { ...attempt }, attempts: (previous ? previous.attempts : 0) + 1, last: { ...attempt },practiceStats:stats(previous?.practiceStats),reviewStats:stats(previous?.reviewStats) };
        const aggregate=context.originId?record.reviewStats:record.practiceStats;
        aggregate.answers++;
        if(number(attempt.durationMs)){aggregate.timedCount++;aggregate.totalMs+=attempt.durationMs;}
        data.records[questionId]=record;
        data.lastSeen[questionId] = attempt.at;
        if (context.originId && byId[context.originId]) {
          if (correct && !hints) {
            delete data.reviews[context.originId];
            const old=data.mastery[q.ruleFamily];
            if(!old||q.difficulty>=old.level)data.mastery[q.ruleFamily]={level:q.difficulty,questionId:q.id,at:attempt.at};
          }
          // 復習では元の項目を維持し、解いた類題を別項目として二重登録しない。
        } else if (!correct || hints) {
          if (!data.reviews[questionId]) data.reviews[questionId] = { originId: questionId, createdAt: attempt.at };
        }
      }
      if (context.dailyDate && data.daily[context.dailyDate]?.ids.includes(questionId)) data.daily[context.dailyDate].answers[questionId] = attempt;
      if(adaptive)adaptive.answers[questionId]=attempt;
      save(); return attempt;
    }
    function adaptive(force=false){
      let s=!force&&data.adaptiveSets.slice().reverse().find(s=>s.ids.some(id=>!s.answers[id]));
      if(!s){s={id:`a-${now().getTime()}-${data.adaptiveSets.length}`, ...window.LabAdaptive.select(questions,data,String(now().getTime()))};data.adaptiveSets.push(s);s.ids.forEach(id=>data.lastSeen[id]=now().getTime());}
      data.resumeAdaptiveId=s.id;save();return s;
    }
    function higherPlan(){
      return Object.entries(data.mastery).flatMap(([family,m])=>{
        const q=pool.filter(q=>q.ruleFamily===family&&q.difficulty>m.level).sort((a,b)=>Number(!!data.records[a.id])-Number(!!data.records[b.id])||a.difficulty-b.difficulty||(data.lastSeen[a.id]||0)-(data.lastSeen[b.id]||0)||a.id.localeCompare(b.id))[0];
        return q?[{originId:m.questionId||q.id,questionId:q.id,mastery:true}]:[];
      });
    }
    return {
      get data() { return data; }, get persistent() { return persistent; }, get recovered(){return recovered;},
      daily, practice, challengeSet, reviewPlan, record, save, adaptive,higherPlan,
      onboard() { data.onboarded = true; save(); },
      activateDaily(date) { data.activeDaily = date; save(); },
      leaveDaily() { if (data.activeDaily) { data.activeDaily = null; save(); } },
      seen(id) { if (byId[id] && !byId[id].practice) { data.lastSeen[id] = now().getTime(); save(); } }
    };
  }
  return { KEY, categories, create, status, firstStatus, jstDate };
})();
