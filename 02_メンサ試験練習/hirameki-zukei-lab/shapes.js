window.LabShapes = (() => {
  const arrowNames = { 0: '上', 90: '右', 180: '下', 270: '左' };
  const ringNames = { 0: '右', '-90': '上', '-180': '左' };
  const paintNames = { outline: '白', striped: 'しま模様', solid: '全面の塗り' };
  let serial = 0;
  function label(s) {
    if (!s) return '未確定の図形';
    if(s.kind==='dual')return `Ａの旗は${s.direction}度、Ｂの旗は${s.secondDirection}度`;
    if(s.kind==='agents')return `丸は左から${s.position+1}番目、四角は左から${s.secondPosition+1}番目`;
    if (s.kind === 'arrow') return `${arrowNames[s.direction]}向きの矢印${s.count ? `、点${s.count}つ` : ''}`;
    if (s.kind === 'ring') return `${ringNames[s.direction]}に切り欠き、穴${s.count}つ`;
    if (s.kind === 'flag') return `基準から時計回り${s.direction}度${s.mirror ? '、鏡の形' : ''}の旗、${paintNames[s.paint]}${s.count ? `、小さな四角${s.count}つ` : ''}`;
    if (s.kind === 'moving-flag') return `${s.slots}つの枠の左から${s.position+1}番目、${s.mirror?'鏡の向き':'元の向き'}の小さな形、${s.direction}度、${paintNames[s.paint]}`;
    if (s.kind === 'track') return `${s.slots}マスの左から${s.position + 1}番目に印${s.count ? `、下の点${s.count}つ` : ''}`;
    if (s.kind === 'beads') return `印${s.count}個`;
    return `${s.mark === 'square' ? '四角' : '丸'}の印、位置${s.cells.map(i => i + 1).join('・') || 'なし'}（左上から行の順）`;
  }
  function setResult(a, b, operation) {
    const all = [...new Set([...a.cells, ...b.cells])];
    return { ...a, cells: all.filter(i => operation === 'union' || (operation === 'intersection' ? a.cells.includes(i) && b.cells.includes(i) : a.cells.includes(i) !== b.cells.includes(i))).sort((x,y) => x-y) };
  }
  function rotateMarks(s,degrees=90) {
    let cells=[...s.cells];
    for(let turns=0;turns<((degrees/90)%4+4)%4;turns++)cells=cells.map(i=>(i%3)*3+2-Math.floor(i/3));
    return {...s,cells:cells.sort((a,b)=>a-b)};
  }
  function svg(s, extra = '', common = []) {
    if (!s) return '<span class="unknown" aria-label="ここに入る図形">?</span>';
    let content = '';
    if(s.kind==='dual'){
      content=[s.direction,s.secondDirection].map((direction,i)=>`<g class="part-${i?'b':'a'}"><svg x="${i*50}" y="20" width="50" height="65" viewBox="0 0 100 100">${svg({kind:'flag',direction,mirror:false,paint:'outline',count:0})}</svg><text x="${25+i*50}" y="17" text-anchor="middle" font-size="12">${i?'B':'A'}</text></g>`).join('');
    }else if(s.kind==='agents'){
      const x=i=>12+i*19;
      content=`<path d="M12 50H88" stroke="#a6b5a3"/><g class="part-a"><circle cx="${x(s.position)}" cy="38" r="7" fill="currentColor"/></g><g class="part-b"><rect x="${x(s.secondPosition)-6}" y="58" width="12" height="12" fill="currentColor"/></g>${Array.from({length:5},(_,i)=>`<path d="M${x(i)} 46v8" stroke="#a6b5a3"/>`).join('')}`;
    }else if (s.kind === 'arrow' || s.kind === 'ring') {
      const dots = Array.from({ length: s.count }, (_, i) => `<circle cx="${50 + (i - (s.count - 1) / 2) * 13}" cy="${s.kind === 'arrow' ? 82 : 50}" r="${s.kind === 'arrow' ? 4 : 3.7}"/>`).join('');
      const outer = s.kind === 'arrow'
        ? '<path d="M50 66V20M32 38L50 20L68 38" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<path d="M76 35 A30 30 0 1 0 76 65" fill="none" stroke="currentColor" stroke-width="13"/>';
      content = `<g class="outer"><g transform="rotate(${s.direction} 50 ${s.kind === 'arrow' ? 43 : 50})">${outer}</g></g><g class="inner" fill="currentColor">${dots}</g>`;
    } else if (s.kind === 'flag' || s.kind === 'moving-flag') {
      const glyph = 'M25 20H78L60 42H43V63H57V80H25Z';
      const paintId = `paint-${++serial}`;
      const paint = s.paint === 'solid' ? `<path d="${glyph}" fill="currentColor"/>` : s.paint === 'striped' ? `<defs><clipPath id="${paintId}"><path d="${glyph}"/></clipPath></defs><g clip-path="url(#${paintId})" stroke="currentColor" stroke-width="4">${Array.from({length:12},(_,i) => `<path d="M${i*10-70} 85L${i*10+15} 0"/>`).join('')}</g>` : '';
      content = `<g class="outer"><g transform="rotate(${s.direction} 50 50) translate(50 50) scale(${s.mirror ? -1 : 1} 1) translate(-50 -50)"><g class="paint">${paint}</g><path class="outline" d="${glyph}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/></g></g><g class="inner" fill="currentColor">${Array.from({length:s.count},(_,i) => `<rect x="${47+(i-(s.count-1)/2)*13}" y="87" width="6" height="6"/>`).join('')}</g>`;
      if(s.kind==='moving-flag'){
        const frames=Array.from({length:3},(_,i)=>`<rect class="${i===s.position?'active-slot':''}" x="${3+i*32}" y="23" width="30" height="54" rx="2"/>`).join('');
        content=`<g class="grid" fill="none" stroke="#a6b5a3" stroke-width="1.4">${frames}</g><g transform="translate(${18+s.position*32} 50) scale(.48) translate(-50 -50)">${content}</g>`;
      }
    } else if (s.kind === 'track') {
      const x = i => 12 + i * 76 / (s.slots - 1);
      content = `<g class="grid" stroke="#8d9f91" fill="none" stroke-width="1.5"><path d="M12 45H88"/>${Array.from({length:s.slots},(_,i) => `<circle cx="${x(i)}" cy="45" r="3"/>`).join('')}</g><g class="outer"><path d="M${x(s.position)} 33l9 12-9 12-9-12z" fill="currentColor"/></g><g class="inner" fill="currentColor">${Array.from({length:s.count},(_,i) => `<circle cx="${50+(i-(s.count-1)/2)*13}" cy="82" r="4"/>`).join('')}</g>`;
    } else if (s.kind === 'beads') {
      content = `<g class="inner" fill="currentColor">${Array.from({length:s.count},(_,i) => `<circle cx="${23+i%4*18}" cy="${23+Math.floor(i/4)*18}" r="5.2"/>`).join('')}</g>`;
    } else if (s.kind === 'marks') {
      content = `<g class="grid" stroke="#b2bfb1" stroke-width="1" fill="none"><rect x="9" y="9" width="82" height="82" rx="3"/><path d="M36.3 9V91M63.7 9V91M9 36.3H91M9 63.7H91"/></g><g class="inner marks" fill="currentColor">${s.cells.map(i => {
        const x = 22.5 + (i%3)*27.5, y = 22.5 + Math.floor(i/3)*27.5;
        const attr = `class="${common.includes(i) ? 'common-mark' : 'single-mark'}" data-cell="${i}"`;
        return s.mark === 'square' ? `<rect ${attr} x="${x-7}" y="${y-7}" width="14" height="14" rx="1"/>` : `<circle ${attr} cx="${x}" cy="${y}" r="7"/>`;
      }).join('')}</g>`;
    }
    return `<svg class="shape kind-${s.kind} ${extra}" viewBox="0 0 100 100" role="img" aria-label="${label(s)}">${content}</svg>`;
  }
  return { svg, label, setResult, rotateMarks };
})();
