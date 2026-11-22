/* レッスン画面。採点・保存はreasoning.js、通常モードの進行はapp.jsに委譲。 */
window.LabReasoningUI=(()=>{
  const R=window.LabReasoning,{svg,label,setResult}=window.LabShapes;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tile=(shape,caption)=>`<div class="demo-tile">${svg(shape)}<span>${caption}</span></div>`;
  function ruleHeader(q,step){if(q.insight)return window.LabInsightsContent.header(q,step);const spec=R.specs[q.id];return spec?`<div class="rule-header"><strong>${spec.names[step]||q.ruleSummary}</strong><p>確認・適用順：${spec.order}</p></div>`:'';}
  function create({app,model,questions,onMenu,onStart,onRelated,notice}){
    const byId=Object.fromEntries(questions.map(q=>[q.id,q])),store=R.create(model,questions);
    let run=null,screen='hub',playing=false,motion=false;
    const q=()=>byId[run.ids[run.index]],s=()=>store.current(run);
    const menu='<button class="text-button" data-r="hub">レッスン一覧へ</button>';
    function focus(){app.querySelector('h2')?.focus({preventScroll:true});window.scrollTo(0,0);}
    function hub(){
      onStart();screen='hub';store.leave();
      const data=model.data.reasoning;
      app.innerHTML=`<button class="text-button" data-r="menu">メニューへ</button><span class="eyebrow">REASONING LAB</span><h2 tabindex="-1">解き方を学ぶ</h2><p class="menu-intro">観察 → 仮説 → 検証 → 解答。<br>答えの前に、規則を試してみよう。</p>${notice()}<div class="menu-options">${R.lessons.map((l,i)=>`<button data-r="lesson" data-id="${l.id}"><strong>LESSON ${i+1} · ${l.title}</strong><span>${data.lessons[l.id]?.completed?'✓ 完了 · もう一度':data.lessons[l.id]?.started?'途中から再開':'はじめる'}<br>${l.topics.join('／')}</span></button>`).join('')}</div><button class="adaptive-button" data-r="guided"><strong>ガイド付き練習 · ８問</strong><span>４分野を２問ずつ。途中のセットは続きから。</span></button><p class="quiet">通常の初見成績とは別に保存します。完了は正解数で決めず、４ステップと検証・解説の確認で記録します。</p>`;focus();
    }
    function begin(kind,id){onStart();run=store.begin(kind,id);if(!run)return;motion=false;playing=false;render();focus();}
    function resume(){onStart();run=store.resume;if(!run){hub();return;}render();focus();}
    function board(question,st,checks){
      const spec=R.specs[question.id],f=spec.features.find(f=>f.id===st.focus),indices=R.pairs(question,st.axis)[st.pairIndex%Math.max(1,R.pairs(question,st.axis).length)]||[];
      const targets=checks.flatMap(c=>c.evidence.filter(e=>!e.match).map(e=>e.target));
      const focus=st.answer?question.explanations[st.explanationStep].focus:st.hints?question.hints[st.hints-1].focus:f?.focus||'';
      return `<div class="board r-board focus-${focus} r-focus-${st.answer?'all':st.focus}" style="grid-template-columns:repeat(${question.columns},minmax(0,1fr))" aria-label="番号付きの盤面${st.answer?'、答え合わせ後':'。疑問符は未回答のままです'}">${question.board.map((shape,i)=>{
        const common=shape?.kind==='marks'&&question.board[Math.floor(i/3)*3]?.cells&&question.board[Math.floor(i/3)*3+1]?.cells?question.board[Math.floor(i/3)*3].cells.filter(c=>question.board[Math.floor(i/3)*3+1].cells.includes(c)):[];
        return `<div class="cell ${!shape?'missing':''} ${i>=6?'bottom-row':''} ${st.guideUsed&&indices.includes(i)?'r-compared':''} ${targets.includes(i)?'r-mismatch':''}" aria-label="マス${i+1}${targets.includes(i)?'、仮説と不一致':''}"><span class="r-cell-number">${i+1}${targets.includes(i)?' ×':''}</span>${svg(shape?{...shape,landmark:st.focus==='landmark'}:st.answer?question.choices.find(c=>c.id===question.answerId).shape:null,'',common)}</div>`;
      }).join('')}</div>`;
    }
    function observation(question,st){
      const spec=R.specs[question.id];
      return `<div class="r-feature-buttons" role="group" aria-label="注目する特徴"><button data-r="feature" data-id="all" aria-pressed="${st.focus==='all'}">全体</button>${spec.features.map(f=>`<button data-r="feature" data-id="${f.id}" aria-pressed="${st.focus===f.id}">${f.text}</button>`).join('')}</div><div class="r-comparison" role="group" aria-label="比較する向き"><button data-r="axis" data-id="horizontal" aria-pressed="${st.axis==='horizontal'&&st.guideUsed}">${question.layout==='sequence'?'番号順に比較':'横を比較'}</button><button data-r="axis" data-id="vertical" ${question.layout==='sequence'?'disabled':''} aria-pressed="${st.axis==='vertical'&&st.guideUsed}">縦を比較</button><button data-r="pair">別の組</button></div>`;
    }
    function mini(question,st){
      if(run.kind==='lesson'&&st.phase===0&&st.focus==='all'&&run.lessonId==='L1')return `<section class="r-concept"><p>角を１つ目印に。回転は全体を回し、反転は左右を入れ替えます。</p><div class="demo">${tile({...question.board[0],landmark:true},'元の形')}${tile({...question.board[0],direction:90,landmark:true},'90°回転')}${tile({...question.board[0],mirror:true,landmark:true},'左右反転')}</div><p>対称な形では区別しにくい場合があります。「対称な形」でも比べてみよう。</p></section>`;
      if(run.kind==='lesson'&&st.phase===0&&st.focus==='all'&&run.lessonId==='L2')return '<p class="hint-note">線の上の位置と下の点を分けて追います。増減は差を、周期は同じ並びの再登場を比べよう。「増減と周期」で図を比較できます。</p>';
      if(run.kind==='lesson'&&st.phase===0&&st.focus==='all'&&run.lessonId==='L4')return '<p class="hint-note">まず矢印だけ、次に点だけ。横と縦を別々に調べ、解答では両方に合う図形を探します。</p>';
      if(st.focus==='symmetry')return `<section class="r-concept"><p>目印のない円は、回転も反転も同じ形に見えます。</p><div class="demo">${['元の円','90°回転','左右反転'].map(text=>`<div class="demo-tile"><svg viewBox="0 0 100 100" role="img" aria-label="${text}"><circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" stroke-width="4"/></svg><span>${text}</span></div>`).join('')}</div><p>角のある非対称な形で確かめよう。</p></section>`;
      if(st.focus==='shape'&&question.category==='回転・反転'){
        const a=question.board[0];return `<section class="r-concept"><p>回転は全体を回す。反転は鏡に映す。</p><div class="demo">${tile(a,'元の形')}${tile({...a,direction:(a.direction+90)%360},'右90°')}${tile({...a,direction:(360-a.direction)%360,mirror:!a.mirror},'左右反転')}</div></section>`;
      }
      if(st.focus==='cycle')return `<section class="r-concept"><p>増減は「差」を、周期は「同じ並びの再登場」を比べます。</p><div class="demo">${byId.Q14.board.slice(0,3).map((shape,i)=>tile(shape,`${shape.count}個${i?' · ＋'+i:''}`)).join('')}</div><div class="demo">${byId.Q48.board.slice(0,4).map((shape,i)=>tile(shape,['左','中央','右','左に戻る'][i])).join('')}</div></section>`;
      if(['Q15','Q19'].includes(question.id)&&run.kind==='lesson'&&st.phase===0){
        const a=question.board[0],b=question.board[1],common=a.cells.filter(i=>b.cells.includes(i));
        return `<section class="r-concept"><p>透過して重ね、共通と片方だけを分けます。</p><div class="r-transparent"><div>${svg(a,'r-input-a',common)}${svg(b,'r-input-b',common)}</div></div><div class="demo r-overlay-comparison">${['union','intersection','xor'].map((op,i)=>tile(setResult(a,b,op),['OR：どちらか','AND：両方','XOR：片方だけ'][i])).join('')}</div><p>見本の行で、どの残し方かを調べよう。</p></section>`;
      }
      return '';
    }
    function hypotheses(question,st){
      const spec=R.specs[question.id];
      return `<div class="r-hypotheses">${R.groups(question).map(group=>`<fieldset><legend>${group}の仮説を１つ</legend>${spec.rules.filter(h=>h.group===group).map(h=>`<button data-r="hypothesis" data-id="${h.id}" aria-pressed="${st.hypotheses.includes(h.id)}">${st.hypotheses.includes(h.id)?'✓ ':''}${h.label}</button>`).join('')}</fieldset>`).join('')}</div>`;
    }
    function evidence(question,checks){
      return checks.map(c=>{
        const example=c.evidence.find(e=>!e.match&&e.target>=3)||c.evidence.find(e=>!e.match)||c.evidence.at(-1);
        return `<article class="r-evidence ${c.holds?'holds':'fails'}"><h3>${c.holds?'✓ 見本で成立':'× 一致しない組があります'}</h3><p>${c.label} · ${c.passed} / ${c.evidence.length}組で一致</p><div class="demo focus-${c.feature==='count'?'inner':c.feature==='paint'?'paint':c.feature==='cells'?'marks':'outer'}">${tile(example.expected,`仮説なら（マス${example.indices.map(i=>i+1).join('＋')}から）`)}<b>${example.match?'＝':'≠'}</b>${tile(example.actual,`実際のマス${example.target+1}`)}</div><details><summary>ほかの組も確認</summary><p>${c.evidence.map(e=>`${e.indices.map(i=>i+1).join('＋')} → ${e.target+1}：${e.match?'✓ 一致':'× 不一致'}`).join(' ／ ')}</p></details></article>`;
      }).join('');
    }
    function observedMotion(question,st){
      if(question.operation&&st.axis==='horizontal'){
        if(run.kind==='lesson'&&st.phase===0)return '';
        const row=st.pairIndex%2,a=question.board[row*3],b=question.board[row*3+1],common=a.cells.filter(i=>b.cells.includes(i));
        return `<div class="r-motion ${playing?'':'r-paused'}"><p class="quiet">既知の２入力を透過して比較。残し方は仮説で試します。</p><div class="r-transparent"><div>${svg(a,'r-input-a',common)}${svg(b,'r-input-b',common)}</div></div></div>`;
      }
      const pair=R.pairs(question,st.axis)[st.pairIndex%Math.max(1,R.pairs(question,st.axis).length)];if(!pair)return '';
      const [from,to]=pair,a=question.board[from],b=question.board[to];
      let demo;
      if(['flag','arrow'].includes(a.kind)){
        const delta=((b.direction-a.direction)%360+360)%360,transform=a.mirror!==b.mirror?'mirror-x':delta===270?'ccw':delta===90?'cw':delta===180?'half':null;
        if(transform)demo=window.LabExplanations.render({...question,board:question.board.map(shape=>shape?{...shape,landmark:st.focus==='landmark'}:null)},{demo:'transform',from,to,transform});
      }
      if(a.kind==='marks'&&a.cells.length===1&&b.cells.length===1||a.kind==='track'&&a.position!==b.position){
        const dx=a.kind==='track'?(b.position-a.position)*76/(a.slots-1):(b.cells[0]%3-a.cells[0]%3)*27.5;
        const dy=a.kind==='track'?0:(Math.floor(b.cells[0]/3)-Math.floor(a.cells[0]/3))*27.5;
        demo=`<div class="demo r-exact-movement" style="--r-dx:${dx}px;--r-dy:${dy}px"><div class="transform-stage">${svg(b,'target')}${svg(a,'r-position-source')}</div>${tile(b,`観測したマス${to+1}の静止画`)}</div>`;
      }
      if(!demo)demo=`<div class="demo r-observed-motion">${tile(a,`観測したマス${from+1}`)}<b>→</b>${tile(b,`観測したマス${to+1}`)}</div>`;
      const focus=R.specs[question.id].features.find(f=>f.id===st.focus)?.focus||'';
      return `<div class="r-motion ${playing?'':'r-paused'} focus-${focus}" aria-label="見えている２図の変化">${demo}<p class="quiet">既知の２図だけを比較しています。</p></div>`;
    }
    function explanation(question,st){
      const e=question.explanations[st.explanationStep],spec=R.specs[question.id];
      const marked=['Q04','Q06'].includes(question.id)?{...question,board:question.board.map(shape=>shape?{...shape,landmark:true}:null),choices:question.choices.map(c=>({...c,shape:{...c.shape,landmark:true}}))}:question;
      const next=st.explained?R.related(questions,question,model.data):null;
      return `<section class="explanation r-answer-explanation"><p class="feedback" role="status">${st.answer.correct?'正解。見つけた規則をすべて確かめよう。':question.choices.find(c=>c.id===st.answer.choiceId).feedback}</p>${ruleHeader(question,st.explanationStep)}<p class="explanation-text" aria-live="polite">${e.text}</p><div class="r-motion ${playing?'':'r-paused'} focus-${e.focus}">${window.LabExplanations.render(marked,e)}</div><p class="quiet">${st.explanationStep+1} / ${question.explanations.length} · ${spec.required.length}種類の規則を確認</p><nav class="explanation-controls"><button data-r="explain-prev" ${!st.explanationStep?'disabled':''}>前へ</button><button data-r="replay">もう一度見る</button><button data-r="explain-next" ${st.explanationStep===question.explanations.length-1?'disabled':''}>次へ</button></nav>${st.explained?next?`<button class="secondary restart" data-r="related" data-id="${next.id}">似た考え方の問題へ · ${next.id}</button>`:'<p class="quiet">同じ規則の別問題は、まだありません。</p>':''}</section>`;
    }
    function render(){
      if(run.completed){results();return;}screen='run';
      const question=q(),st=s(),spec=R.specs[question.id],lesson=R.lessons.find(l=>l.id===run.lessonId);
      const checks=st.phase===2&&st.verified?st.hypotheses.map(id=>R.verify(question,id)):[];
      const texts=['特徴を１つずつ見て、目印を選ぼう。','考えられる規則を選ぼう。答えの４択はまだ出しません。','選んだ規則を、見えている別の組でも試そう。','見つけた規則に合う図形を１つ選ぼう。'];
      const names=['観察','仮説','検証','解答'];
      let content='';
      if(st.phase===0)content=observation(question,st)+mini(question,st);
      if(st.phase===1)content=hypotheses(question,st);
      if(st.phase===2)content=`<p class="r-selected-hypothesis">仮説：${st.hypotheses.map(id=>spec.rules.find(h=>h.id===id).label).join(' ／ ')}</p><button class="text-button" data-r="change">仮説を選び直す</button><button class="primary restart" data-r="check" ${st.hypotheses.length!==R.groups(question).length?'disabled':''}>仮説を検証する</button>${checks.length?`<p class="r-check-note" role="status">${checks.every(c=>c.holds)?'見えている例では一致します。未知のマスは、まだ決めていません。':'不一致のマスを×と破線で示しました。別の仮説も試せます。'}</p>${evidence(question,checks)}`:'<p class="quiet">答えのマスは検証に使いません。</p>'}`;
      if(st.phase===3)content=`${!st.answer?observation(question,st):''}${st.hints&&!st.answer?`<p class="hint-note">ヒント${st.hints}：${question.hints[st.hints-1].text}</p>`:''}<fieldset class="choices r-choices" ${st.answer?'disabled':''}><legend>図形を１つ選んでください</legend>${question.choices.map((c,i)=>`<button class="choice ${st.choiceId===c.id?'selected':''} ${st.answer&&c.id===question.answerId?'correct':''}" data-r="choice" data-id="${c.id}" aria-label="選択肢${i+1}、${label(c.shape)}" aria-pressed="${st.choiceId===c.id}"><span class="choice-number">${i+1}</span>${svg(c.shape)}<span class="choice-state">${st.answer&&c.id===question.answerId?'✓ 正解':st.choiceId===c.id?'✓ 選択':''}</span></button>`).join('')}</fieldset>${st.answer?explanation(question,st):`<div class="actions"><button class="primary" data-r="grade" ${!st.choiceId?'disabled':''}>答え合わせ</button><button class="secondary" data-r="hint" ${st.hints>=question.hints.length?'disabled':''}>ヒント ${st.hints} / ${question.hints.length}</button></div>`}`;
      const nextDisabled=st.phase===1&&st.hypotheses.length!==R.groups(question).length||st.phase===2&&!st.verified||st.phase===3&&(!st.answer||!st.explained);
      app.innerHTML=`<div class="reasoning-surface ${playing?'':'r-paused'}"><div class="session-nav"><span>${lesson?`LESSON ${lesson.id.slice(1)} · ${lesson.title}`:`ガイド付き練習 ${run.index+1} / 8`}</span>${menu}</div>${notice()}<h2 tabindex="-1">STEP ${st.phase+1} · ${names[st.phase]}</h2><p class="r-lead">${texts[st.phase]}</p><span class="eyebrow">${question.id} · ${st.answer?question.ruleSummary:question.category}</span>${board(question,st,checks)}${content}${st.phase!==1&&!st.answer?`<div class="r-play-controls"><button data-r="motion">動きで比較</button><button data-r="pause" aria-pressed="${!playing}">${playing?'停止する':'停止中'}</button><button data-r="replay">もう一度見る</button></div>${motion?observedMotion(question,st):''}`:st.answer?`<button class="text-button" data-r="pause" aria-pressed="${!playing}">${playing?'動きを停止':'動きは停止中'}</button>`:''}${!st.answer?`<button class="text-button" data-r="assist" ${st.assist===2?'disabled':''}>観察の支援 ${st.assist} / 2</button>${st.assist?`<p class="hint-note">${st.assist===1?'まず１つの特徴だけを選びましょう。':question.layout==='sequence'?'次に、隣り合う組を順に比べ、同じ変化が続くか試しましょう。':'次に、横の別の行、縦の別の列でも同じ変化になるか試しましょう。'}</p>`:''}`:''}<nav class="r-step-nav"><button data-r="back" ${!st.phase||st.answer?'disabled':''}>戻る</button><button class="primary" data-r="next" ${nextDisabled?'disabled':''}>${st.phase===3?run.kind==='lesson'?'レッスンを完了':run.index===7?'結果を見る':'次の問題':'次へ'}</button></nav>${run.kind==='guided'&&st.phase===0?'<button class="text-button" data-r="direct">ガイドなしで解答へ</button>':''}<p class="quiet">ガイド利用：${st.guideUsed?'あり':'なし'} · ヒント：${st.hints}回 · 検証：${st.checks}回</p></div>`;
    }
    function results(){
      screen='results';const list=run.ids.map(id=>({id,...run.states[id].answer}));
      const last=byId[run.ids.at(-1)],related=R.related(questions,last,model.data);
      app.innerHTML=`${menu}<span class="eyebrow">REASONING LAB</span><h2 tabindex="-1">${run.kind==='lesson'?'レッスンを確認しました':'８問の練習を確認しました'}</h2><p class="menu-intro">${run.kind==='lesson'?'観察・仮説・検証・解説の確認を記録しました。正解数だけでは完了を決めません。':'回答と解説の確認を記録しました。ガイドを使わなかった回答も区別して表示します。'}</p><div class="result-list">${list.map(a=>`<article><span class="eyebrow">${a.id}</span><h3>${byId[a.id].ruleSummary}</h3><strong>${a.correct?'正解':'解説で確認'}</strong><p>ガイド${a.guideUsed?'あり':'なし'} · ヒント${a.hints}回 · 仮説検証${a.checks}回</p></article>`).join('')}</div><p class="quiet">通常初見・復習・チャレンジとは別の記録です。操作回数から理解度や能力を判定しません。</p>${related?`<button class="secondary restart" data-r="related" data-id="${related.id}">似た考え方の問題へ · ${related.id}</button>`:'<p class="quiet">同じ規則の別問題は、まだありません。</p>'}<button class="primary restart" data-r="hub">レッスン一覧へ</button>`;focus();
    }
    function handle(button){
      if(!button.dataset.r)return false;
      const action=button.dataset.r,id=button.dataset.id;
      if(action==='menu'){store.leave();onMenu();return true;}
      if(action==='hub'){hub();return true;}
      if(action==='lesson'){begin('lesson',id);return true;}
      if(action==='guided'){begin('guided');return true;}
      if(action==='related'){store.leave();onRelated(id);return true;}
      if(screen!=='run'||!run)return true;
      const st=s(),question=q();
      if(action==='feature')store.update(run,x=>{x.focus=id;x.guideUsed=true;});
      if(action==='axis')store.update(run,x=>{x.axis=id;x.pairIndex=0;x.guideUsed=true;});
      if(action==='pair')store.update(run,x=>{x.pairIndex++;x.guideUsed=true;});
      if(action==='hypothesis'&&!st.answer)store.update(run,x=>{const h=R.specs[question.id].rules.find(h=>h.id===id);x.hypotheses=x.hypotheses.filter(i=>R.specs[question.id].rules.find(h=>h.id===i).group!==h.group).concat(id);x.verified=false;x.guideUsed=true;});
      if(action==='change'&&!st.answer)store.update(run,x=>x.phase=1);
      if(action==='check')store.check(run);
      if(action==='assist')store.update(run,x=>{x.assist=Math.min(2,x.assist+1);x.guideUsed=true;});
      if(action==='hint'&&!st.answer)store.update(run,x=>x.hints=Math.min(question.hints.length,x.hints+1));
      if(action==='choice'&&!st.answer)store.update(run,x=>x.choiceId=id);
      if(action==='grade'){store.submit(run);playing=true;}
      if(action==='back'&&!st.answer)store.update(run,x=>x.phase=Math.max(0,x.phase-1));
      if(action==='direct'&&run.kind==='guided')store.update(run,x=>{x.phase=3;x.visited.push(3);});
      if(action==='next'){
        if(st.phase===3)store.finish(run);
        else if(!(st.phase===1&&st.hypotheses.length!==R.groups(question).length||st.phase===2&&!st.verified))store.update(run,x=>{x.phase++;x.visited=[...new Set([...x.visited,x.phase])];});
        motion=false;playing=false;
      }
      if(['explain-prev','explain-next'].includes(action)&&st.answer)store.update(run,x=>{x.explanationStep=Math.max(0,Math.min(question.explanations.length-1,x.explanationStep+(action==='explain-next'?1:-1)));if(x.explanationStep===question.explanations.length-1)x.explained=true;});
      if(action==='motion'||action==='replay'){if(!st.answer)store.update(run,x=>x.guideUsed=true);motion=true;playing=true;}
      if(action==='pause')playing=!playing;
      render();
      const control=app.querySelector(`[data-r="${action}"]${id?`[data-id="${id}"]`:''}`);
      if(['next','back','direct'].includes(action))focus();else control?.focus({preventScroll:true});
      return true;
    }
    function recordPanel(){
      const data=model.data.reasoning,states=data.runs.flatMap(r=>Object.values(r.states));
      return `<section class="analysis-card reasoning-records"><h3>解き方レッスン</h3><p>${R.lessons.map(l=>`${l.id} ${l.title}：${data.lessons[l.id]?.completed?'✓ 完了':data.lessons[l.id]?.started?'開始済み':'未開始'}`).join('<br>')}</p><p>ガイド練習：${data.runs.filter(r=>r.kind==='guided'&&r.completed).length}セット完了</p><p>仮説の検証：${states.reduce((n,s)=>n+s.checks,0)}回 · ガイド利用のある回答：${states.filter(s=>s.answer?.guideUsed).length}回 · ヒント利用のある回答：${states.filter(s=>s.answer?.hints).length}回</p><p>通常成績とは別集計。回数は学習の操作記録で、理解度・IQの推定には使いません。</p><button class="secondary" data-action="reasoning">解き方を学ぶ</button></section>`;
    }
    return {hub,resume,handle,recordPanel,openLesson:id=>begin('lesson',id),leave:()=>store.leave()};
  }
  return {create,ruleHeader};
})();
