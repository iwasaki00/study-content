/* v0.2.0の固定16問。既存Q01〜Q24は変更しない。 */
(() => {
  const flag=(direction=0,mirror=false,paint='outline')=>({kind:'flag',direction,mirror,paint,count:0});
  const track=(position,slots=5,count=0)=>({kind:'track',position,slots,count});
  const beads=count=>({kind:'beads',count});
  const marks=(cells,mark='circle')=>({kind:'marks',cells,mark});
  const moving=(position,mirror=false)=>({...flag(0,mirror),kind:'moving-flag',position,slots:3});
  const hint=(text,focus='outer')=>({text,focus});
  const step=(text,demo,options={})=>({text,demo,focus:'outer',...options});
  const choices=(shapes,messages)=>shapes.map((shape,i)=>({id:'abcd'[i],shape,feedback:messages[i]||''}));
  const seq=(id,category,summary,family,board,options,correct,messages,hints,explanations,difficulty=2)=>({
    id,category,title:'図形のつながり',ruleSummary:summary,ruleFamily:family,difficulty,layout:'sequence',columns:3,
    prompt:'次に来る図形はどれ？',board:[...board,null],choices:choices(options,messages),answerId:'abcd'[correct],hints,explanations
  });
  const rotate=(text,from,to,transform)=>step(text,'transform',{from,to,transform});
  const shapeHints=[hint('斜めの角と短い出っ張りを見よう'),hint('１→２、２→３の順に、動く角度と方向を比べよう')];
  const positionHints=[hint('線の上の印と、両端の位置を見よう'),hint('１→２、２→３、３→４の順で移動する幅を比べよう')];
  const countHints=[hint('印の数だけを見よう','inner'),hint('１→２、２→３、３→４で、増えた数と減った数を比べよう','inner')];
  const added=[
    seq('Q25','回転・反転','45°反時計回り','rotate-ccw-45',[flag(),flag(315),flag(270),flag(225)],
      [flag(270),flag(180),flag(135),flag(225,true)],1,
      ['反対向きに回しています。毎回、反時計回りに45°です。','','90°回しています。回す角度は45°です。','反転ではなく、形全体の回転です。'],shapeHints,
      [rotate('毎回、反時計回りに45°ずつ回ります。斜めの角も追いましょう。',0,1,'ccw45'),rotate('最後の図形からも、同じ向きへ45°回します。',3,'answer','ccw45')]),
    seq('Q26','回転・反転','135°時計回り','rotate-cw-135',[flag(),flag(135),flag(270),flag(45)],
      [flag(270),flag(135),flag(45,true),flag(180)],3,
      ['回す方向が逆です。時計回りに135°回します。','90°で止めています。さらに45°回します。','鏡に映すのではなく、形全体を回します。',''],shapeHints,
      [rotate('１→２は時計回りに135°。90°と、さらに45°の回転です。',0,1,'cw135'),rotate('２→３も同じ角度。最後からも時計回りに135°回します。',3,'answer','cw135')],3),
    seq('Q27','回転・反転','斜めの軸で反転','mirror-diagonal',[flag(),flag(270,true),flag(),flag(270,true)],
      [flag(180,true),flag(),flag(90,true),flag(270)],1,
      ['上下だけでなく、斜めの軸で反転します。','','反対側の斜めの軸に映しています。左上と右下を結ぶ軸です。','回転ではなく、斜めの軸に映す変化です。'],
      [hint('斜めの角と、長い辺の位置を見よう'),hint('１→２と２→３で、上下と左右がどう入れ替わるか比べよう')],
      [rotate('左上と右下を結ぶ斜めの軸に映すと、１から２の形になります。',0,1,'diagonal'),rotate('同じ軸にもう一度映すと元の形へ。最後も同じ反転です。',3,'answer','diagonal')],3),
    seq('Q28','回転・反転','時計回り90°と反時計回り45°が交互','alternate-plus90-minus45',
      [flag(),flag(90),flag(45),flag(135),flag(90),flag(180)],
      [flag(270),flag(225),flag(135),flag(180)],2,
      ['時計回り90°を続けています。次は反時計回り45°の番です。','次の45°は時計回りではなく、反時計回りです。','','向きを変えずに残しています。次の回転を加えます。'],
      [hint('斜めの角の向きを追おう'),hint('１→２と３→４、２→３と４→５を分けて比べよう')],
      [rotate('１→２、３→４は時計回り90°です。',0,1,'cw'),rotate('２→３、４→５は反時計回り45°。２つの回転が交互です。',1,2,'ccw45'),rotate('５→６は時計回りでした。次は反時計回り45°です。',5,'answer','ccw45')],3),
    seq('Q29','移動・個数','左へ２マス・端を越えて循環','move-wrap-minus-two',
      [track(1),track(4),track(2),track(0),track(3)],
      [track(4),track(0),track(1),track(2)],2,
      ['右へ進めています。左へ２マス、端を越えたら反対端から数えます。','３マス動かしています。動く幅は２マスです。','','動く幅が１マスになっています。毎回２マスです。'],positionHints,
      [step('毎回、左へ２マス。左端を越えた分は右端から数えます。','pair',{from:0,to:1}),step('最後の位置からも左へ２マス進みます。','pair',{from:4,to:'answer'})]),
    seq('Q30','移動・個数','右へ１・左へ２を交互','move-plus-one-minus-two',
      [track(4,7),track(5,7),track(3,7),track(4,7),track(2,7),track(3,7)],
      [track(4,7),track(2,7),track(1,7),track(5,7)],2,
      ['右への移動を続けています。次は左へ動く番です。','左へ動く向きは合っています。動く幅は２マスです。','','向きと動く幅を分けましょう。次は左へ２マスです。'],positionHints,
      [step('右へ１マス、左へ２マス。この２つを繰り返します。','strip',{samples:[0,1,2],captions:['位置を確認','右へ１','左へ２']}),step('最後は右へ１マス動いたところ。次は左へ２マスです。','pair',{from:5,to:'answer'})],3),
    seq('Q31','移動・個数','３つ増え・１つ減る','count-plus-three-minus-one',
      [beads(2),beads(5),beads(4),beads(7),beads(6),beads(9)],
      [beads(12),beads(8),beads(6),beads(10)],1,
      ['増える変化を続けています。次は減る番です。','','減らす数が３つです。減る番では１つだけ減ります。','増えるのではなく、１つ減らす番です。'],countHints,
      [step('２→５は＋３、５→４は−１。増える番と減る番が交互です。','strip',{samples:[0,1,2,3],focus:'inner',captions:['２','＋３','−１','＋３']}),step('最後は９つ。次は１つ減らすので８つです。','pair',{from:5,to:'answer',focus:'inner'})]),
    seq('Q32','移動・個数','１つ増え・２つ減る','count-plus-one-minus-two',
      [beads(9),beads(10),beads(8),beads(9),beads(7),beads(8)],
      [beads(9),beads(7),beads(10),beads(6)],3,
      ['増える番を続けています。次は減る番です。','減る向きは合っています。減らす数は２つです。','増える番と減る番を分けましょう。次は２つ減ります。',''],countHints,
      [step('９→10は＋１、10→８は−２。この２つの変化を繰り返します。','strip',{samples:[0,1,2,3],focus:'inner',captions:['９','＋１','−２','＋１']}),step('最後は８つ。次は２つ減らすので６つです。','pair',{from:5,to:'answer',focus:'inner'})])
  ];
  function overlay(id,operation,mark,rows,options,correct,messages,rotation=0){
    const text={union:'どちらかにある印を残す',intersection:'共通の印だけ残す',xor:'重なった印を消す'}[operation];
    return {id,title:'２つの図と印',category:rotation?'複数ルール':'重ね合わせ',ruleSummary:rotation?'共通部分＋反時計回り90°':text,
      ruleFamily:rotation?'intersection-then-rotate-ccw':`overlay-${operation}`,difficulty:rotation?3:2,layout:'matrix',columns:3,operation,rotation,
      prompt:'右下に入る図形はどれ？',board:rows.map(c=>c===null?null:marks(c,mark)),choices:choices(options.map(c=>marks(c,mark)),messages),answerId:'abcd'[correct],
      hints:[hint('共通の位置と、片方だけの印を見よう','marks'),hint(rotation?'上の２行で、重ねたあとの向きも比べよう':'左と中央を重ねたとき、右に何が残るか上の行から比べよう','example')],
      explanations:rotation?[
        step('まず、同じ位置にある共通の印だけ残します。','overlay',{row:2,operation,focus:'marks'}),
        step('次に、残った図を反時計回りに90°回します。上の２行も同じ順番です。','set-rotation',{focus:'marks'}),
        step('「共通の印を残す → 左へ回す」で右下が決まります。','answer',{focus:'combine'})
      ]:[step(`同じ行の左と中央を重ね、${text}規則です。`,'overlay',{row:0,operation,focus:'marks'}),step(`下の行にも、${text}規則を使います。`,'overlay',{row:2,operation,focus:'marks'}),step('上の２行と同じ残し方で、右下を埋めます。','answer',{focus:'combine'})]};
  }
  added.push(
    overlay('Q33','union','circle',[[0,2,7],[2,5,7],[0,2,5,7], [1,4,8],[0,4,8],[0,1,4,8], [0,3,5],[3,6,8],null],[[3],[0,5,6,8],[0,3,5,6,8],[0,3,5]],2,
      ['共通の印だけでなく、片方だけの印も残します。','重なった印も、消さずに残します。','','中央の図にだけある印も加えます。']),
    overlay('Q34','intersection','square',[[0,4,6],[0,2,6],[0,6], [1,5,7],[1,3,5],[1,5], [2,3,8],[0,3,8],null],[[3,8],[0,2,3,8],[0,2],[2,3,8]],0,
      ['','片方にだけある印も残しています。共通の位置だけを残します。','共通部分を消しています。今回は共通部分を残します。','左の図だけで決めず、中央の図にもある印だけを残します。']),
    overlay('Q35','xor','circle',[[0,1,4],[1,4,6],[0,6], [2,3,7],[0,3,7],[0,2], [1,4,8],[1,5,8],null],[[1,4,5,8],[1,8],[1,4,8],[4,5]],3,
      ['重なった印を残しています。共通の印は消します。','共通の印だけ残しています。今回は共通の印を消します。','片方の図だけでなく、両方の印を比べましょう。','']),
    overlay('Q36','xor','square',[[0,3,8],[3,6,8],[0,6], [1,4,5],[4,5,7],[1,7], [1,2,6],[0,2,6],null],[[2,6],[0,1],[0,1,2,6],[1,2,6]],1,
      ['共通の印だけ残しています。今回は共通の印を消します。','','重なった印も残しています。重なった位置だけ消します。','左の図だけで決めず、中央の図にだけある印も見ましょう。'])
  );
  added.push({
    id:'Q37',title:'線の印と点',category:'複数ルール',ruleSummary:'左へ移動＋点の減少',ruleFamily:'independent-position-count',difficulty:2,layout:'matrix',columns:3,
    prompt:'右下に入る図形はどれ？',
    board:[track(3,4,3),track(2,4,3),track(1,4,3),track(3,4,2),track(2,4,2),track(1,4,2),track(3,4,1),track(2,4,1),null],
    choices:choices([track(1,4,2),track(2,4,1),track(0,4,2),track(1,4,1)],['位置は合っています。下の行の点は１つです。','点１つは合っています。印は左へ１マス動きます。','位置と数を分けましょう。印は左から２番目、点は１つです。','']),answerId:'d',
    hints:[hint('線の上の印の位置を見よう'),hint('横に印の位置、縦に下の点の数を比べよう','inner')],
    explanations:[step('横へ進むと、印が左へ１マスずつ動きます。','strip',{samples:[0,1,2]}),step('下の段へ進むと、点が３→２→１と減ります。','strip',{samples:[0,3,6],focus:'inner'}),step('左から２番目の印と、点１つを合わせます。','answer',{focus:'combine'})]
  },{
    id:'Q38',title:'斜めの形と塗り',category:'複数ルール',ruleSummary:'向き＋塗り',ruleFamily:'independent-orientation-paint',difficulty:3,layout:'matrix',columns:3,
    prompt:'右下に入る図形はどれ？',board:[flag(45),flag(135),flag(225),flag(45,false,'striped'),flag(135,false,'striped'),flag(225,false,'striped'),flag(45,false,'solid'),flag(135,false,'solid'),null],
    choices:choices([flag(225),flag(315,false,'solid'),flag(225,false,'solid'),flag(45,false,'striped')],['向きは合っています。下の行は全面の塗りです。','全面の塗りは合っています。横は時計回り90°ずつです。','','向きと塗りを分けましょう。横に回転、縦に塗りが変わります。']),answerId:'c',
    hints:[hint('形の斜めの角を見よう'),hint('横に向き、縦に塗りを比べよう','paint')],
    explanations:[rotate('横は時計回りに90°ずつ回転。斜めの角も一緒に回ります。',0,1,'cw'),step('縦は白→しま→全面の塗りです。向きは同じです。','strip',{samples:[0,3,6],focus:'paint'}),step('時計回りに90°回した向きと、全面の塗りを合わせます。','answer',{focus:'combine'})]
  },{
    id:'Q39',title:'枠の中の小さな形',category:'複数ルール',ruleSummary:'反転＋移動',ruleFamily:'independent-mirror-position',difficulty:3,layout:'matrix',columns:3,
    prompt:'右下に入る図形はどれ？',board:[moving(0),moving(0,true),moving(0),moving(1),moving(1,true),moving(1),moving(2),moving(2,true),null],
    choices:choices([moving(2,true),moving(1),moving(2),moving(0,true)],['枠の位置は合っています。形は左右をもう一度反転します。','形の向きは合っています。下の行では右の枠へ移ります。','','形と枠の位置を分けましょう。元の向きの形が右の枠に入ります。']),answerId:'c',
    hints:[hint('小さな形の角と出っ張りを見よう'),hint('横に形、縦に入っている枠の位置を比べよう','position')],
    explanations:[step('横では、小さな形だけを左右反転します。枠の位置は動きません。','component-mirror',{from:0,to:1}),step('下へ進むと、形が入る枠が左→中央→右と移ります。','strip',{samples:[0,3,6],focus:'position'}),step('元の向きの形を、右の枠へ入れます。','answer',{focus:'combine'})]
  },overlay('Q40','intersection','circle',[[0,2,4],[0,4,8],[4,6], [1,3,5],[1,5,8],[1,3], [0,4,7],[2,4,7],null],[[4,7],[0,4,5,6],[3,4],[4,5]],3,
    ['共通の印の残し方は合っています。最後に反時計回り90°回します。','回す向きは合っています。片方だけの印は残しません。','共通の印は合っています。回す方向は反時計回りです。',''],-90));
  window.LabQuestions=[...window.LabQuestions,...added];
})();
