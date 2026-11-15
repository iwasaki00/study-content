(() => {
  const questions = window.LabQuestions;
  const { svg, label } = window.LabShapes;
  const app = document.querySelector('#app');
  let index = 0, selected = null, graded = false, hintCount = 0, step = 0, reviewed = false;
  let results = [];
  const current = () => questions[index];
  const answer = q => q.choices.find(c => c.id === q.answerId).shape;

  function feedback(q, chosen) {
    if (chosen.id === q.answerId) return '正解！ 見つけた規則を確かめましょう。';
    if (q.practice) return '矢印が回る向きを、解説で確かめましょう。';
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

  function board(q, focus = '', reveal = false) {
    return `<div class="board ${q.columns === 4 ? 'sequence' : ''} focus-${focus}" aria-label="問題の盤面">${q.board.map((shape, i) => `<div class="cell ${i >= 6 ? 'bottom-row' : ''} ${!shape ? 'missing' : ''}">${svg(shape || (reveal ? answer(q) : null))}</div>`).join('')}</div>`;
  }

  function demo(q, explanation) {
    const correct = answer(q);
    if (explanation.demo === 'rotation') {
      const source = q.practice ? q.board.slice(0, 3) : q.board.slice(0, 2);
      const target = q.practice ? q.board.slice(1, 3).concat(correct) : q.board.slice(1, 3);
      return `<div class="demo rotation-demo ${q.id === 'Q03' ? 'counterclockwise' : ''}">${source.map((s, i) => `<div class="rotation-pair"><div class="overlay">${svg(target[i], 'target')}${svg(s, 'moving')}</div><span>${q.id === 'Q03' ? '反時計回り' : '時計回り'}90°</span><div class="static-match">${svg(target[i])}<b>＝</b>${svg(target[i])}</div></div>`).join('')}</div><p class="demo-caption">回したあと ＝ 次の図形</p>`;
    }
    if (explanation.demo === 'counts') {
      return `<div class="demo counts-demo">${[0, 3, 6].map((i, n) => `<div>${svg(q.board[i])}<span>${n + 1}段目 · ${q.board[i].count}つ</span></div>`).join('<b>→</b>')}</div>`;
    }
    return `<div class="demo combine-demo"><div>${svg({ ...correct, count: 0 })}<span>${q.id === 'Q03' ? '左の切り欠き' : '下向き'}</span></div><b>＋</b><div class="only-inner">${svg(correct)}<span>${q.id === 'Q03' ? '穴１つ' : '点３つ'}</span></div><b>＝</b><div>${svg(correct)}<span>右下の図形</span></div></div>`;
  }

  function render() {
    const q = current();
    const explanation = q.explanations[step];
    const focus = graded ? explanation.focus : hintCount ? q.hints[hintCount - 1].focus : '';
    app.innerHTML = `<div class="progress"><span>進捗 <strong>${index + 1} / ${questions.length}</strong></span><span>${q.practice ? 'まずはウォームアップ' : '規則を見つけよう'}</span></div>
      <div class="progress-track" aria-hidden="true"><span style="width:${(index + 1) / questions.length * 100}%"></span></div>
      <div class="question-heading"><span class="eyebrow">${q.id} / ${q.title}</span><h2 id="question-title" tabindex="-1">${q.prompt}</h2></div>
      ${board(q, focus, graded && explanation.focus === 'combine')}
      ${graded ? `<p class="board-note">${explanation.text}</p>` : ''}
      ${!graded && hintCount ? `<p class="hint-note" role="status">ヒント ${hintCount}：${q.hints[hintCount - 1].text}</p>` : ''}
      <fieldset class="choices" ${graded ? 'disabled' : ''}><legend>図形を１つ選んでください</legend>${q.choices.map((c, i) => `<button type="button" class="choice ${selected === c.id ? 'selected' : ''} ${graded && c.id === q.answerId ? 'correct' : ''}" data-choice="${c.id}" aria-label="選択肢${i + 1}、${label(c.shape)}" aria-pressed="${selected === c.id}"><span class="choice-number">${i + 1}</span>${svg(c.shape)}<span class="choice-state">${graded && c.id === q.answerId ? '✓ 正解' : selected === c.id ? '✓ 選択' : ''}</span></button>`).join('')}</fieldset>
      ${graded ? `<section class="explanation" aria-label="解説"><p class="feedback" role="status">${feedback(q, q.choices.find(c => c.id === selected))}</p><div class="explanation-heading"><h3>見るポイント</h3><span>${step + 1} / ${q.explanations.length}</span></div><p class="explanation-text" aria-live="polite">${explanation.text}</p><div class="focus-${explanation.focus}">${demo(q, explanation)}</div><nav class="explanation-controls" aria-label="解説の操作"><button data-action="prev" ${step === 0 ? 'disabled' : ''}>前へ</button><button data-action="replay">もう一度見る</button><button data-action="step" ${step === q.explanations.length - 1 ? 'disabled' : ''}>次へ</button></nav></section><button class="primary next-question" data-action="next" ${!reviewed ? 'disabled' : ''}>${index === questions.length - 1 ? '結果を見る' : '次の問題'} →</button>${!reviewed ? '<p class="quiet">解説の「次へ」で、最後のポイントまで確認しよう。</p>' : ''}`
      : `<div class="actions"><button class="primary" data-action="grade" ${!selected ? 'disabled' : ''}>答え合わせ</button>${q.hints.length ? `<button class="secondary" data-action="hint" ${hintCount === q.hints.length ? 'disabled' : ''}>${hintCount === q.hints.length ? 'ヒント表示済み' : `ヒント ${hintCount + 1} / ${q.hints.length}`}</button>` : ''}</div><p class="quiet">${q.practice ? '練習問題です。結果の集計には含みません。' : '選んだあと「答え合わせ」で確定します。'}</p>`}`;
  }

  function resetQuestion() {
    selected = null; graded = false; hintCount = 0; step = 0; reviewed = false;
    render(); document.querySelector('#question-title').focus(); window.scrollTo(0, 0);
  }

  function showResults() {
    app.innerHTML = `<div class="result-icon" aria-hidden="true">✧</div><span class="eyebrow">SESSION COMPLETE</span><h2 tabindex="-1">３問、おつかれさまでした。</h2><p class="result-intro">向きと数を、分けて見る練習ができました。</p><div class="result-list">${results.map(r => `<article><span class="eyebrow">${r.id}</span><h3>${r.title}</h3><strong>${r.status}</strong>${r.id === 'Q03' ? `<p>${r.status === '自力で正解' ? 'ヒントなしで、２つの規則を見つけました。' : '向きと穴の数を、別々に確かめました。'}</p>` : ''}</article>`).join('')}</div><p class="quiet">Q01は練習のため集計していません。</p><button class="primary restart" data-action="restart">最初からもう一度</button>`;
    app.querySelector('h2').focus(); window.scrollTo(0, 0);
  }

  app.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.choice && !graded) {
      selected = button.dataset.choice;
      app.querySelectorAll('[data-choice]').forEach(b => {
        const active = b.dataset.choice === selected;
        b.classList.toggle('selected', active); b.setAttribute('aria-pressed', active);
        b.querySelector('.choice-state').textContent = active ? '✓ 選択' : '';
      });
      app.querySelector('[data-action="grade"]').disabled = false;
      return;
    }
    switch (button.dataset.action) {
      case 'hint': if (!graded && hintCount < current().hints.length) { hintCount++; render(); app.querySelector('.hint-note').scrollIntoView({ block: 'nearest' }); } break;
      case 'grade':
        if (!selected || graded) return;
        graded = true; reviewed = current().explanations.length === 1;
        if (!current().practice) results.push({ id: current().id, title: current().title, status: selected !== current().answerId ? '解説で確認' : hintCount ? 'ヒントを使って正解' : '自力で正解' });
        render(); app.querySelector('.explanation').scrollIntoView({ block: 'start' }); break;
      case 'prev': if (graded && step > 0) { step--; render(); } break;
      case 'step': if (graded && step < current().explanations.length - 1) { step++; if (step === current().explanations.length - 1) reviewed = true; render(); } break;
      case 'replay': if (graded) render(); break;
      case 'next': if (graded && reviewed) { if (index < questions.length - 1) { index++; resetQuestion(); } else showResults(); } break;
      case 'restart': index = 0; results = []; resetQuestion(); break;
    }
  });
  render();
})();
