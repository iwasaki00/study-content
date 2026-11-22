/* レッスンの定義・見えている例だけによる仮説検証。問題や選択肢は追加しない。 */
window.LabReasoning = (() => {
  const guidedIds=['Q04','Q06','Q14','Q51','Q15','Q19','Q02','Q23'];
  const lessons=[
    {id:'L1',title:'回転・反転',questionId:'Q04',intro:'角を目印に、動く向きと形を分けて見よう。',topics:['目印を決める','回転方向','回転と反転','対称な形の限界']},
    {id:'L2',title:'移動・個数',questionId:'Q21',intro:'位置と個数は、別々に追ってから合わせよう。',topics:['位置と個数','横と縦の比較','増減と周期','２つの特徴を追う']},
    {id:'L3',title:'重ね合わせ',questionId:'Q15',intro:'同じ入力でも、残す規則で結果が変わる。',topics:['透過して重ねる','OR','AND','XORを比較']},
    {id:'L4',title:'複数ルール',questionId:'Q02',intro:'１つの特徴に合っても、まだ答えとは限らない。',topics:['１つに注目','別の特徴','規則を合わせる','すべてを満たす選択肢']}
  ];
  const feature=(id,text,focus)=>({id,text,focus});
  const form=[feature('landmark','角の目印','outer'),feature('shape','形・左右','outer'),feature('symmetry','対称な形','outer')];
  const rule=(id,label,group,axis,kind,feature,amount)=>({id,label,group,axis,kind,feature,amount});
  const rotation=[rule('ccw','反時計回り90°','形','sequence','turn','form',-90),rule('cw','時計回り90°','形','sequence','turn','form',90),rule('mirror','左右反転','形','sequence','mirror','form')];
  const countVertical=[rule('count-down','縦に点が１つ増える','個数','vertical','add','count',1),rule('count-across','横に点が１つ増える','個数','horizontal','add','count',1)];
  const overlay=['union','intersection','xor'].map((op,i)=>rule(op,['OR：どちらかにある印','AND：両方にある印','XOR：片方だけの印'][i],'印','horizontal',op,'cells'));
  const specs={
    Q04:{features:form,rules:rotation,required:['ccw'],names:['目印と左回転','同じ回転を適用'],order:'目印を決める → 反時計回り90° → 同じ動きを続ける'},
    Q06:{features:form,rules:[rule('mirror','左右反転','形','sequence','mirror','form'),rule('half','180°回転','形','sequence','turn','form',180),rule('vertical-mirror','上下反転','形','sequence','mirror-y','form')],required:['mirror'],names:['左右反転','反転をもう一度'],order:'上の部分を追う → 左右だけ入れ替える'},
    Q14:{features:[feature('count','個数','inner'),feature('difference','増えた分','inner'),feature('cycle','増減と周期','inner')],rules:[rule('growing','増える幅が１ずつ増える','個数','sequence','growing','count'),rule('plus-one','毎回１つ増える','個数','sequence','add','count',1),rule('cycle-three','最初の３個の数を繰り返す','個数','sequence','cycle','count',3)],required:['growing'],names:['個数の差分','次の増分を適用'],order:'個数を数える → 増えた分を並べる → 増分にも＋１'},
    Q51:{features:[feature('position','印の位置','marks')],rules:[rule('right','横に右１マス','横の位置','horizontal','grid-x','cells',1),rule('left','横に左１マス（端で戻る）','横の位置','horizontal','grid-x','cells',-1),rule('down','縦に下１マス','縦の位置','vertical','grid-y','cells',1),rule('stay','縦では位置は同じ','縦の位置','vertical','same','cells')],required:['right','down'],names:['横の移動','縦の移動','位置を合わせる'],order:'横を確認 → 縦を確認 → ２方向の位置を合わせる'},
    Q15:{features:[feature('inputs','入力の印','marks'),feature('common','共通部分','marks'),feature('exclusive','片方だけ','marks')],rules:overlay,required:['union'],names:['ORを見本で確認','同じORを適用','結果を照合'],order:'２つを重ねる → どちらかにある印を残す'},
    Q19:{features:[feature('inputs','入力の印','marks'),feature('common','共通部分','marks'),feature('exclusive','片方だけ','marks')],rules:overlay,required:['xor'],names:['XORを見本で確認','同じXORを適用','結果を照合'],order:'２つを重ねる → 共通部分を消す → 片方だけを残す'},
    Q02:{features:[feature('direction','矢印の向き','outer'),feature('count','点の個数','inner')],rules:[rule('cw','横に時計回り90°','向き','horizontal','turn','direction',90),rule('ccw','横に反時計回り90°','向き','horizontal','turn','direction',-90),...countVertical],required:['cw','count-down'],names:['横の回転','縦の個数','２つを合わせる'],order:'向きを確認 → 個数を確認 → 両方に合う図形（２特徴は独立）'},
    Q21:{features:[feature('position','印の位置','outer'),feature('count','下の点の個数','inner'),feature('cycle','増減と周期','inner')],rules:[rule('right','横に右１マス','位置','horizontal','add','position',1),rule('stay','横では位置は同じ','位置','horizontal','same','position'),...countVertical],required:['right','count-down'],names:['横の位置','縦の個数','２つを合わせる'],order:'位置を確認 → 個数を確認 → 両方を合わせる（２特徴は独立）'},
    Q23:{features:[feature('shape','形・左右','outer'),feature('paint','塗り','paint')],rules:[rule('mirror','横に左右反転','形','horizontal','mirror','form'),rule('half','横に180°回転','形','horizontal','turn','form',180),rule('paint-down','縦に白→しま→全面','塗り','vertical','paint','paint'),rule('paint-across','横に白→しま→全面','塗り','horizontal','paint','paint')],required:['mirror','paint-down'],names:['横の左右反転','縦の塗り','２つを合わせる'],order:'形を確認 → 塗りを確認 → 両方に合う図形（２特徴は独立）'}
  };
  const mod=(n,m)=>((n%m)+m)%m;
  function pairs(q,axis){
    const result=[];
    if(q.layout==='sequence')for(let i=0;i<q.board.length-1;i++){if(q.board[i]&&q.board[i+1])result.push([i,i+1]);}
    else for(let i=0;i<q.board.length;i++){
      const j=i+(axis==='vertical'?q.columns:1);
      if(q.board[i]&&q.board[j]&&(axis==='vertical'||Math.floor(i/q.columns)===Math.floor(j/q.columns)))result.push([i,j]);
    }
    return result;
  }
  const projection=(s,f)=>f==='form'?[mod(s.direction,360),!!s.mirror]:f==='cells'?[...s.cells].sort((a,b)=>a-b):s[f];
  const equal=(a,b,f)=>JSON.stringify(projection(a,f))===JSON.stringify(projection(b,f));
  function predict(q,h,source,index){
    const s={...source};
    if(h.kind==='turn')s.direction=mod(s.direction+h.amount,360);
    if(h.kind==='mirror'){s.direction=mod(-s.direction,360);s.mirror=!s.mirror;}
    if(h.kind==='mirror-y'){s.direction=mod(180-s.direction,360);s.mirror=!s.mirror;}
    if(h.kind==='add')s[h.feature]+=h.amount;
    if(h.kind==='growing')s.count+=index+1;
    if(h.kind==='cycle')s.count=q.board[(index+1)%h.amount].count;
    if(h.kind==='grid-x')s.cells=s.cells.map(i=>Math.floor(i/3)*3+mod(i%3+h.amount,3));
    if(h.kind==='grid-y')s.cells=s.cells.map(i=>mod(Math.floor(i/3)+h.amount,3)*3+i%3);
    if(h.kind==='paint')s.paint=['outline','striped','solid'][['outline','striped','solid'].indexOf(s.paint)+1]||'outline';
    return s;
  }
  // この関数はchoices/answerIdを一切参照しない。対象は既知のマスだけ。
  function verify(q,id){
    const h=specs[q.id]?.rules.find(h=>h.id===id);if(!h)return null;
    let evidence;
    if(['union','intersection','xor'].includes(h.kind)){
      evidence=[0,1].map(row=>{
        const indices=[row*3,row*3+1],target=row*3+2,a=q.board[indices[0]],b=q.board[indices[1]];
        const both=[...new Set([...a.cells,...b.cells])].sort((a,b)=>a-b);
        const expected={...a,cells:both.filter(i=>h.kind==='union'||(h.kind==='intersection'?a.cells.includes(i)&&b.cells.includes(i):a.cells.includes(i)!==b.cells.includes(i)))};
        return {indices,target,expected,actual:q.board[target],match:equal(expected,q.board[target],'cells')};
      });
    }else evidence=pairs(q,h.axis).map(([from,to])=>{
      const expected=predict(q,h,q.board[from],from);
      return {indices:[from],target:to,expected,actual:q.board[to],match:equal(expected,q.board[to],h.feature)};
    });
    return {id:h.id,label:h.label,group:h.group,feature:h.feature,axis:h.axis,evidence,passed:evidence.filter(e=>e.match).length,holds:evidence.every(e=>e.match)};
  }
  const groups=q=>[...new Set(specs[q.id].rules.map(h=>h.group))];
  function related(questions,q,data){
    return questions.filter(other=>!other.practice&&other.id!==q.id&&other.ruleFamily===q.ruleFamily).sort((a,b)=>Number(a.appearance===q.appearance)-Number(b.appearance===q.appearance)||Number(!!data.records[a.id])-Number(!!data.records[b.id])||Number(data.reasoning?.exposedIds.includes(a.id))-Number(data.reasoning?.exposedIds.includes(b.id))||Math.abs(a.difficulty-q.difficulty)-Math.abs(b.difficulty-q.difficulty)||a.id.localeCompare(b.id))[0]||null;
  }
  const blank=()=>({version:1,lessons:{},runs:[],exposedIds:[],resumeId:null});
  const state=()=>({phase:0,focus:'all',axis:'horizontal',pairIndex:0,hypotheses:[],verified:false,checks:0,guideUsed:false,assist:0,hints:0,choiceId:null,answer:null,explanationStep:0,explained:false,visited:[0]});
  const complete=(r)=>r.ids.every(id=>{const s=r.states[id];return s?.answer&&s.explained&&(r.kind!=='lesson'||s.checks>0&&[0,1,2,3].every(n=>s.visited.includes(n)));});
  function sanitize(raw,questions){
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),result=blank(),byId=Object.fromEntries(questions.map(q=>[q.id,q]));
    const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0?Math.min(max,n):0;
    if(!obj(raw))return result;
    result.exposedIds=Array.isArray(raw.exposedIds)?[...new Set(raw.exposedIds.filter(id=>byId[id]&&!byId[id].practice))]:[];
    if(Array.isArray(raw.runs))for(const r of raw.runs){
      if(!obj(r)||typeof r.id!=='string'||r.id.length>100||result.runs.some(s=>s.id===r.id)||!['lesson','guided'].includes(r.kind))continue;
      const lesson=lessons.find(l=>l.id===r.lessonId);
      const ids=r.kind==='lesson'&&lesson?[lesson.questionId]:r.kind==='guided'?guidedIds:null;
      if(!ids||!Array.isArray(r.ids)||JSON.stringify(r.ids)!==JSON.stringify(ids))continue;
      const run={id:r.id,kind:r.kind,lessonId:lesson?.id||null,ids:[...ids],index:integer(r.index,ids.length-1),states:{},completed:false};
      for(const id of ids){
        if(!obj(r.states?.[id]))continue;
        const q=byId[id],old=r.states[id],s=state(),spec=specs[id];
        s.phase=integer(old.phase,3);s.focus=['all',...spec.features.map(f=>f.id)].includes(old.focus)?old.focus:'all';
        s.axis=['horizontal','vertical'].includes(old.axis)?old.axis:'horizontal';s.pairIndex=integer(old.pairIndex,100);
        s.hypotheses=Array.isArray(old.hypotheses)?groups(q).flatMap(group=>{const h=spec.rules.find(h=>h.group===group&&old.hypotheses.includes(h.id));return h?[h.id]:[];}):[];
        s.checks=integer(old.checks,1000000);s.verified=old.verified===true&&s.checks>0&&s.hypotheses.length===groups(q).length;
        s.guideUsed=old.guideUsed===true;s.assist=integer(old.assist,2);s.hints=integer(old.hints,q.hints.length);
        s.visited=Array.isArray(old.visited)?[...new Set([0,...old.visited.filter(n=>Number.isInteger(n)&&n>=0&&n<=3)])]:[0];
        s.choiceId=q.choices.some(c=>c.id===old.choiceId)?old.choiceId:null;
        if(obj(old.answer)&&q.choices.some(c=>c.id===old.answer.choiceId))s.answer={choiceId:old.answer.choiceId,correct:old.answer.choiceId===q.answerId,hints:s.hints,guideUsed:s.guideUsed,checks:s.checks};
        s.explanationStep=integer(old.explanationStep,q.explanations.length-1);s.explained=!!s.answer&&old.explained===true;
        if(run.kind==='lesson'&&s.answer&&(!s.checks||![0,1,2,3].every(n=>s.visited.includes(n)))){s.answer=null;s.phase=0;s.explained=false;s.verified=false;}
        run.states[id]=s;result.exposedIds.push(id);
      }
      result.exposedIds=[...new Set(result.exposedIds)];run.completed=complete(run);result.runs.push(run);
    }
    for(const lesson of lessons){
      const runs=result.runs.filter(r=>r.lessonId===lesson.id);
      const previous=obj(raw.lessons?.[lesson.id])?raw.lessons[lesson.id]:null;
      if(runs.length||previous?.started===true||previous?.completed===true)result.lessons[lesson.id]={started:true,completed:runs.some(r=>r.completed)||previous?.completed===true};
    }
    if(result.runs.some(r=>r.id===raw.resumeId))result.resumeId=raw.resumeId;
    return result;
  }
  function create(model,questions){
    const data=model.data.reasoning,byId=Object.fromEntries(questions.map(q=>[q.id,q]));
    const current=r=>{const id=r.ids[r.index];if(!r.states[id])r.states[id]=state();if(!data.exposedIds.includes(id))data.exposedIds.push(id);return r.states[id];};
    function begin(kind,lessonId){
      const lesson=lessons.find(l=>l.id===lessonId);if(kind==='lesson'&&!lesson)return null;
      let r=data.runs.slice().reverse().find(r=>!r.completed&&r.kind===kind&&(kind!=='lesson'||r.lessonId===lessonId));
      if(!r){r={id:`r-${Date.now()}-${data.runs.length}`,kind,lessonId:kind==='lesson'?lessonId:null,ids:kind==='lesson'?[lesson.questionId]:[...guidedIds],index:0,states:{},completed:false};data.runs.push(r);}
      if(lesson&&kind==='lesson')data.lessons[lessonId]={started:true,completed:data.lessons[lessonId]?.completed===true};
      data.resumeId=r.id;current(r);model.save();return r;
    }
    function update(r,fn){fn(current(r));model.save();}
    function check(r){const s=current(r),q=byId[r.ids[r.index]];if(s.hypotheses.length!==groups(q).length||s.answer)return false;s.checks++;s.guideUsed=true;s.verified=true;model.save();return true;}
    function submit(r){const s=current(r),q=byId[r.ids[r.index]];if(s.answer||!q.choices.some(c=>c.id===s.choiceId))return false;s.answer={choiceId:s.choiceId,correct:s.choiceId===q.answerId,hints:s.hints,guideUsed:s.guideUsed,checks:s.checks};s.explained=q.explanations.length===1;model.logAnswer(q.id,s.choiceId,{id:`r:${r.id}:${q.id}`,mode:r.kind,hints:s.hints,guideUsed:s.guideUsed,isFirst:false});model.save();return true;}
    function finish(r){
      const s=current(r);if(!s.answer||!s.explained)return false;
      if(r.index<r.ids.length-1){r.index++;current(r);}else{r.completed=complete(r);if(r.lessonId&&r.completed)data.lessons[r.lessonId]={started:true,completed:true};}
      model.save();return true;
    }
    return {begin,current,update,check,submit,finish,get resume(){return data.runs.find(r=>r.id===data.resumeId)||null;},leave(){data.resumeId=null;model.save();}};
  }
  function enhance(questions){
    const grid=questions.find(q=>q.id==='Q51');if(grid)grid.title='格子の中の印';
    const messages={Q04:{a:'鏡の形にしていない点は合っています。回す方向は反時計回り90°です。',c:'角の向きは合っています。左右を反転せず、形全体を左へ回します。',d:'鏡の形にしていない点は合っています。向きも左へ90°回します。'},Q06:{a:'直前の図形を上下反転しています。今回は上を保ち、左右だけを入れ替えます。',c:'直前の図形を半回転しています。上は上のまま、左右だけを反転します。'},Q14:{a:'増えることは合っています。＋４を繰り返さず、増える幅も１つ増やします。',c:'増えることは合っています。毎回＋１ではなく、増えた数も比べます。',d:'増えることは合っています。＋３は前の変化で、次は＋５です。'},Q15:{a:'共通の印を残す点は合っています。片方だけの印も残します。',b:'片方だけの印は合っています。重なった印も消さずに残します。',d:'必要な印は残せています。入力にない位置の印は増やしません。'},Q19:{a:'片方だけの印は合っています。重なった印は消します。',b:'重なる位置は見つけています。そこを消し、片方だけの印を残します。',d:'左上の印は合っています。重なる印を消し、右の図だけの印も残します。'}};
    for(const q of questions)if(messages[q.id])for(const c of q.choices)if(messages[q.id][c.id])c.feedback=messages[q.id][c.id];
  }
  return {guidedIds,lessons,specs,pairs,verify,groups,related,blank,sanitize,state,complete,create,enhance};
})();
window.LabReasoning.enhance(window.LabQuestions);
