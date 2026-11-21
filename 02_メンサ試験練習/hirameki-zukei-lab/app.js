/* 画面とセッションの進行。出題・保存はLabLearning、描画は別モジュールに委譲。 */
(() => {
  const questions = window.LabQuestions;
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  const { svg, label } = window.LabShapes;
  const learning = window.LabLearning;
  let storage;
  try { storage = window.localStorage; } catch { storage = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } }; }
  const model = learning.create(questions, storage);
  const timed = window.LabChallenge.create(model,questions);
  const practiceClock = window.LabChallenge.stopwatch();
  const app = document.querySelector('#app');
  let session, view = 'question', selected = null, graded = false, hintCount = 0, step = 0, reviewed = false, practiceLevel=0;
  window.LabDebug=Object.freeze({adaptive:()=>JSON.parse(JSON.stringify(model.data.adaptiveSets.at(-1)||null)),profile:()=>window.LabAdaptive.profile(questions,model.data)});
  const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = () => byId[session.entries[session.index].questionId];
  const answer = q => q.choices.find(c => c.id === q.answerId).shape;
  const notice = () => !model.persistent ? '<p class="storage-note" role="status">この環境では記録を保存できません。この画面では続けて練習できます。閉じると記録は残りません。</p>' : model.recovered ? '<p class="storage-note" role="status">保存データの一部を復旧し、利用できる記録で続けています。</p>' : '';
  const menuButton = (text = 'メニューへ') => `<button class="text-button" data-action="menu">${text}</button>`;
  function focusHeading() {
    app.querySelector('h2')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function feedback(q, chosen) {
    if (chosen.id === q.answerId) return '正解！ 見つけた規則を確かめましょう。';
    if (q.practice) return '矢印が回る向きを、解説で確かめましょう。';
    if (chosen.feedback) return chosen.feedback;
    const correct = answer(q);
    const directionOK = chosen.shape.direction === correct.direction;
    const countOK = chosen.shape.count === correct.count;
    if (q.id === 'Q02') return directionOK
      ? '矢印の下向きは合っています。下の行の点は３つです。'
      : '点３つは合っています。矢印は右から下に回ります。';
    if (directionOK) return '切り欠きの向きは合っています。下の行の穴は１つです。';
    if (countOK) return '穴１つは合っています。切り欠きは上から左へ移ります。';
    return '向きと個数を、１つずつ確かめましょう。切り欠きは左、穴は１つです。';
  }
  function board(q, focus, reveal) {
    return `<div class="board ${q.layout === 'strip' ? 'sequence' : ''} ${q.layout === 'sequence' ? 'numbered-sequence' : ''} focus-${focus}" style="grid-template-columns:repeat(${q.columns||3},minmax(0,1fr))" aria-label="${q.layout === 'sequence' ? '番号の順に読む盤面' : '問題の盤面'}">${q.board.map((shape,i) => `<div class="cell ${i>=6?'bottom-row':''} ${i<3?'example-row':''} ${!shape?'missing':''}">${q.layout==='sequence'?`<span class="cell-order">${i+1}</span>`:''}${svg(shape || (reveal ? answer(q) : null))}</div>`).join('')}</div>`;
  }
  function renderQuestion() {
    view = 'question';
    const q = current(), entry = session.entries[session.index];
    const explanation = q.explanations[step];
    const focus = graded ? explanation.focus : hintCount ? q.hints[hintCount-1].focus : '';
    const position = session.mode==='daily' ? model.data.daily[session.date].ids.indexOf(q.id)+1 : session.mode==='adaptive'?model.data.adaptiveSets.find(s=>s.id===session.date).ids.indexOf(q.id)+1:session.index+1;
    const total = session.mode==='daily' ? 5 : session.mode==='adaptive'?8:session.entries.length;
    app.innerHTML = `<div class="session-nav"><span>${session.name}</span>${menuButton(session.mode==='tutorial'?'あとで練習する':'メニューへ')}</div>
      ${notice()}<div class="progress"><span>進捗 <strong>${position} / ${total}</strong></span><span>${q.practice?'操作の練習':`LEVEL ${q.difficulty} · ${['','基本','標準','発展'][q.difficulty]}`}</span></div>
      <div class="progress-track" aria-hidden="true"><span style="width:${position/total*100}%"></span></div>
      ${entry.originId?`<p class="review-origin">${entry.originId}「${byId[entry.originId].title}」の復習${entry.originId!==q.id?` · 類題 ${q.id}`:' · 元の問題'}</p>`:''}
      <div class="question-heading"><span class="eyebrow">${q.id} / ${q.title}</span><h2 id="question-title" tabindex="-1">${q.prompt}</h2>${q.layout==='sequence'?'<p class="sequence-note">番号の順に見てください。</p>':''}</div>
      ${board(q,focus,graded && explanation.focus==='combine')}
      ${graded?`<p class="board-note">${explanation.text}</p>`:''}
      ${!graded&&hintCount?`<p class="hint-note" role="status">ヒント ${hintCount}：${q.hints[hintCount-1].text}</p>`:''}
      <fieldset class="choices" ${graded?'disabled':''}><legend>図形を１つ選んでください</legend>${q.choices.map((c,i) => `<button type="button" class="choice ${selected===c.id?'selected':''} ${graded&&c.id===q.answerId?'correct':''}" data-choice="${c.id}" aria-label="選択肢${i+1}、${label(c.shape)}" aria-pressed="${selected===c.id}"><span class="choice-number">${i+1}</span>${svg(c.shape)}<span class="choice-state">${graded&&c.id===q.answerId?'✓ 正解':selected===c.id?'✓ 選択':''}</span></button>`).join('')}</fieldset>
      ${graded?`<section class="explanation" aria-label="解説"><p class="feedback" role="status">${feedback(q,q.choices.find(c=>c.id===selected))}</p><div class="explanation-heading"><h3>見るポイント</h3><span>${step+1} / ${q.explanations.length}</span></div><p class="explanation-text" aria-live="polite">${explanation.text}</p><div class="focus-${explanation.focus}">${window.LabExplanations.render(q,explanation)}</div><nav class="explanation-controls" aria-label="解説の操作"><button data-action="prev" ${step===0?'disabled':''}>前へ</button><button data-action="replay">もう一度見る</button><button data-action="step" ${step===q.explanations.length-1?'disabled':''}>次へ</button></nav></section><button class="primary next-question" data-action="next" ${!reviewed?'disabled':''}>${session.index===session.entries.length-1?'結果を見る':'次の問題'}</button>${!reviewed?'<p class="quiet">解説の「次へ」で、最後のポイントまで確認しよう。</p>':''}`
      :`<div class="actions"><button class="primary" data-action="grade" ${!selected?'disabled':''}>答え合わせ</button>${q.hints.length?`<button class="secondary" data-action="hint" ${hintCount===q.hints.length?'disabled':''}>${hintCount===q.hints.length?'ヒント表示済み':`ヒント ${hintCount+1} / ${q.hints.length}`}</button>`:''}</div><p class="quiet">${q.practice?'操作練習は学習記録に含めません。':'選んだあと「答え合わせ」で確定します。'}</p>`}`;
  }
  function resetQuestion() {
    selected=null; graded=false; hintCount=0; step=0; reviewed=false;
    model.seen(current().id);
    practiceClock.reset();
    if(document.hidden)practiceClock.pause();
    renderQuestion(); focusHeading();
  }
  function start(mode, entries, name, date) {
    timed.pause();model.data.resumeChallengeId=null;
    if(mode!=='adaptive')model.data.resumeAdaptiveId=null;
    if(mode!=='daily')model.leaveDaily();
    model.save();
    session = { mode, entries, name, date, index:0, results:[] };
    if (!entries.length) { showResults(); return; }
    resetQuestion();
  }
  function tutorial() { start('tutorial',['Q01','Q02','Q03'].map(questionId=>({questionId})),'チュートリアル'); }
  function showMenu() {
    timed.pause();practiceClock.pause();model.data.resumeChallengeId=null;model.data.resumeAdaptiveId=null;
    model.leaveDaily();
    model.onboard(); view='menu';
    const today = learning.jstDate();
    const set = model.data.daily[today];
    const done = set ? Object.keys(set.answers).length : 0;
    const pending = Object.keys(model.data.reviews).length;
    app.innerHTML = `<span class="eyebrow">YOUR FIGURE LAB</span><h2 tabindex="-1">今日は、どこから始める？</h2><p class="menu-intro">見る場所を変えると、規則が見えてくる。</p>${notice()}
      <button class="daily-button" data-action="daily"><span>毎日５問</span><small>${today.replaceAll('-',' / ')} · ${done===5?'今日の５問は完了 · 結果を見る':done?`${done} / 5 問 回答済み · 続きから`:'未回答を優先した、今日のセット'}</small></button>
      <button class="adaptive-button" data-action="adaptive"><strong>おまかせ練習</strong><span>８問 · 記録に合わせて、４分野から</span></button><div class="menu-options"><button data-action="practice"><strong>じっくり練習</strong><span>分野を選んで、時間制限なし</span></button><button data-action="challenge"><strong>時間制限チャレンジ</strong><span>${timed.active?'一時停止中のチャレンジがあります':'５問／５分・10問／10分'}</span></button><button data-action="review"><strong>苦手の復習</strong><span>${pending?`${pending}件の見るポイントを、別の問題で`:'いま復習する問題はありません'}</span></button><button data-action="records"><strong>学習記録</strong><span>通常練習・復習 ${Object.keys(model.data.records).length} / ${questions.length-1}問</span></button></div>
      <button class="text-button tutorial-link" data-action="tutorial">チュートリアルをもう一度</button><p class="app-note">オリジナル64問による非公式の練習用です。実試験の再現、合格見込み、IQ換算は行いません。記録はこの端末内に保存します。</p>`;
    focusHeading();
  }
  function showPractice() {
    model.data.resumeChallengeId=null;model.data.resumeAdaptiveId=null;model.save();
    model.leaveDaily();
    view='practice';
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">じっくり練習</h2><p class="menu-intro">分野を選んで、自分のペースで。<br>未回答の問題から順に練習します。</p>${notice()}<label class="level-filter">難易度 <select id="practice-level">${['おまかせ','基本','標準','発展'].map((text,i)=>`<option value="${i}" ${practiceLevel===i?'selected':''}>${text}</option>`).join('')}</select></label><div class="menu-options">${learning.categories.map((category,i)=>{const ids=model.practice(category,practiceLevel);return `<button data-action="category" data-category="${i}" ${!ids.length?'disabled':''}><strong>${category}</strong><span>${ids.length?`${ids.length}問 · 未回答 ${ids.filter(id=>!model.data.records[id]).length}問`:'条件に合う問題がありません'}</span></button>`;}).join('')}</div><p class="quiet">おまかせは全難易度。選んだ難易度の問題だけを出します。Q01はチュートリアル専用です。</p>`;
    focusHeading();
  }
  function showReview() {
    view='review';
    const plan=model.reviewPlan();
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">苦手の復習</h2>${notice()}${!plan.length?'<p class="empty-state">いま復習する問題はありません</p>':`<p class="menu-intro">同じ考え方の未回答の類題を優先します。<br>ヒントなしで正解すると、その項目は完了です。</p><div class="review-list">${plan.map(e=>`<article><span class="eyebrow">${e.originId} の復習</span><h3>${byId[e.originId].title}</h3><p>${e.questionId!==e.originId?`類題 ${e.questionId}「${byId[e.questionId].title}」`:'未回答の類題がないため、元の問題'}</p><span class="review-tag">${byId[e.originId].category}</span></article>`).join('')}</div><button class="primary restart" data-action="start-review">復習をはじめる（${plan.length}問）</button>`}`;
    const higher=model.higherPlan();
    app.insertAdjacentHTML('beforeend',`<section class="analysis-card mastery-list"><h3>習熟確認と次の挑戦</h3><p>ヒントなしで確認済み：${Object.keys(model.data.mastery).length}規則。高難度の誤答で確認済み記録は消えません。</p>${Object.entries(model.data.mastery).map(([family,m])=>`<p>${m.questionId||""} ${escapeHTML(byId[m.questionId]?.title||family)} · LEVEL ${m.level} 確認済み</p>`).join('')}${higher.map(e=>`<button class="history-button" data-action="higher" data-question="${e.questionId}" data-origin="${e.originId}">${e.questionId} · LEVEL ${byId[e.questionId].difficulty}の類題に挑戦</button>`).join('')}</section>`);
    focusHeading();
  }
  function showRecords() {
    view='records';
    const records=Object.values(model.data.records).filter(r=>r.first.source==='practice');
    const analysis=window.LabAnalytics.summarize(questions,model.data,learning.categories);
    const guide=window.LabAdaptive.guide(questions,model.data);
    const labels=['初見でヒントなし正解','初見でヒントあり正解','初見で不正解'];
    const rate=(n,d)=>d?`${Math.round(n/d*100)}%（${n} / ${d}問）`:'未集計（0問）';
    const firstLabel=a=>a.source==='practice'?learning.firstStatus(a):!a.source?`旧版：${learning.firstStatus(a)}`:`${a.source==='review'?'復習での初回':'チャレンジ後の練習'}：${learning.status(a.correct,a.hints)}`;
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">学習記録・分野別分析</h2><p class="menu-intro">通常練習の初見と、復習・チャレンジは分けて表示します。初見結果は解き直しても変わりません。</p>${notice()}<div class="record-summary">${labels.map(text=>`<div><strong>${records.filter(r=>learning.firstStatus(r.first)===text).length}</strong><span>${text}</span></div>`).join('')}</div><p class="weakest-note">${analysis.weakest?`練習上の目安：${analysis.weakest}（通常初見の正答率が単独で最も低い分野）`:analysis.enough?'今の記録では、最も苦手な分野を１つに絞れません。':'データ不足のため、最も苦手な分野は断定しません。各分野５問以上の通常初見結果が必要です。'}</p>
      <div class="analysis-list">${analysis.rows.map(r=>`<article class="analysis-card"><h3>${r.category}</h3><dl><div><dt>初見正答率</dt><dd>${rate(r.correct,r.denominator)}</dd></div><div><dt>初見ヒント使用率</dt><dd>${rate(r.hinted,r.denominator)}</dd></div><div><dt>通常練習の平均回答時間</dt><dd>${r.averageMs===null?'未計測':`${(r.averageMs/1000).toFixed(1)}秒`}（計測${r.timedCount}回答）</dd></div><div><dt>練習問題数・復習待ち</dt><dd>${r.practiced} / ${r.total}問・${r.pending}件</dd></div></dl><p>復習の回答：${r.reviewAnswers}回${r.reviewTimedCount?`・平均${(r.reviewTotalMs/r.reviewTimedCount/1000).toFixed(1)}秒（${r.reviewTimedCount}回答）`:''}</p>${r.legacyCount?`<p class="legacy-note">旧版初見：正解${r.legacyCorrect} / ${r.legacyCount}問。モード・時間が未記録のため、上の率・平均時間には混ぜていません。</p>`:''}</article>`).join('')}</div>
      <section class="analysis-card"><h3>終了したチャレンジ（別集計）</h3><p>${analysis.challenge.sessions}回・正解${analysis.challenge.correct} / ${analysis.challenge.answered}回答</p><p>回答済みの平均：${analysis.challenge.averageMs===null?'未計測':`${(analysis.challenge.averageMs/1000).toFixed(1)}秒`}</p><p>スキップ${analysis.challenge.skipped}問・時間切れ${analysis.challenge.timeout}問・中断${analysis.challenge.interrupted}問</p></section>
      <details class="analysis-policy"><summary>成績が変化する条件</summary><p>初見の率は、通常練習で新しい問題を初めて確定したときだけ増えます。初回が復習、または先にチャレンジで見た問題は初見集計に含めません。平均時間はv0.2.0以降の通常練習で確定した回答の前面表示時間で更新し、ヒントを読む時間も含めます。未回答・解説・背景・復習・チャレンジの時間は混ぜません。旧版の初見結果は保持し、情報不足のため別枠で表示します。</p></details>
      <p class="quiet">通常・復習 ${Object.keys(model.data.records).length} / ${questions.length-1} 問 回答済み · Q01は集計対象外</p><div class="record-list">${questions.filter(q=>!q.practice).map(q=>{const r=model.data.records[q.id];return `<article><div><span class="eyebrow">${q.id} · ${q.category}</span><h3>${q.title}</h3></div><p>${r?firstLabel(r.first):'未回答'}</p></article>`;}).join('')}</div>`;
    const guideSection=document.createElement('section');guideSection.className='analysis-card learning-guide';
    guideSection.innerHTML=`<h3>次のおすすめ練習</h3><p>${guide.text}</p><p>${guide.reason}</p><button class="secondary" data-action="guide" data-category="${guide.category?learning.categories.indexOf(guide.category):-1}" data-level="${guide.level}">おすすめを練習する</button>`;
    app.querySelector('.record-summary').before(guideSection);
    focusHeading();
  }
  function startAdaptive(id){
    const set=id?model.data.adaptiveSets.find(s=>s.id===id):model.adaptive();if(!set)return;
    model.data.resumeAdaptiveId=set.id;model.save();
    start('adaptive',set.entries.filter(e=>!set.answers[e.questionId]),'おまかせ練習',set.id);
    if(view==='question'){
      const repeat=set.entries.some(e=>e.repeated);
      app.insertAdjacentHTML('afterbegin',`<p class="adaptive-note">${repeat?'条件内の未回答が不足したため、解いた問題も含みます。':'４分野から、未回答を中心に選んだ８問です。'}</p>`);
    }
  }
  function showResults() {
    view='results';
    let results=session.results;
    if(session.mode==='daily') {
      const set=model.data.daily[session.date];
      results=set.ids.filter(id=>set.answers[id]).map(id=>({id,...set.answers[id]}));
    }
    if(session.mode==='adaptive'){
      const set=model.data.adaptiveSets.find(s=>s.id===session.date);
      results=set.ids.filter(id=>set.answers[id]).map(id=>({id,...set.answers[id]}));
    }
    app.innerHTML=`<div class="result-icon" aria-hidden="true">✧</div><span class="eyebrow">${session.mode==='daily'?session.date:'SESSION COMPLETE'}</span><h2 tabindex="-1">${session.mode==='daily'?'今日の５問は完了':session.mode==='tutorial'?'３問、おつかれさまでした。':'練習、おつかれさまでした。'}</h2>${notice()}<div class="result-list">${results.map(r=>`<article><span class="eyebrow">${r.id}${r.originId?` · ${r.originId}の復習`:''}</span><h3>${byId[r.id].title}</h3><strong>${r.status}</strong>${r.id==='Q03'?`<p>${r.status==='自力で正解'?'ヒントなしで、２つの規則を見つけました。':'向きと穴の数を、別々に確かめました。'}</p>`:''}</article>`).join('')}</div>${session.mode==='tutorial'?'<p class="quiet">Q01は操作練習のため、集計していません。</p><button class="secondary restart" data-action="tutorial">最初からもう一度</button>':''}<button class="primary restart" data-action="menu">メニューへ</button><button class="secondary restart" data-action="practice">じっくり練習を続ける</button>`;
    if(session.mode==='adaptive')app.insertAdjacentHTML('beforeend','<button class="secondary restart" data-action="adaptive-new">新しい８問を練習する</button>');
    if(new URLSearchParams(location.search).has('debug')&&session.mode==='adaptive')app.insertAdjacentHTML('beforeend',`<details class="analysis-policy"><summary>出題理由（デバッグ）</summary><pre class="debug-reasons">${escapeHTML(JSON.stringify(model.data.adaptiveSets.find(s=>s.id===session.date),null,2))}</pre></details>`);
    if(session.mode==='tutorial')model.onboard();
    focusHeading();
  }
  let challengeDetail=null;
  const clockText=ms=>{const seconds=Math.ceil(Math.max(0,ms)/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
  const outcomeText=a=>a.state==='answered'?(a.correct?'正解':'不正解'):a.state==='skipped'?'スキップ・未回答':a.state==='timeout'?'時間切れ・未回答':'中断・未回答';
  function showChallengeChooser(){
    timed.pause();practiceClock.pause();view='challenge-chooser';
    const pending=timed.active;
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">時間制限チャレンジ</h2><p class="menu-intro">実際のMENSA試験を再現したものではない、独自の練習モードです。</p>${notice()}<p class="challenge-rules">ヒント・解説は終了後に見られます。確定後は戻って変更できません。背景に移ると自動で一時停止します。</p>${pending?`<div class="analysis-card"><h3>${pending.ids.length}問コースを一時停止中</h3><p>残り ${clockText(pending.limitMs-pending.elapsedMs)}</p><button class="primary restart" data-action="challenge-resume">続きから再開する</button><button class="secondary restart" data-action="challenge-end">中断して結果を見る</button></div>`:`<div class="menu-options"><button data-action="challenge-start" data-count="5"><strong>５問／５分</strong><span>４分野から５問</span></button><button data-action="challenge-start" data-count="10"><strong>10問／10分</strong><span>４分野から10問</span></button></div>`}<div class="challenge-history"><h3>終了したチャレンジ</h3>${model.data.challenges.filter(c=>c.status==='finished').slice().reverse().map(c=>`<button class="history-button" data-action="challenge-result" data-result="${c.id}">${c.ids.length}問コース · 正解${Object.values(c.answers).filter(a=>a.correct).length} / ${c.ids.length}問 · ${clockText(c.elapsedMs)}</button>`).join('')||'<p>まだ記録はありません。</p>'}</div>`;
    focusHeading();
  }
  function renderChallenge(){
    const s=timed.active;
    if(!s){if(timed.last)showChallengeResults(timed.last.id);return;}
    model.data.resumeChallengeId=s.id;model.save();
    const answered=Object.values(s.answers).filter(a=>a.state==='answered').length;
    const skipped=Object.values(s.answers).filter(a=>a.state==='skipped').length;
    const remaining=s.limitMs-s.elapsedMs;
    const hud=`<div class="challenge-hud"><div><span>残り時間</span><strong class="countdown" role="timer" aria-label="残り時間 ${clockText(remaining)}">${clockText(remaining)}</strong></div><p>回答済み ${answered} / ${s.ids.length}問<br>スキップ ${skipped}問</p></div><p class="time-warning" aria-live="polite">${remaining<=60000?'残り１分以内です。':''}</p>`;
    if(s.status==='paused'){
      view='challenge-paused';
      app.innerHTML=`${menuButton()}<h2 tabindex="-1">チャレンジを一時停止中</h2>${hud}${notice()}<p class="menu-intro">停止中の時間は加算しません。準備ができたら再開してください。</p><button class="primary restart" data-action="challenge-resume">再開する</button><button class="secondary restart" data-action="challenge-end">中断して結果を見る</button>`;
      focusHeading();return;
    }
    view='challenge';
    const id=s.ids.find(id=>!s.answers[id]),q=byId[id];
    app.innerHTML=`<div class="session-nav"><span>時間制限チャレンジ · ${s.ids.length}問</span><button class="text-button" data-action="challenge-pause">一時停止</button></div>${hud}${notice()}<div class="progress"><span>進捗 <strong>${Object.keys(s.answers).length+1} / ${s.ids.length}</strong></span><span>${q.category}</span></div><div class="question-heading"><span class="eyebrow">${q.id} / ${q.title}</span><h2 tabindex="-1">${q.prompt}</h2>${q.layout==='sequence'?'<p class="sequence-note">番号の順に見てください。</p>':''}</div>${board(q,'',false)}<fieldset class="choices"><legend>図形を１つ選んでください</legend>${q.choices.map((c,i)=>`<button class="choice ${s.selectedChoice===c.id?'selected':''}" data-choice="${c.id}" data-question="${id}" aria-label="選択肢${i+1}、${label(c.shape)}" aria-pressed="${s.selectedChoice===c.id}"><span class="choice-number">${i+1}</span>${svg(c.shape)}<span class="choice-state">${s.selectedChoice===c.id?'✓ 選択':''}</span></button>`).join('')}</fieldset><div class="actions"><button class="primary" data-action="challenge-submit" data-question="${id}" ${!s.selectedChoice?'disabled':''}>回答を確定</button><button class="secondary" data-action="challenge-skip" data-question="${id}">スキップ</button></div><p class="quiet">確定・スキップ後は前の問題に戻れません。</p>`;
    focusHeading();
  }
  function showChallengeResults(id){
    const s=model.data.challenges.find(c=>c.id===id&&c.status==='finished');if(!s)return;
    view='challenge-results';model.data.resumeChallengeId=s.id;model.save();
    const outcomes=Object.values(s.answers),answers=outcomes.filter(a=>a.state==='answered');
    app.innerHTML=`${menuButton()}<span class="eyebrow">独自の練習モード</span><h2 tabindex="-1">チャレンジの結果</h2>${notice()}<p class="challenge-score">正答 ${answers.filter(a=>a.correct).length} / ${s.ids.length}問</p><p>回答済み ${answers.length}問 · 回答時間 ${clockText(s.elapsedMs)}（停止時間を除く）</p><p class="menu-intro">${s.reason==='timeout'?'時間切れで終了しました。':s.reason==='interrupted'?'途中で中断しました。':'最後まで取り組みました。'}未回答は不正解と区別して表示します。</p><div class="challenge-results">${s.ids.map(qid=>{const a=s.answers[qid];return `<article><span class="eyebrow">${qid} · ${byId[qid].category}</span><h3>${byId[qid].title}</h3><strong>${outcomeText(a)}</strong>${a.state==='answered'?`<p>回答時間 ${clockText(a.elapsedMs)}</p>`:''}<button class="secondary" data-action="challenge-detail" data-result="${s.id}" data-question="${qid}">詳しい解説を見る</button></article>`;}).join('')}</div><button class="primary restart" data-action="challenge">チャレンジのメニューへ</button>`;
    focusHeading();
  }
  function showChallengeDetail(id,questionId,explanationStep=0){
    const s=model.data.challenges.find(c=>c.id===id&&c.status==='finished');
    if(!s||!s.ids.includes(questionId))return;
    if(!s.seenIds.includes(questionId)){s.seenIds.push(questionId);model.save();}
    view='challenge-detail';challengeDetail={id,questionId,step:explanationStep};
    const q=byId[questionId],a=s.answers[questionId],e=q.explanations[explanationStep];
    app.innerHTML=`<button class="text-button" data-action="challenge-result" data-result="${id}">結果に戻る</button><span class="eyebrow">${q.id} · ${outcomeText(a)}</span><h2 tabindex="-1">${q.prompt}</h2>${board(q,e.focus,e.focus==='combine')}<p class="board-note">${e.text}</p><div class="choices detail-choices">${q.choices.map((c,i)=>`<div class="choice ${c.id===q.answerId?'correct':''} ${c.id===a.choiceId?'selected':''}"><span class="choice-number">${i+1}</span>${svg(c.shape)}<span class="choice-state">${c.id===q.answerId?'✓ 正解':c.id===a.choiceId?'あなたの回答':''}</span></div>`).join('')}</div><section class="explanation"><p class="feedback">${a.state==='answered'?feedback(q,q.choices.find(c=>c.id===a.choiceId)):`${outcomeText(a)}。規則を１つずつ確かめましょう。`}</p><div class="explanation-heading"><h3>見るポイント</h3><span>${explanationStep+1} / ${q.explanations.length}</span></div><p class="explanation-text" aria-live="polite">${e.text}</p><div class="focus-${e.focus}">${window.LabExplanations.render(q,e)}</div><nav class="explanation-controls" aria-label="解説の操作"><button data-action="detail-prev" ${explanationStep===0?'disabled':''}>前へ</button><button data-action="detail-replay">もう一度見る</button><button data-action="detail-step" ${explanationStep===q.explanations.length-1?'disabled':''}>次へ</button></nav></section>`;
    if(!explanationStep)focusHeading();
  }
  function changeStep(delta) {
    if(view!=='question'||!graded)return;
    step=Math.max(0,Math.min(current().explanations.length-1,step+delta));
    if(step===current().explanations.length-1)reviewed=true;
    renderQuestion();
    app.querySelector('.explanation').scrollIntoView({block:'start'});
    app.querySelector('[data-action="replay"]').focus({preventScroll:true});
  }
  app.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled)return;
    if(button.dataset.choice&&view==='challenge'){
      const s=timed.active,id=s?.ids.find(id=>!s.answers[id]);
      if(id!==button.dataset.question||!timed.select(button.dataset.choice)){if(timed.last?.status==='finished')showChallengeResults(timed.last.id);return;}
      app.querySelectorAll('[data-choice]').forEach(b=>{const active=b.dataset.choice===timed.active.selectedChoice;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);b.querySelector('.choice-state').textContent=active?'✓ 選択':'';});
      app.querySelector('[data-action="challenge-submit"]').disabled=false;return;
    }
    if(button.dataset.choice&&view==='question'&&!graded){
      selected=button.dataset.choice;
      app.querySelectorAll('[data-choice]').forEach(b=>{const active=b.dataset.choice===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);b.querySelector('.choice-state').textContent=active?'✓ 選択':'';});
      app.querySelector('[data-action="grade"]').disabled=false;return;
    }
    switch(button.dataset.action){
      case 'menu': showMenu();break;
      case 'tutorial': tutorial();break;
      case 'practice': showPractice();break;
      case 'category': {const category=learning.categories[Number(button.dataset.category)];start('practice',model.practice(category,practiceLevel).map(questionId=>({questionId})),category);break;}
      case 'adaptive': startAdaptive();break;
      case 'adaptive-new': model.adaptive(true);startAdaptive(model.data.resumeAdaptiveId);break;
      case 'higher': start('review',[{questionId:button.dataset.question,originId:button.dataset.origin}],'習熟後の挑戦');break;
      case 'guide': {
        if(Number(button.dataset.category)<0)startAdaptive();else{practiceLevel=Number(button.dataset.level);const category=learning.categories[Number(button.dataset.category)];start('practice',model.practice(category,practiceLevel).map(questionId=>({questionId})),category);}break;
      }
      case 'daily': startDaily(learning.jstDate());break;
      case 'review': showReview();break;
      case 'start-review': start('review',model.reviewPlan(),'苦手の復習');break;
      case 'records': showRecords();break;
      case 'challenge': showChallengeChooser();break;
      case 'challenge-start': timed.begin(Number(button.dataset.count));renderChallenge();break;
      case 'challenge-pause': timed.pause();renderChallenge();break;
      case 'challenge-resume': if(!document.hidden){timed.resume();renderChallenge();}break;
      case 'challenge-end': {const s=timed.interrupt();if(s)showChallengeResults(s.id);break;}
      case 'challenge-submit': case 'challenge-skip': {
        const s=timed.active;
        timed.submit(s?.selectedChoice,button.dataset.action==='challenge-skip',button.dataset.question);
        renderChallenge();break;
      }
      case 'challenge-result': showChallengeResults(button.dataset.result);break;
      case 'challenge-detail': showChallengeDetail(button.dataset.result,button.dataset.question);break;
      case 'detail-prev': case 'detail-step': case 'detail-replay': {
        if(!challengeDetail)break;
        const d=challengeDetail,delta=button.dataset.action==='detail-step'?1:button.dataset.action==='detail-prev'?-1:0;
        const next=Math.max(0,Math.min(byId[d.questionId].explanations.length-1,d.step+delta));
        showChallengeDetail(d.id,d.questionId,next);app.querySelector('.explanation').scrollIntoView({block:'start'});app.querySelector('[data-action="detail-replay"]').focus({preventScroll:true});break;
      }
      case 'hint': if(view==='question'&&!graded&&hintCount<current().hints.length){hintCount++;renderQuestion();app.querySelector('.hint-note').scrollIntoView({block:'nearest'});}break;
      case 'grade': {
        if(view!=='question'||!selected||graded)return;
        graded=true;reviewed=current().explanations.length===1;
        const q=current(), entry=session.entries[session.index];
        practiceClock.pause();
        const attempt=model.record(q.id,selected,hintCount,{originId:entry.originId,dailyDate:session.mode==='daily'?session.date:undefined,adaptiveId:session.mode==='adaptive'?session.date:undefined,durationMs:practiceClock.read()});
        if(!q.practice&&attempt)session.results.push({id:q.id,originId:entry.originId,...attempt});
        renderQuestion();app.querySelector('.explanation').scrollIntoView({block:'start'});break;
      }
      case 'prev': changeStep(-1);break;
      case 'step': changeStep(1);break;
      case 'replay': changeStep(0);break;
      case 'next': if(view==='question'&&graded&&reviewed){if(session.index<session.entries.length-1){session.index++;resetQuestion();}else showResults();}break;
    }
  });
  app.addEventListener('change',event=>{if(event.target.id==='practice-level'){practiceLevel=Number(event.target.value);showPractice();app.querySelector('#practice-level').focus();}});
  function startDaily(date) {
    const set=model.daily(date);
    model.activateDaily(date);
    start('daily',set.ids.filter(id=>!set.answers[id]).map(questionId=>({questionId})),'毎日５問',date);
  }
  setInterval(()=>{
    if(view!=='challenge')return;
    const s=timed.tick();
    if(s?.status==='finished'){showChallengeResults(s.id);return;}
    if(s){const remaining=s.limitMs-s.elapsedMs;const node=app.querySelector('.countdown');if(node){node.textContent=clockText(remaining);node.setAttribute('aria-label','残り時間 '+clockText(remaining));}const warning=app.querySelector('.time-warning');if(warning&&remaining<=60000&&!warning.textContent)warning.textContent='残り１分以内です。';}
  },1000);
  function suspend(){
    practiceClock.pause();timed.pause();
    if(view==='challenge'||view==='challenge-paused')renderChallenge();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else if(view==='question'&&!graded)practiceClock.resume();});
  window.addEventListener('pagehide',()=>{practiceClock.pause();timed.pause();});
  window.addEventListener('pageshow',event=>{if(event.persisted){suspend();if(view==='question'&&!graded&&!document.hidden)practiceClock.resume();}});
  const resumedChallenge=model.data.challenges.find(c=>c.id===model.data.resumeChallengeId);
  if(resumedChallenge){if(resumedChallenge.status==='finished')showChallengeResults(resumedChallenge.id);else renderChallenge();}
  else if(!model.data.onboarded)tutorial();
  else if(model.data.resumeAdaptiveId)startAdaptive(model.data.resumeAdaptiveId);
  else if(model.data.activeDaily===learning.jstDate()&&model.data.daily[model.data.activeDaily])startDaily(model.data.activeDaily);
  else showMenu();
})();
