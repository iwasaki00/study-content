/* 解説の描画。進行・採点や保存は行わない。 */
window.LabExplanations = (() => {
  const { svg, setResult, rotateMarks } = window.LabShapes;
  const answer = q => q.choices.find(c => c.id === q.answerId).shape;
  const value = (q, index) => index === 'answer' ? answer(q) : q.board[index];
  const tile = (s, caption = '') => `<div class="demo-tile">${svg(s)}${caption ? `<span>${caption}</span>` : ''}</div>`;
  const turnTile=(s,t,direction)=>`<div class="demo transform-demo transform-${direction}"><div class="transform-stage">${svg(t,'target')}${svg(s,'motion-source whole-rotation')}</div>${tile(t,'回転後の静止画')}</div>`;
  function shiftTile(before,after){
    let source=svg(before).replace(/class="single-mark" data-cell="(\d+)"/g,(_,raw)=>`class="single-mark ${Number(raw)%3===2?'insight-wrap-old':'insight-shift-mark'}" data-cell="${raw}"`);
    const wrapped=before.cells.filter(i=>i%3===2).map(i=>{const y=22.5+Math.floor(i/3)*27.5;return before.mark==='square'?`<rect class="insight-wrap-new" x="15.5" y="${y-7}" width="14" height="14" rx="1" fill="currentColor"/>`:`<circle class="insight-wrap-new" cx="22.5" cy="${y}" r="7" fill="currentColor"/>`;}).join('');
    source=source.replace('</svg>',wrapped+'</svg>');
    return `<div class="demo insight-shift"><div class="demo-tile">${source}<span>右へ１マス・右端は左端へ</span></div>${tile(after,'移動後の静止画')}</div>`;
  }
  function render(q, explanation) {
    const correct = answer(q);
    if(explanation.demo==='three-intersection'){
      const start=explanation.row*4,a=q.board[start],b=q.board[start+1],c=q.board[start+2],ab=setResult(a,b,'intersection');
      return render({...q,board:explanation.part?[ab,c,null]:[a,b,null]},{demo:'overlay',row:0,operation:'intersection'});
    }
    if(explanation.demo==='component-turn')return render({...q,board:q.board.map(s=>s?{...s,kind:'flag',landmark:true}:null)},{...explanation,demo:'transform'});
    if(explanation.demo==='component-move'){
      const a=value(q,explanation.from),b=value(q,explanation.to),plain={kind:'flag',direction:0,mirror:false,paint:'outline',count:0};
      const frames=Array.from({length:3},(_,i)=>`<rect x="${2+i*60}" y="5" width="56" height="90" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>`).join('');
      return `<div class="insight-frame-motion"><svg class="shape" viewBox="0 0 180 100" role="img" aria-label="形と塗りを固定し、枠の位置だけを移す" style="--frame-dx:${(b.position-a.position)*60}px">${frames}<g class="insight-frame-glyph"><svg x="${a.position*60}" y="5" width="60" height="90">${svg(plain)}</svg></g></svg><p class="demo-caption">位置だけの比較。形・向き・塗りは固定表示。</p><div class="demo">${tile({...a,direction:0,mirror:false,paint:'outline'},'移動する前')}${tile({...b,direction:0,mirror:false,paint:'outline'},'移動したあと')}</div></div>`;
    }
    if(explanation.demo==='recipe'){
      const r=q.recipe,n=r.inputs||2,start=explanation.row*q.columns;
      const inputs=q.board.slice(start,start+n),prepared=inputs.map((s,i)=>i===1&&r.preRotate?rotateMarks(s,r.preRotate):s);
      const merged=prepared.reduce((a,b)=>setResult(a,b,r.operation));
      let rotated=r.rotation?rotateMarks(merged,r.rotation):merged;
      let result=r.shift?{...rotated,cells:rotated.cells.map(i=>Math.floor(i/3)*3+(i%3+1)%3).sort((a,b)=>a-b)}:rotated;
      if(r.keep)result={...result,cells:result.cells.filter(i=>i>=3&&i<=5)};
      if(explanation.animate&&explanation.stage==='pre')return turnTile(inputs[1],prepared[1],'cw');
      if(explanation.animate&&explanation.stage==='rotate')return turnTile(merged,rotated,'cw');
      if(explanation.animate&&explanation.stage==='shift')return shiftTile(rotated,result);
      if(explanation.animate&&r.keep&&explanation.stage==='post'){
        const source=svg(rotated).replace(/class="single-mark" data-cell="(\d+)"/g,(_,raw)=>`class="single-mark ${Number(raw)>=3&&Number(raw)<=5?'insight-retain':'insight-discard'}" data-cell="${raw}"`).replace('</svg>','<rect x="9" y="36.3" width="82" height="27.4" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 2"/></svg>');
        return `<div class="demo insight-filter"><div class="demo-tile">${source}<span>中央の段だけ残す</span></div>${tile(result,'条件を適用した静止画')}</div>`;
      }
      if(explanation.stage==='pre')return `<div class="demo recipe-demo">${tile(inputs[1],'２番目だけ')}<b>↻</b>${tile(prepared[1],'時計回り90°')}</div>`;
      if(explanation.stage==='rotate')return `<div class="demo recipe-demo">${tile(merged,'重ねた結果')}<b>↻</b>${tile(rotated,'時計回り90°')}</div>`;
      if(['post','shift'].includes(explanation.stage))return `<div class="demo recipe-demo">${tile(rotated,'変化する前')}<b>→</b>${tile(result,r.keep?'中央の段だけ':'右へ１マス')}</div>`;
      return `<div class="demo recipe-demo">${prepared.map((s,i)=>tile(s,`入力${i+1}`)).join('<b>＋</b>')}<b>＝</b>${tile(merged,'残る印')}</div>`;
    }
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
    if(explanation.demo==='component-mirror'){
      const s={...value(q,explanation.from),kind:'flag'},t={...value(q,explanation.to),kind:'flag'};
      return `<div class="demo transform-demo transform-mirror-x"><div class="transform-stage">${svg(t,'target')}${svg(s,'motion-source')}</div>${tile(t,'形だけを反転・枠はそのまま')}</div>`;
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
      const merged = setResult(q.board[6],q.board[7],q.operation||'union');
      const degrees=q.rotation||90;
      return `<div class="demo transform-demo transform-${degrees<0?'ccw':'cw'}"><div class="transform-stage">${svg(merged,'motion-source whole-rotation')}</div>${tile(rotateMarks(merged,degrees),`${degrees<0?'反時計回り':'時計回り'}90°の静止画`)}</div>`;
    }
    return `<div class="demo answer-demo">${tile(correct,'規則を合わせた図形')}</div>`;
  }
  return { render };
})();
