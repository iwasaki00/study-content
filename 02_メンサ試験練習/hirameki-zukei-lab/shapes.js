window.LabShapes = (() => {
  const arrowNames = { 0: '上', 90: '右', 180: '下', 270: '左' };
  const ringNames = { 0: '右', '-90': '上', '-180': '左' };
  function label(shape) {
    if (!shape) return '未確定の図形';
    return shape.kind === 'arrow' ? `${arrowNames[shape.direction]}向きの矢印${shape.count ? `、点${shape.count}つ` : ''}` : `${ringNames[shape.direction]}に切り欠き、穴${shape.count}つ`;
  }
  function svg(shape, extra = '') {
    if (!shape) return '<span class="unknown" aria-label="ここに入る図形">?</span>';
    const dots = Array.from({ length: shape.count }, (_, i) => {
      const x = 50 + (i - (shape.count - 1) / 2) * 13;
      return `<circle cx="${x}" cy="${shape.kind === 'arrow' ? 82 : 50}" r="${shape.kind === 'arrow' ? 4 : 3.7}"/>`;
    }).join('');
    const outer = shape.kind === 'arrow'
      ? '<path d="M50 66V20M32 38L50 20L68 38" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M76 35 A30 30 0 1 0 76 65" fill="none" stroke="currentColor" stroke-width="13" stroke-linecap="butt"/>';
    return `<svg class="shape ${extra}" viewBox="0 0 100 100" role="img" aria-label="${label(shape)}"><g class="outer"><g transform="rotate(${shape.direction} 50 ${shape.kind === 'arrow' ? 43 : 50})">${outer}</g></g><g class="inner" fill="currentColor">${dots}</g></svg>`;
  }
  return { svg, label };
})();
