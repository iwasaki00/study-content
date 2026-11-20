/* 解説の描画。進行・採点や保存は行わない。 */
window.LabExplanations = (() => {
  const { svg, setResult, rotateMarks } = window.LabShapes;
  const answer = q => q.choices.find(c => c.id === q.answerId).shape;
  const value = (q, index) => index === 'answer' ? answer(q) : q.board[index];
  const tile = (s, caption = '') => `<div class="demo-tile">${svg(s)}${caption ? `<span>${caption}</span>` : ''}</div>`;
  function render(q, explanation) {
    const correct = answer(q);
    if (explanation.demo === 'rotation') {
      const source = q.practice ? q.board.slice(0,3) : q.board.slice(0,2);
      const target = q.practice ? q.board.slice(1,3).concat(correct) : q.board.slice(1,3);
      return `<div class="demo rotation-demo ${q.id === 'Q03' ? 'counterclockwise' : ''}">${source.map((s,i) => `<div class="rotation-pair"><div class="overlay">${svg(target[i], 'target')}${svg(s, 'moving')}</div><span>${q.id === 'Q03' ? '反時計回り' : '時計回り'}90°</span><div class="static-match">${svg(target[i])}<b>＝</b>${svg(target[i])}</div></div>`).join('')}</div><p class="demo-caption">回したあと ＝ 次の図形</p>`;
    }
    if (explanation.demo === 'counts') return `<div class="demo counts-demo">${[0,3,6].map((i,n) => tile(q.board[i], `${n+1}段目 · ${q.board[i].count}つ`)).join('<b>→</b>')}</div>`;
    if (explanation.demo === 'combine') return `<div class="demo combine-demo">${tile({...correct,count:0},q.id==='Q03'?'左の切り欠き':'下向き')}<b>＋</b><div class="only-inner">${svg(correct)}<span>${q.id==='Q03'?'穴１つ':'点３つ'}</span></div><b>＝</b>${tile(correct,'右下の図形')}</div>`;
    if (explanation.demo === 'transform') {
      const s = value(q,explanation.from), t = value(q,explanation.to);
      return `<div class="demo transform-demo transform-${explanation.transform} ${s.kind==='arrow'?'pivot-arrow':''}"><div class="transform-stage">${svg(t,'target')}${svg(s,'motion-source')}</div>${tile(t,'変化したあとの静止画')}</div>`;
    }
    if (explanation.demo === 'pair') return `<div class="demo pair-demo">${tile(value(q,explanation.from),'変化する前')}<b>→</b>${tile(value(q,explanation.to),'変化したあと')}</div>`;
    if (explanation.demo === 'strip') return `<div class="demo strip-demo">${explanation.samples.map((i,n) => tile(q.board[i],explanation.captions?.[n] || '')).join('<b>→</b>')}</div>`;
    if (explanation.demo === 'overlay') {
      const a = q.board[explanation.row*3], b = q.board[explanation.row*3+1];
      const result = setResult(a,b,explanation.operation);
      const common = a.cells.filter(i => b.cells.includes(i));
      return `<div class="overlap-demo operation-${explanation.operation}"><div class="overlap-stage" aria-label="２つの図を重ねて印を残す動き">${svg(a,'layer layer-a',common)}${svg(b,'layer layer-b',common)}${svg(result,'layer layer-result')}</div><p class="demo-caption">${explanation.operation==='xor'?'重なった印だけが消える':explanation.operation==='intersection'?'共通の印だけが残る':'片方だけの印も、共通の印も残る'}</p><div class="demo overlap-static">${tile(a,'左の図')}<b>＋</b>${tile(b,'中央の図')}<b>＝</b>${tile(result,'重ねた結果')}</div></div>`;
    }
    if (explanation.demo === 'set-rotation') {
      const merged = setResult(q.board[6],q.board[7],'union');
      return `<div class="demo transform-demo transform-cw"><div class="transform-stage">${svg(merged,'motion-source whole-rotation')}</div>${tile(rotateMarks(merged),'90°回した静止画')}</div>`;
    }
    return `<div class="demo answer-demo">${tile(correct,'規則を合わせた図形')}</div>`;
  }
  return { render };
})();
