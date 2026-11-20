/* 画面とセッションの進行。出題・保存はLabLearning、描画は別モジュールに委譲。 */
(() => {
  const questions = window.LabQuestions;
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  const { svg, label } = window.LabShapes;
  const learning = window.LabLearning;
  let storage;
  try { storage = window.localStorage; } catch { storage = { getItem() { throw Error('unavailable'); }, setItem() { throw Error('unavailable'); } }; }
  const model = learning.create(questions, storage);
  const app = document.querySelector('#app');
  let session, view = 'question', selected = null, graded = false, hintCount = 0, step = 0, reviewed = false;
  const current = () => byId[session.entries[session.index].questionId];
  const answer = q => q.choices.find(c => c.id === q.answerId).shape;
  const notice = () => model.persistent ? '' : '<p class="storage-note" role="status">この環境では記録を保存できません。この画面では続けて練習できます。閉じると記録は残りません。</p>';
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
    return `<div class="board ${q.layout === 'strip' ? 'sequence' : ''} ${q.layout === 'sequence' ? 'numbered-sequence' : ''} focus-${focus}" aria-label="${q.layout === 'sequence' ? '番号の順に読む盤面' : '問題の盤面'}">${q.board.map((shape,i) => `<div class="cell ${i>=6?'bottom-row':''} ${i<3?'example-row':''} ${!shape?'missing':''}">${q.layout==='sequence'?`<span class="cell-order">${i+1}</span>`:''}${svg(shape || (reveal ? answer(q) : null))}</div>`).join('')}</div>`;
  }
  function renderQuestion() {
    view = 'question';
    const q = current(), entry = session.entries[session.index];
    const explanation = q.explanations[step];
    const focus = graded ? explanation.focus : hintCount ? q.hints[hintCount-1].focus : '';
    const position = session.mode==='daily' ? model.data.daily[session.date].ids.indexOf(q.id)+1 : session.index+1;
    const total = session.mode==='daily' ? 5 : session.entries.length;
    app.innerHTML = `<div class="session-nav"><span>${session.name}</span>${menuButton(session.mode==='tutorial'?'あとで練習する':'メニューへ')}</div>
      ${notice()}<div class="progress"><span>進捗 <strong>${position} / ${total}</strong></span><span>${q.practice?'操作の練習':`難易度 ${'●'.repeat(q.difficulty)}${'○'.repeat(3-q.difficulty)}`}</span></div>
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
    renderQuestion(); focusHeading();
  }
  function start(mode, entries, name, date) {
    if(mode!=='daily')model.leaveDaily();
    session = { mode, entries, name, date, index:0, results:[] };
    if (!entries.length) { showResults(); return; }
    resetQuestion();
  }
  function tutorial() { start('tutorial',['Q01','Q02','Q03'].map(questionId=>({questionId})),'チュートリアル'); }
  function showMenu() {
    model.leaveDaily();
    model.onboard(); view='menu';
    const today = learning.jstDate();
    const set = model.data.daily[today];
    const done = set ? Object.keys(set.answers).length : 0;
    const pending = Object.keys(model.data.reviews).length;
    app.innerHTML = `<span class="eyebrow">YOUR FIGURE LAB</span><h2 tabindex="-1">今日は、どこから始める？</h2><p class="menu-intro">見る場所を変えると、規則が見えてくる。</p>${notice()}
      <button class="daily-button" data-action="daily"><span>毎日５問</span><small>${today.replaceAll('-',' / ')} · ${done===5?'今日の５問は完了 · 結果を見る':done?`${done} / 5 問 回答済み · 続きから`:'未回答を優先した、今日のセット'}</small></button>
      <div class="menu-options"><button data-action="practice"><strong>じっくり練習</strong><span>分野を選んで、時間制限なし</span></button><button data-action="review"><strong>苦手の復習</strong><span>${pending?`${pending}件の見るポイントを、別の問題で`:'いま復習する問題はありません'}</span></button><button data-action="records"><strong>学習記録</strong><span>${Object.keys(model.data.records).length} / 23 問に取り組みました</span></button></div>
      <button class="text-button tutorial-link" data-action="tutorial">チュートリアルをもう一度</button><p class="app-note">オリジナル24問による非公式の練習用です。実試験の再現、合格見込み、IQ換算は行いません。記録はこの端末内に保存します。</p>`;
    focusHeading();
  }
  function showPractice() {
    model.leaveDaily();
    view='practice';
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">じっくり練習</h2><p class="menu-intro">分野を選んで、自分のペースで。<br>未回答の問題から順に練習します。</p>${notice()}<div class="menu-options">${learning.categories.map((category,i)=>{const ids=model.practice(category);return `<button data-action="category" data-category="${i}"><strong>${category}</strong><span>${ids.length}問 · 未回答 ${ids.filter(id=>!model.data.records[id]).length}問</span></button>`;}).join('')}</div><p class="quiet">Q01はチュートリアル専用です。</p>`;
    focusHeading();
  }
  function showReview() {
    view='review';
    const plan=model.reviewPlan();
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">苦手の復習</h2>${notice()}${!plan.length?'<p class="empty-state">いま復習する問題はありません</p>':`<p class="menu-intro">同じ考え方の未回答の類題を優先します。<br>ヒントなしで正解すると、その項目は完了です。</p><div class="review-list">${plan.map(e=>`<article><span class="eyebrow">${e.originId} の復習</span><h3>${byId[e.originId].title}</h3><p>${e.questionId!==e.originId?`類題 ${e.questionId}「${byId[e.questionId].title}」`:'未回答の類題がないため、元の問題'}</p><span class="review-tag">${byId[e.originId].category}</span></article>`).join('')}</div><button class="primary restart" data-action="start-review">復習をはじめる（${plan.length}問）</button>`}`;
    focusHeading();
  }
  function showRecords() {
    view='records';
    const records=Object.values(model.data.records);
    const labels=['初見でヒントなし正解','初見でヒントあり正解','初見で不正解'];
    app.innerHTML=`${menuButton()}<h2 tabindex="-1">学習記録</h2><p class="menu-intro">はじめて解いたときの記録です。<br>解き直しても、この結果は変わりません。</p>${notice()}<div class="record-summary">${labels.map(text=>`<div><strong>${records.filter(r=>learning.firstStatus(r.first)===text).length}</strong><span>${text}</span></div>`).join('')}</div><p class="quiet">${records.length} / 23 問 回答済み · Q01は集計対象外</p><div class="record-list">${questions.filter(q=>!q.practice).map(q=>{const r=model.data.records[q.id];return `<article><div><span class="eyebrow">${q.id} · ${q.category}</span><h3>${q.title}</h3></div><p>${r?learning.firstStatus(r.first):'未回答'}</p></article>`;}).join('')}</div>`;
    focusHeading();
  }
  function showResults() {
    view='results';
    let results=session.results;
    if(session.mode==='daily') {
      const set=model.data.daily[session.date];
      results=set.ids.filter(id=>set.answers[id]).map(id=>({id,...set.answers[id]}));
    }
    app.innerHTML=`<div class="result-icon" aria-hidden="true">✧</div><span class="eyebrow">${session.mode==='daily'?session.date:'SESSION COMPLETE'}</span><h2 tabindex="-1">${session.mode==='daily'?'今日の５問は完了':session.mode==='tutorial'?'３問、おつかれさまでした。':'練習、おつかれさまでした。'}</h2>${notice()}<div class="result-list">${results.map(r=>`<article><span class="eyebrow">${r.id}${r.originId?` · ${r.originId}の復習`:''}</span><h3>${byId[r.id].title}</h3><strong>${r.status}</strong>${r.id==='Q03'?`<p>${r.status==='自力で正解'?'ヒントなしで、２つの規則を見つけました。':'向きと穴の数を、別々に確かめました。'}</p>`:''}</article>`).join('')}</div>${session.mode==='tutorial'?'<p class="quiet">Q01は操作練習のため、集計していません。</p><button class="secondary restart" data-action="tutorial">最初からもう一度</button>':''}<button class="primary restart" data-action="menu">メニューへ</button><button class="secondary restart" data-action="practice">じっくり練習を続ける</button>`;
    if(session.mode==='tutorial')model.onboard();
    focusHeading();
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
    if(button.dataset.choice&&view==='question'&&!graded){
      selected=button.dataset.choice;
      app.querySelectorAll('[data-choice]').forEach(b=>{const active=b.dataset.choice===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);b.querySelector('.choice-state').textContent=active?'✓ 選択':'';});
      app.querySelector('[data-action="grade"]').disabled=false;return;
    }
    switch(button.dataset.action){
      case 'menu': showMenu();break;
      case 'tutorial': tutorial();break;
      case 'practice': showPractice();break;
      case 'category': {const category=learning.categories[Number(button.dataset.category)];start('practice',model.practice(category).map(questionId=>({questionId})),category);break;}
      case 'daily': startDaily(learning.jstDate());break;
      case 'review': showReview();break;
      case 'start-review': start('review',model.reviewPlan(),'苦手の復習');break;
      case 'records': showRecords();break;
      case 'hint': if(view==='question'&&!graded&&hintCount<current().hints.length){hintCount++;renderQuestion();app.querySelector('.hint-note').scrollIntoView({block:'nearest'});}break;
      case 'grade': {
        if(view!=='question'||!selected||graded)return;
        graded=true;reviewed=current().explanations.length===1;
        const q=current(), entry=session.entries[session.index];
        const attempt=model.record(q.id,selected,hintCount,{originId:entry.originId,dailyDate:session.mode==='daily'?session.date:undefined});
        if(!q.practice&&attempt)session.results.push({id:q.id,originId:entry.originId,...attempt});
        renderQuestion();app.querySelector('.explanation').scrollIntoView({block:'start'});break;
      }
      case 'prev': changeStep(-1);break;
      case 'step': changeStep(1);break;
      case 'replay': changeStep(0);break;
      case 'next': if(view==='question'&&graded&&reviewed){if(session.index<session.entries.length-1){session.index++;resetQuestion();}else showResults();}break;
    }
  });
  function startDaily(date) {
    const set=model.daily(date);
    model.activateDaily(date);
    start('daily',set.ids.filter(id=>!set.answers[id]).map(questionId=>({questionId})),'毎日５問',date);
  }
  if(!model.data.onboarded)tutorial();
  else if(model.data.activeDaily===learning.jstDate()&&model.data.daily[model.data.activeDaily])startDaily(model.data.activeDaily);
  else showMenu();
})();
