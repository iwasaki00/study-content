/* 固定のオリジナル問題。実行時の問題自動生成・選択肢シャッフルはしない。 */
(() => {
  const flag = (direction = 0, mirror = false, paint = 'outline', count = 0) => ({ kind: 'flag', direction, mirror, paint, count });
  const track = (position, slots = 5, count = 0) => ({ kind: 'track', position, slots, count });
  const beads = count => ({ kind: 'beads', count });
  const marks = (cells, mark = 'circle') => ({ kind: 'marks', cells, mark });
  const choices = (shapes, messages) => shapes.map((shape, i) => ({ id: 'abcd'[i], shape, feedback: messages[i] || '' }));
  const hint = (text, focus = 'outer') => ({ text, focus });
  const step = (text, demo, options = {}) => ({ text, demo, focus: 'outer', ...options });
  const sequence = (id, summary, family, board, options, correct, messages, hints, explanations, difficulty = 1) => ({
    id, title: '並んだ図形', ruleSummary: summary, category: '回転・反転', ruleFamily: family, difficulty,
    prompt: '次に来る図形はどれ？', layout: 'sequence', columns: 3, board: [...board, null],
    choices: choices(options, messages), answerId: 'abcd'[correct], hints, explanations
  });
  const lookShape = hint('角と短い出っ張りの位置を見よう');
  const compareShape = hint('１→２、２→３の順で、動き方を比べよう');
  const transformStep = (text, from, to, transform) => step(text, 'transform', { from, to, transform });
  const fixed = [
    sequence('Q04', '90°反時計回り', 'rotate-ccw-90',
      [flag(0), flag(270), flag(180), flag(90)],
      [flag(180), flag(0), flag(0, true), flag(90)], 1,
      ['右回りに戻してしまいました。今度も左回りに90°です。', '', '反転ではなく、形全体を左回りに90°回します。', '向きを変えずに残しています。左回りに90°回します。'],
      [lookShape, compareShape],
      [transformStep('１→２は、反時計回りに90°。出っ張りも一緒に回ります。', 0, 1, 'ccw'), transformStep('同じ動きを続けます。最後も反時計回りに90°回します。', 3, 'answer', 'ccw')]),
    sequence('Q05', '180°回転', 'rotate-180',
      [flag(0), flag(180), flag(0), flag(180)],
      [flag(270), flag(180, true), flag(0), flag(90)], 2,
      ['90°では足りません。出っ張りまで反対側へ回します。', '鏡に映す変化ではなく、形全体の半回転です。', '', '90°では足りません。形全体を半回転させます。'],
      [lookShape, compareShape],
      [transformStep('１→２は180°の半回転。角も出っ張りも反対側へ。', 0, 1, 'half'), transformStep('２→３も半回転です。最後の図形も180°回します。', 3, 'answer', 'half')]),
    sequence('Q06', '左右反転', 'mirror-horizontal',
      [flag(), flag(0, true), flag(), flag(0, true)],
      [flag(180), flag(), flag(180, true), flag(0, true)], 1,
      ['上下を反転しています。今回は左右だけを入れ替えます。', '', '半回転だと上下も変わります。上にある部分は上に残ります。', '最後の形をそのまま残しています。左右を入れ替えます。'],
      [lookShape, hint('上にある部分を追いながら、１→２→３を比べよう')],
      [transformStep('上と下はそのまま。左右が鏡に映したように入れ替わります。', 0, 1, 'mirror-x'), transformStep('毎回、左右だけを反転します。もう一度映すと元の形に戻ります。', 3, 'answer', 'mirror-x')]),
    sequence('Q07', '上下反転', 'mirror-vertical',
      [flag(), flag(180, true), flag(), flag(180, true)],
      [flag(), flag(0, true), flag(180), flag(180, true)], 0,
      ['', '半回転だと左右も変わります。左右の位置はそのままです。', '左右を反転しています。今回は上下だけが入れ替わります。', '最後の形をそのまま残しています。上下を反転します。'],
      [lookShape, hint('左にある部分を追いながら、１→２→３を比べよう')],
      [transformStep('左と右はそのまま。上下が鏡に映したように入れ替わります。', 0, 1, 'mirror-y'), transformStep('毎回、上下だけを反転します。最後も同じ動きです。', 3, 'answer', 'mirror-y')]),
    sequence('Q08', '回転と反転が交互', 'alternate-rotate-mirror',
      [flag(), flag(90), flag(270, true), flag(0, true), flag(), flag(90)],
      [flag(180), flag(270), flag(270, true), flag(90, true)], 2,
      ['続けて回してしまいました。次は左右を反転する番です。', '反転ではなく回転になっています。上下の高さを保って左右を映します。', '', '上下を映しています。今回は左右を映す番です。'],
      [lookShape, hint('１→２と３→４、２→３と４→５をそれぞれ比べよう')],
      [transformStep('１→２、３→４は時計回りに90°回転です。', 0, 1, 'cw'), transformStep('２→３、４→５は左右反転。２種類の変化が交互です。', 1, 2, 'mirror-x'), transformStep('５→６は回転でした。次は左右反転です。', 5, 'answer', 'mirror-x')], 3),
    sequence('Q09', '一定方向への移動', 'move-linear',
      [track(0, 7), track(1, 7), track(2, 7), track(3, 7)],
      [track(2, 7), track(5, 7), track(3, 7), track(4, 7)], 3,
      ['戻るのではなく、毎回右へ１マス進みます。', '２マス進めています。動く幅は１マスです。', '止まらずに、同じ向きへ１マス進みます。', ''],
      [hint('線の上の印の位置を見よう'), hint('１→２→３の順で、何マス動くか比べよう')],
      [step('印は毎回、右へ１マスずつ進みます。', 'pair', { from: 0, to: 1 }), step('端まではまだ余裕があります。最後からも右へ１マスです。', 'pair', { from: 3, to: 'answer' })]),
    sequence('Q10', '端から反対側へ戻る移動', 'move-wrap',
      [track(2, 4), track(3, 4), track(0, 4), track(1, 4), track(2, 4)],
      [track(1, 4), track(3, 4), track(0, 4), track(2, 4)], 1,
      ['反対向きには戻りません。右へ１マスずつ進みます。', '', '端に着く前に戻っています。右端の次が左端です。', '止まらずに、右へ１マス進みます。'],
      [hint('印と、左右の端の位置を見よう'), hint('２→３で端を越えるときの動きも確かめよう')],
      [step('右へ１マス。右端の次は、左端に戻ります。', 'pair', { from: 1, to: 2 }), step('その後も右へ１マスずつ。最後の印の１マス右です。', 'pair', { from: 4, to: 'answer' })], 2),
    sequence('Q11', '交互に左右へ移動', 'move-alternate',
      [track(1), track(3), track(1), track(3), track(1)],
      [track(3), track(0), track(2), track(4)], 0,
      ['', '右と左を交互に動きます。次は右へ２マスです。', '動く幅は１マスではなく２マスです。', '動く幅は３マスではなく２マスです。'],
      [hint('印の位置だけを見よう'), hint('１→２、２→３、３→４の移動方向を比べよう')],
      [step('右へ２マス、次は左へ２マス。２つの位置を行き来します。', 'strip', { samples: [0, 1, 2] }), step('右、左、右、左と動いたので、次は右へ２マスです。', 'pair', { from: 4, to: 'answer' })], 2),
    sequence('Q12', '一定数ずつ増加', 'count-plus-two',
      [beads(1), beads(3), beads(5), beads(7)],
      [beads(8), beads(10), beads(9), beads(5)], 2,
      ['１つではなく、毎回２つずつ増えます。', '３つではなく、毎回２つずつ増えます。', '', '減るのではなく、２つずつ増えます。'],
      [hint('小さな印の数を見よう', 'inner'), hint('１→２、２→３で増えた数を比べよう', 'inner')],
      [step('印の数は１、３、５、７。毎回２つ増えます。', 'strip', { samples: [0, 1, 2, 3], focus: 'inner', captions: ['１つ', '＋２', '＋２', '＋２'] }), step('最後の７つに２つ足すと９つです。', 'pair', { from: 3, to: 'answer', focus: 'inner' })]),
    sequence('Q13', '一定数ずつ減少', 'count-minus-two',
      [beads(9), beads(7), beads(5), beads(3)],
      [beads(0), beads(2), beads(5), beads(1)], 3,
      ['減らす数は３つではなく２つです。', '減らす数は１つではなく２つです。', '増えるのではなく、２つずつ減ります。', ''],
      [hint('小さな印の数を見よう', 'inner'), hint('１→２、２→３で減った数を比べよう', 'inner')],
      [step('印の数は９、７、５、３。毎回２つ減ります。', 'strip', { samples: [0, 1, 2, 3], focus: 'inner', captions: ['９つ', '−２', '−２', '−２'] }), step('最後の３つから２つ引くと１つです。', 'pair', { from: 3, to: 'answer', focus: 'inner' })]),
    sequence('Q14', '増分が１ずつ大きくなる', 'count-growing-difference',
      [beads(1), beads(2), beads(4), beads(7), beads(11)],
      [beads(15), beads(16), beads(12), beads(14)], 1,
      ['前回の＋４を繰り返しています。増える幅も１つ増やします。', '', '毎回＋１ではありません。増えた数も比べます。', '＋３は前の変化です。次は＋５になります。'],
      [hint('印の数と、増えた分を見よう', 'inner'), hint('１→２、２→３、３→４、４→５で増えた数を並べよう', 'inner')],
      [step('数は１、２、４、７、11。増えた数は＋１、＋２、＋３、＋４です。', 'strip', { samples: [0, 1, 2, 3, 4], focus: 'inner', captions: ['１', '＋１', '＋２', '＋３', '＋４'] }), step('増える幅が１ずつ大きくなるので、次は＋５。11＋５で16です。', 'pair', { from: 4, to: 'answer', focus: 'inner' })], 3)
  ];
  fixed.forEach(q => { if (Number(q.id.slice(1)) >= 9) q.category = '移動・個数'; });

  function overlayQuestion(id, operation, mark, rows, options, correct, difficulty = 2, rotate = false) {
    const words = { union: 'どちらかにある印を残す', intersection: '両方にある印だけ残す', xor: '重なった印を消す' };
    const messages = operation === 'union'
      ? ['両方にある印だけでなく、片方だけの印も残します。', '重なった印も消さずに残します。', '図にない位置の印は増やしません。']
      : operation === 'intersection'
        ? ['片方だけにある印も残しています。共通の位置だけを残します。', '共通の印を消しています。今回は共通の印を残します。', '片方の図だけを見ず、同じ位置を照らし合わせます。']
        : ['重なった印も残しています。共通の印は消します。', '共通の印だけ残しています。今回はその逆です。', '片方の図だけを残しています。両方の印を比べます。'];
    let wrong = 0;
    const q = {
      id, title: '重なる印', ruleSummary: rotate ? '重ね合わせ＋回転' : words[operation], category: rotate ? '複数ルール' : '重ね合わせ',
      ruleFamily: rotate ? 'union-then-rotate' : `overlay-${operation}`, difficulty,
      prompt: '右下に入る図形はどれ？', columns: 3, layout: 'matrix', operation,
      board: rows.map(c => c === null ? null : marks(c, mark)),
      choices: options.map((c, i) => ({ id: 'abcd'[i], shape: marks(c, mark), feedback: i === correct ? '' : messages[wrong++] })), answerId: 'abcd'[correct],
      hints: [hint('同じ位置にある印と、片方だけの印を見よう', 'marks'), hint(rotate ? '上の２行で、重ねたあとの向きも比べよう' : '上の行から、左と中央を重ねたとき右に何が残るか比べよう', 'example')],
      explanations: [step(`同じ行の左と中央を重ねます。${words[operation]}規則です。`, 'overlay', { row: 0, operation, focus: 'marks' }), step(`一番下の行も、${words[operation]}とこうなります。`, 'overlay', { row: 2, operation, focus: 'marks' })]
    };
    if (rotate) {
      q.explanations = [step('まず、どちらかにある印を残して重ねます。', 'overlay', { row: 2, operation, focus: 'marks' }), step('次に、重ねた図を時計回りに90°回します。上の２行も同じ順番です。', 'set-rotation', { focus: 'marks' }), step('「重ねる → 回す」の順で、右下の図形が決まります。', 'answer', { focus: 'combine' })];
      const wrongFeedback = ['重ね方は合っています。重ねたあと、時計回りに90°回します。', '回す向きは合っています。重なった印も消さずに残します。', '共通部分だけでなく、片方にしかない印も残して回します。'];
      wrong = 0; q.choices.forEach((c, i) => { if (i !== correct) c.feedback = wrongFeedback[wrong++]; });
    } else q.explanations.push(step('上の２行と同じ残し方で、右下を埋めます。', 'answer', { focus: 'combine' }));
    return q;
  }
  fixed.push(
    overlayQuestion('Q15', 'union', 'circle', [[0,4],[4,8],[0,4,8], [1,3],[3,7],[1,3,7], [0,2,4],[2,6],null], [[2],[0,4,6],[0,2,4,6],[0,2,4,6,8]], 2),
    overlayQuestion('Q16', 'union', 'square', [[1,4,7],[0,4],[0,1,4,7], [2,5],[5,6],[2,5,6], [1,6],[3,6,8],null], [[1,3,6,8],[6],[1,3,8],[0,1,3,6,8]], 0),
    overlayQuestion('Q17', 'intersection', 'circle', [[0,2,4],[2,4,8],[2,4], [1,3,7],[0,3,7],[3,7], [0,4,6],[4,6,8],null], [[0,4,6,8],[4,6],[0,8],[0,4,6]], 1),
    overlayQuestion('Q18', 'intersection', 'square', [[0,1,5],[1,5,7],[1,5], [2,4,8],[0,2,4],[2,4], [1,3,8],[3,7,8],null], [[1,3,7,8],[1,7],[1,3,8],[3,8]], 3),
    overlayQuestion('Q19', 'xor', 'circle', [[0,4],[4,8],[0,8], [1,3,7],[3,6],[1,6,7], [0,2,4],[2,4,8],null], [[0,2,4,8],[2,4],[0,8],[0,2,4]], 2),
    overlayQuestion('Q20', 'xor', 'square', [[1,4,6],[1,7],[4,6,7], [0,5],[2,5,8],[0,2,8], [1,3,8],[3,6,8],null], [[1,6],[1,3,6,8],[3,8],[1,3,8]], 0, 3)
  );
  fixed.push({
    id: 'Q21', title: '印と点', ruleSummary: '移動＋個数', category: '複数ルール', ruleFamily: 'independent-position-count', difficulty: 2,
    prompt: '右下に入る図形はどれ？', columns: 3, layout: 'matrix',
    board: [track(0,3,1),track(1,3,1),track(2,3,1), track(0,3,2),track(1,3,2),track(2,3,2), track(0,3,3),track(1,3,3),null],
    choices: choices([track(2,3,2),track(1,3,3),track(2,3,3),track(0,3,2)], ['印の位置は合っています。下の行の点は３つです。','点３つは合っています。印は右へ１マス進みます。','','位置と数を別々に見ましょう。印は右端、点は３つです。']), answerId: 'c',
    hints: [hint('線の上の印の位置を見よう'), hint('横は印の位置、縦は下に並ぶ点の数を比べよう','inner')],
    explanations: [step('横に進むと、線の上の印が右へ１マス動きます。','strip',{samples:[0,1,2]}),step('下の段へ進むと、下の点が１つ増えます。同じ行は同じ数です。','strip',{samples:[0,3,6],focus:'inner'}),step('右下では「右端の印」と「点３つ」を合わせます。','answer',{focus:'combine'})]
  }, {
    id: 'Q22', title: '旗と小さな四角', ruleSummary: '向き＋個数（変化の軸を交換）', category: '複数ルール', ruleFamily: 'independent-orientation-count', difficulty: 2,
    prompt: '右下に入る図形はどれ？', columns: 3, layout: 'matrix',
    board: [flag(0,false,'outline',3),flag(0,false,'outline',2),flag(0,false,'outline',1), flag(270,false,'outline',3),flag(270,false,'outline',2),flag(270,false,'outline',1), flag(180,false,'outline',3),flag(180,false,'outline',2),null],
    choices: choices([flag(180,false,'outline',2),flag(180,false,'outline',1),flag(90,false,'outline',1),flag(0,false,'outline',2)], ['旗の向きは合っています。右の列の四角は１つです。','','四角１つは合っています。下へ進むと旗は反時計回りに90°です。','向きと数を別々に見ましょう。旗は半回転の向き、四角は１つです。']), answerId: 'b',
    hints: [hint('旗の向きだけを見よう'),hint('縦に旗の向き、横に小さな四角の数を比べよう','inner')],
    explanations: [step('下へ進むと、旗が反時計回りに90°ずつ回ります。小さな四角は回りません。','transform',{from:0,to:3,transform:'ccw'}),step('横に進むと、小さな四角が３→２→１と減ります。同じ列は同じ数です。','strip',{samples:[0,1,2],focus:'inner'}),step('右下では「半回転した旗」と「四角１つ」を合わせます。','answer',{focus:'combine'})]
  }, {
    id: 'Q23', title: '形と塗り', ruleSummary: '反転＋塗りの変化', category: '複数ルール', ruleFamily: 'independent-mirror-paint', difficulty: 3,
    prompt: '右下に入る図形はどれ？', columns: 3, layout: 'matrix',
    board: [flag(),flag(0,true),flag(), flag(0,false,'striped'),flag(0,true,'striped'),flag(0,false,'striped'), flag(0,false,'solid'),flag(0,true,'solid'),null],
    choices: choices([flag(),flag(0,true,'solid'),flag(0,true),flag(0,false,'solid')], ['形の向きは合っています。下の行は全面を塗ります。','全面の塗りは合っています。左右をもう一度反転します。','向きと塗りを別々に見ましょう。元の向きで、全面の塗りです。','']), answerId: 'd',
    hints: [hint('形の角と出っ張りの位置を見よう'),hint('横に形、縦に内側の塗りを比べよう','paint')],
    explanations: [step('横は左右反転。元の向き → 鏡の向き → 元の向きです。','transform',{from:0,to:1,transform:'mirror-x'}),step('縦は塗りだけが変わります。白 → しま → 全面の塗りです。','strip',{samples:[0,3,6],focus:'paint'}),step('右下では「元の向き」と「全面の塗り」を合わせます。','answer',{focus:'combine'})]
  }, overlayQuestion('Q24', 'union', 'circle', [[0,4],[4,7],[2,3,4], [1,3],[3,8],[1,5,6], [0,1,4],[1,6],null], [[0,1,4,6],[0,2,4,5],[0,2,4],[5]], 1, 3, true));
  const initial = window.LabQuestions;
  initial.forEach(q => {
    q.category = q.practice ? '回転・反転' : '複数ルール';
    q.ruleFamily = q.practice ? 'rotate-cw-90' : 'independent-orientation-count';
    q.difficulty = q.practice ? 1 : 2;
    q.layout = q.practice ? 'strip' : 'matrix';
    q.ruleSummary = q.id === 'Q01' ? '操作練習・90°時計回り' : q.id === 'Q02' ? '向き＋個数' : '切り欠きの向き＋穴の数';
  });
  window.LabQuestions = [...initial, ...fixed].sort((a,b) => a.id.localeCompare(b.id));
})();
