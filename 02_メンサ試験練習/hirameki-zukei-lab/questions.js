/* 問題を追加するときは、この配列に同じ形式のデータを追加する。 */
window.LabQuestions = (() => {
  const arrow = (direction, count = 0) => ({ kind: 'arrow', direction, count });
  const ring = (direction, count) => ({ kind: 'ring', direction, count });
  return [
    {
      id: 'Q01', title: '次に来る矢印', prompt: '次に来る矢印はどれ？', practice: true,
      board: [arrow(0), arrow(90), arrow(180), null], columns: 4,
      choices: [{ id: 'a', shape: arrow(0) }, { id: 'b', shape: arrow(90) }, { id: 'c', shape: arrow(270) }, { id: 'd', shape: arrow(180) }],
      answerId: 'c', hints: [],
      explanations: [{ focus: 'outer', text: '時計回りに90°ずつ。回した矢印が、次の矢印と重なります。', demo: 'rotation' }]
    },
    {
      id: 'Q02', title: '矢印と点', prompt: '右下に入る図形はどれ？',
      board: [arrow(0, 1), arrow(90, 1), arrow(180, 1), arrow(0, 2), arrow(90, 2), arrow(180, 2), arrow(0, 3), arrow(90, 3), null], columns: 3,
      choices: [{ id: 'a', shape: arrow(180, 2) }, { id: 'b', shape: arrow(180, 3) }, { id: 'c', shape: arrow(90, 3) }, { id: 'd', shape: arrow(270, 3) }],
      answerId: 'b',
      hints: [{ focus: 'outer', text: '点はいったん置いて、矢印だけ見よう' }, { focus: 'bottom-inner', text: '今度は、一番下の行の点を数えよう' }],
      explanations: [
        { focus: 'outer', text: '横に進むと、矢印が90°ずつ時計回りに回ります。', demo: 'rotation' },
        { focus: 'inner', text: '下の段へ進むと点が１つ増えます。同じ行の点は同じ数です。', demo: 'counts' },
        { focus: 'combine', text: '右下では「下向き」と「点３つ」を合わせます。', demo: 'combine' }
      ]
    },
    {
      id: 'Q03', title: '切り欠きと穴', prompt: '右下に入る図形はどれ？',
      board: [ring(0, 3), ring(-90, 3), ring(-180, 3), ring(0, 2), ring(-90, 2), ring(-180, 2), ring(0, 1), ring(-90, 1), null], columns: 3,
      choices: [{ id: 'a', shape: ring(-180, 2) }, { id: 'b', shape: ring(-90, 1) }, { id: 'c', shape: ring(0, 2) }, { id: 'd', shape: ring(-180, 1) }],
      answerId: 'd',
      hints: [{ focus: 'outer', text: '輪の外側で変わるところを見よう' }, { focus: 'inner', text: '輪の内側で変わるところを見よう' }],
      explanations: [
        { focus: 'outer', text: '横に進むと、切り欠きは右 → 上 → 左へ。内側の穴は回りません。', demo: 'rotation' },
        { focus: 'inner', text: '穴は上の段から３ → ２ → １。同じ行では数が同じです。', demo: 'counts' },
        { focus: 'combine', text: '右下では「左の切り欠き」と「穴１つ」を合わせます。', demo: 'combine' }
      ]
    }
  ];
})();
