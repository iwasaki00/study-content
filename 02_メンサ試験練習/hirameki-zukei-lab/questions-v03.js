/* 固定のオリジナル24問。乱数や問題自動生成は利用しない。 */
(() => {
  const F=(direction=0,mirror=false,paint='outline',count=0)=>({kind:'flag',direction,mirror,paint,count});
  const T=(position,slots=5,count=0)=>({kind:'track',position,slots,count});
  const B=count=>({kind:'beads',count});
  const M=(cells,mark='circle')=>({kind:'marks',cells,mark});
  const D=(direction,secondDirection)=>({kind:'dual',direction,secondDirection});
  const A=(position,secondPosition)=>({kind:'agents',position,secondPosition});
  const V=(position,mirror=false,direction=0,paint='outline',count=0)=>({...F(direction,mirror,paint,count),kind:'moving-flag',position,slots:3});
  const h=(text,focus='outer')=>({text,focus});
  const e=(text,from,to,focus='outer')=>({text,demo:'pair',from,to,focus});
  const strip=(text,samples,focus='outer',captions)=>({text,demo:'strip',samples,focus,captions});
  function make(id,category,title,ruleFamily,difficulty,board,options,correct,feedback,hints,explanations,extra={}){
    return {id,category,title,ruleSummary:title,ruleFamily,difficulty,layout:'sequence',columns:3,prompt:'次に来る図形はどれ？',board:[...board,null],choices:options.map((shape,i)=>({id:'abcd'[i],shape,feedback:i===correct?'':feedback[i]})),answerId:'abcd'[correct],hints,explanations,...extra};
  }
  const rotHints=[h('角と短い出っ張りを追おう'),h('１→２、２→３の順で、回す角度と向きを比べよう')];
  const posHints=[h('位置を示す印を追おう','position'),h('１→２、２→３の順に、動く向きと幅を比べよう','position')];
  const added=[
    make('Q41','回転・反転','90°と180°を交互に','alternate-plus90-plus180',2,[F(),F(90),F(270),F(),F(180),F(270)],
      [F(),F(90),F(180),F(270,true)],1,['次は90°ではなく180°回す番です。','','向きを逆にしています。次は時計回り180°です。','反転せず、回転だけを繰り返します。'],rotHints,
      [{text:'１→２は時計回り90°です。',demo:'transform',from:0,to:1,transform:'cw',focus:'outer'},{text:'２→３は180°。この２つの角度を交互に繰り返します。',demo:'transform',from:1,to:2,transform:'half',focus:'outer'},{text:'次は180°の番。270°から180°進めると90°です。',demo:'transform',from:5,to:'answer',transform:'half',focus:'outer'}]),
    make('Q42','回転・反転','右135°・左90°を交互に','alternate-plus135-minus90',2,[F(),F(135),F(45),F(180),F(90),F(225)],
      [F(315),F(),F(135),F(225,true)],2,['次は反時計回り90°回す番です。','前の変化を繰り返しています。２つの変化を分けましょう。','','回転で角を追います。鏡には映しません。'],rotHints,
      [{text:'１→２は時計回り135°です。',demo:'transform',from:0,to:1,transform:'cw135',focus:'outer'},{text:'２→３は反時計回り90°。２つの回転を交互に繰り返します。',demo:'transform',from:1,to:2,transform:'ccw',focus:'outer'},{text:'最後から左へ90°回すと、135°の向きになります。',demo:'transform',from:5,to:'answer',transform:'ccw',focus:'outer'}]),
    make('Q43','回転・反転','左回転と左右反転を交互に','alternate-rotate-mirror',3,[F(),F(270),F(90,true),F(0,true),F(),F(270)],
      [F(180),F(270,true),F(90,true),F(90)],2,['反転の番です。角だけでなく左右の形も比べます。','形を鏡に映すと、向きも入れ替わります。','','回転ではなく左右反転の番です。'],
      [h('斜めの角と、左右の形の違いを見よう'),h('１→２と３→４、２→３と４→５を分けて比べよう')],
      [e('１→２と３→４は反時計回り90°です。',0,1),e('２→３と４→５は左右反転。最後も左右反転の番です。',5,'answer')]),
    make('Q44','回転・反転','斜めの非対称な旗','rotate-ccw-90',1,[F(45,true),F(315,true),F(225,true),F(135,true)],
      [F(225,true),F(45),F(315,true),F(45,true)],3,['回す方向が逆です。反時計回りです。','向きは合っています。鏡の形はそのまま回します。','回す角度は180°ではなく90°です。',''],rotHints,
      [{text:'非対称な旗を、毎回反時計回り90°回します。',demo:'transform',from:0,to:1,transform:'ccw',focus:'outer'},{text:'最後も90°回し、最初と同じ向きに戻ります。',demo:'transform',from:3,to:'answer',transform:'ccw',focus:'outer'}]),
    make('Q45','回転・反転','ＡとＢは別々に回る','independent-two-rotations',2,[D(0,0),D(90,270),D(180,180),D(270,90)],
      [D(0,180),D(0,0),D(180,0),D(90,270)],1,['Ａは合っています。Ｂは反時計回り90°ずつです。','','Ｂは合っています。Ａは時計回り90°ずつです。','ＡとＢを別々に追いましょう。'],
      [h('Ａだけを追い、次にＢを見よう','part-a'),h('ＡとＢそれぞれの１→２、２→３を比べよう','part-b')],
      [strip('Ａは時計回り90°ずつ回ります。',[0,1,2],'part-a'),strip('Ｂは反時計回り90°ずつ。Ａとは逆向きです。',[0,1,2],'part-b'),e('ＡとＢは４回で元の向きに戻ります。',3,'answer','combine')]),
    make('Q46','回転・反転','３つの向きの周期','rotation-cycle-three',2,[F(),F(90),F(180),F(),F(90),F(180)],
      [F(270),F(90),F(),F(180,true)],2,['一定の90°回転ではありません。３つの向きが繰り返されます。','周期の途中です。３つで１組にして見ましょう。','','鏡の形は現れません。向きの３つ組を追います。'],
      [h('３つずつに区切って見よう'),h('１〜３と４〜６の向きの並びを比べよう')],
      [strip('0°・90°・180°の３つを繰り返します。',[0,1,2]),strip('次の３つも同じ並び。次は組の最初です。',[3,4,5]),e('180°の次は0°に戻ります。',5,'answer')]),
    make('Q47','移動・個数','右１・右２・左１の周期','move-cycle-three',2,[T(1,7),T(2,7),T(4,7),T(3,7),T(4,7),T(6,7),T(5,7)],
      [T(0,7),T(4,7),T(6,7),T(5,7)],2,['端に戻る規則ではありません。次は右へ１マスです。','左へ動く番を続けています。次は右へ１マスです。','','移動は続きます。３つの動きを繰り返します。'],posHints,
      [strip('右１、右２、左１の３つの移動を繰り返します。',[0,1,2,3]),strip('４→５→６→７も同じ３つの動きです。',[3,4,5,6]),e('最後は左１。次は右１マスです。',6,'answer')]),
    make('Q48','移動・個数','同じ３つの位置へ','position-cycle-three',1,[T(0),T(2),T(4),T(0),T(2),T(4)],
      [T(0),T(1),T(3),T(2)],0,['','２マスの循環移動ではなく、３つの位置の繰り返しです。','端の次に戻る位置を、前の組と比べましょう。','次は組の最初です。'],
      [h('位置を３つずつに分けよう','position'),h('１〜３と４〜６で、同じ位置が現れる順を比べよう','position')],
      [strip('左・中央・右の３つの位置を繰り返します。',[0,1,2]),e('右端の次は、組の最初の左端です。',5,'answer')]),
    make('Q49','移動・個数','印は右へ、点は増える','move-count-cycle',2,[T(0,4,1),T(1,4,2),T(2,4,3),T(3,4,1),T(0,4,2)],
      [T(1,4,2),T(1,4,3),T(2,4,3),T(0,4,1)],1,['印の位置は合っています。点は１→２→３の周期です。','','点３つは合っています。印は右へ１マスです。','位置と点を別々に追いましょう。'],
      [h('まず線の上の印だけを追おう','position'),h('位置の並び、次に下の点の１→２→３を比べよう','inner')],
      [strip('印は右へ１マスずつ進み、端の次は左端です。',[0,1,2],'position'),strip('点は１→２→３→１の周期です。',[0,1,2,3],'inner'),e('右へ１マス動いた位置と、点３つを合わせます。',4,'answer','combine')]),
    make('Q50','移動・個数','減る幅が１ずつ大きくなる','count-growing-decrease',2,[B(15),B(14),B(12),B(9),B(5)],
      [B(2),B(1),B(4),B(0)],3,['次に減らす数は３ではなく５です。','次に減らす数は４ではなく５です。','１つずつ減る規則ではありません。',''],
      [h('図形の数だけを見よう','inner'),h('１→２、２→３で、減った数を順に比べよう','inner')],
      [strip('減る幅は１、２、３、４と１ずつ増えます。',[0,1,2,3,4],'inner'),e('次は５つ減るので、印は０個です。',4,'answer','inner')]),
    make('Q51','移動・個数','横へ右、縦へ下','grid-two-movements',2,[M([0]),M([1]),M([2]),M([3]),M([4]),M([5]),M([6]),M([7])],
      [M([5]),M([6]),M([8]),M([2])],2,['列は合っています。下の段へ１マス進みます。','段は合っています。横へ１マス進みます。','','列は合っています。縦の移動も合わせます。'],
      [h('小さな格子の中の印を見よう','marks'),h('盤面の横の並び、次に縦の並びを比べよう','marks')],
      [strip('盤面を横へ進むと、格子内の印も右へ１マスです。',[0,1,2],'marks'),strip('盤面を下へ進むと、格子内の印も下へ１マスです。',[0,3,6],'marks'),e('下へ、右へ、それぞれの移動を合わせます。',7,'answer','combine')],{layout:'matrix',prompt:'右下に入る図形はどれ？'}),
    make('Q52','移動・個数','丸と四角を追いかける','two-agents-wrap',2,[A(0,4),A(1,3),A(2,2),A(3,1),A(4,0),A(0,4),A(1,3)],
      [A(2,4),A(2,2),A(3,2),A(1,3)],1,['丸は合っています。四角は左へ１マス進みます。','','四角は合っています。丸は右へ１マス進みます。','丸も四角も次の位置へ進めます。'],
      [h('丸だけを追い、次に四角を追おう','part-a'),h('丸と四角を別々に、１→２→３の順で比べよう','part-b')],
      [strip('丸は右へ１マス。右端の次は左端です。',[3,4,5],'part-a'),strip('四角は左へ１マス。左端の次は右端です。',[3,4,5],'part-b'),e('端では反対側へ戻り、次も１マスずつ進めます。',6,'answer','combine')])
  ];
  // 各行は入力２〜３個と出力。３行目の出力だけが未知。
  function overlay(id,title,family,level,rows,options,correct,feedback,recipe,mark='circle',category='重ね合わせ'){
    const columns=(recipe.inputs||2)+1;
    const text={union:'どちらかにある印を残します。',intersection:'すべてに共通する印だけを残します。',xor:'２つで重なった印を消します。'}[recipe.operation];
    const stages=[];
    if(recipe.preRotate)stages.push({text:'先に、２番目の図だけを時計回り90°回します。',stage:'pre'});
    stages.push({text,stage:'merge'});
    if(recipe.keep)stages.push({text:'そのあと、中央の段にある印だけを残します。',stage:'post'});
    if(recipe.rotation)stages.push({text:'重ねた結果を時計回り90°回します。',stage:'rotate'});
    if(recipe.shift)stages.push({text:'そのあと、残った印を右へ１マス。端の次は左端です。',stage:'shift'});
    return make(id,category,title,family,level,rows.slice(0,-1).map(c=>M(c,mark)),options.map(c=>M(c,mark)),correct,feedback,
      [h('共通の位置と、片方だけの印を見よう','marks'),h(recipe.preRotate?'上の行で、２番目の図の向きを変えてから結果と比べよう':'上の行で入力を重ね、そのあと出力に残る位置を比べよう','example')],
      [...stages.map(s=>({text:s.text,demo:'recipe',stage:s.stage,row:0,focus:'marks'})),...stages.map(s=>({text:`最後の行も同じ順です。${s.text}`,demo:'recipe',stage:s.stage,row:2,focus:'marks'})),{text:'見本の２行と同じ操作で、右下を埋めます。',demo:'answer',focus:'combine'}],
      {layout:'matrix',columns,prompt:'右下に入る図形はどれ？',recipe});
  }
  added.push(
    overlay('Q53','両方の図の印を集める','overlay-union',1,[[0,3,7],[1,3,5],[0,1,3,5,7],[2,4,6],[0,4,8],[0,2,4,6,8],[1,4,6],[2,4,7],null],[[4],[1,2,6,7],[1,2,4,6,7],[1,4,6]],2,['共通部分だけでなく、片方だけの印も残します。','共通の印も消さずに残します。','','１番目にない印も集めます。'],{operation:'union'},'square'),
    overlay('Q54','２つともある位置','overlay-intersection',1,[[0,2,5],[0,4,5],[0,5],[1,4,8],[1,3,8],[1,8],[2,4,6],[0,4,6],null],[[4,6],[0,2,4,6],[0,2],[2,4,6]],0,['','片方だけにある位置は残しません。','共通の印は消さずに残します。','２番目の図にもある位置だけを残します。'],{operation:'intersection'}),
    overlay('Q55','重なる印は消える','overlay-xor',1,[[0,2,6],[2,4,6],[0,4],[1,3,8],[0,3,8],[0,1],[0,4,7],[2,4,7],null],[[4,7],[0,2,4,7],[0,4,7],[0,2]],3,['共通の印を消します。','共通の印も残しています。重なる位置は消します。','片方の図だけでなく、両方を比べます。',''],{operation:'xor'},'square'),
    overlay('Q56','３つすべてにある印','overlay-three-intersection',2,[[0,1,3,4,6],[0,2,3,4,8],[0,1,2,4,7],[0,4],[1,2,5,8],[0,1,2,8],[0,1,5,8],[1,8],[2,3,4,7],[2,4,5,7],[0,2,3,5,7],null],[[2,4,7],[0,2,3,4,5,7],[2,7],[4,5]],2,['最初の２つだけでなく、３つ目にもある印に絞ります。','すべての印を集めず、３つに共通する印だけを残します。','','共通の印を消すのではなく残します。'],{operation:'intersection',inputs:3}),
    overlay('Q57','２番目を回してから重ねる','rotate-before-union',3,[[0,4],[0,3],[0,1,2,4],[1,6],[1,4],[1,4,5,6],[2,6],[0,7],null],[[0,2,6,7],[2,3,6],[2,6],[2,5,6,7]],1,['回す順番を確かめましょう。２番目だけを先に回します。','','回した図の印も加えます。','回す方向は時計回りです。'],{operation:'union',preRotate:90}),
    overlay('Q58','集めて中央の段だけ残す','union-filter-middle-row',3,[[0,3,4],[1,4,5],[3,4,5],[2,3,7],[4,7,8],[3,4],[0,4,6],[1,4,5],null],[[0,1,4,5,6],[4],[4,5],[3,4,5]],2,['集め方は合っています。最後に中央の段だけ残します。','共通部分だけではありません。片方だけの印も集めます。','','元の図にない印は足しません。'],{operation:'union',keep:'middle-row'})
  );
  added.push(
    make('Q59','複数ルール','向きと四角を別々に','independent-orientation-count',2,[F(45,false,'striped',1),F(135,false,'striped',1),F(225,false,'striped',1),F(45,false,'striped',2),F(135,false,'striped',2),F(225,false,'striped',2),F(45,false,'striped',3),F(135,false,'striped',3)],
      [F(225,false,'striped',2),F(315,false,'striped',3),F(225,false,'striped',3),F(45,false,'striped',1)],2,['向きは合っています。四角は下の段で３つです。','四角３つは合っています。横は時計回り90°です。','','向きと数を別々に追いましょう。'],
      [h('大きな旗の角だけを見よう'),h('横に向き、縦に旗の下の四角の数を比べよう','inner')],
      [{text:'横へ進むと、旗だけが時計回り90°回ります。',demo:'transform',from:0,to:1,transform:'cw',focus:'outer'},strip('縦へ進むと、下の四角が１→２→３と増えます。',[0,3,6],'inner'),e('向きと四角３つを合わせます。',7,'answer','combine')],{layout:'matrix',prompt:'右下に入る図形はどれ？'}),
    make('Q60','複数ルール','進みながら鏡の形へ','independent-mirror-position',2,[V(0),V(1,true),V(2),V(0,true),V(1),V(2,true)],
      [V(0,true),V(1),V(0),V(2)],2,['枠の位置は合っています。形をもう一度左右反転します。','形は合っています。右端の次は左の枠です。','','形は合っています。右端の次は左の枠です。'],
      [h('枠の位置と、形の左右を分けて見よう','position'),h('１→２→３で位置を追い、次に形の反転を比べよう')],
      [strip('位置は左→中央→右→左です。',[0,1,2,3],'position'),e('形は毎回左右反転。次は元の形です。',5,'answer','outer'),e('左の枠に、元の形を入れます。',5,'answer','combine')]),
    make('Q61','複数ルール','枠と塗りの２つの周期','independent-position-paint',2,[V(0),V(1,false,0,'solid'),V(2),V(0,false,0,'solid'),V(1)],
      [V(2),V(2,false,0,'solid'),V(1,false,0,'solid'),V(0)],1,['位置は合っています。次は全面の塗りです。','','塗りは合っています。右の枠へ進みます。','位置と塗りを別々に追いましょう。'],
      [h('入っている枠を見よう','position'),h('位置の順を追い、次に白と塗りを比べよう','paint')],
      [strip('位置は左→中央→右を繰り返します。',[0,1,2],'position'),strip('塗りは白と全面の塗りが交互です。',[0,1,2],'paint'),e('右の枠と、全面の塗りを合わせます。',4,'answer','combine')]),
    overlay('Q62','印を集めて右へ送る','union-then-shift',3,[[0,3],[3,7],[1,4,8],[1,4],[4,6],[2,5,7],[2,5],[0,5,8],null],[[0,2,5,8],[0,1,3,6],[0,1,6],[0,3]],1,['集め方は合っています。最後に右へ１マス動かします。','','片方だけの印も集めてから移動します。','共通部分だけにせず、片方だけの印も残します。'],{operation:'union',shift:1},'square','複数ルール'),
    make('Q63','複数ルール','位置・向き・塗りを分ける','independent-position-orientation-paint',3,[V(0,false,0),V(1,false,90,'striped'),V(2,false,180,'solid'),V(0,false,90),V(1,false,180,'striped'),V(2,false,270,'solid'),V(0,false,180),V(1,false,270,'striped')],
      [V(2,false,0,'striped'),V(1,false,0,'solid'),V(2,false,90,'solid'),V(2,false,0,'solid')],3,['位置と向きは合っています。右列は全面の塗りです。','向きと塗りは合っています。右の枠へ進みます。','位置と塗りは合っています。向きは90°ずつ回ります。',''],
      [h('位置、角の向き、塗りを１つずつ見よう','position'),h('横に位置と塗り、横と縦に角の向きを比べよう','outer')],
      [strip('横へ進むと、枠は左→中央→右です。',[0,1,2],'position'),strip('向きは横も縦も時計回り90°ずつです。',[0,3,6],'outer'),strip('塗りは列ごとに白→しま→全面です。',[0,1,2],'paint'),e('右の枠、0°の向き、全面の塗りを合わせます。',7,'answer','combine')],{layout:'matrix',prompt:'右下に入る図形はどれ？'}),
    overlay('Q64','共通の印を回して送る','intersection-rotate-shift',3,[[0,3,7],[0,5,7],[0,4],[1,3,8],[1,4,8],[3,7],[0,4,6],[2,4,6],null],[[2,4],[0,4],[1,5],[0,3,4,6]],2,['共通部分は合っています。回したあと右へ１マス動かします。','共通部分は合っています。時計回り90°のあと右へ移動です。','','片方だけの印は残しません。最初に共通部分に絞ります。'],{operation:'intersection',rotation:90,shift:1},'circle','複数ルール')
  );
  // 単一規則は基本、独立した２規則／周期は標準、段階合成は発展。
  const basic=['Q04','Q05','Q06','Q07','Q09','Q10','Q11','Q12','Q13','Q15','Q16','Q17','Q18','Q19','Q20','Q25','Q26','Q27','Q29','Q33','Q34','Q35','Q36'];
  const standard=['Q02','Q03','Q08','Q14','Q21','Q22','Q23','Q28','Q30','Q31','Q32','Q37','Q38','Q39'];
  for(const q of window.LabQuestions){if(basic.includes(q.id))q.difficulty=1;else if(standard.includes(q.id))q.difficulty=2;else if(!q.practice)q.difficulty=3;}
  window.LabQuestions=[...window.LabQuestions,...added];
  const legacyFeedback={Q01:['矢印が回る向きを、解説で確かめましょう。','矢印が回る向きを、解説で確かめましょう。','','矢印が回る向きを、解説で確かめましょう。'],Q02:['矢印の下向きは合っています。下の行の点は３つです。','','点３つは合っています。矢印は右から下に回ります。','点３つは合っています。矢印は右から下に回ります。'],Q03:['切り欠きの向きは合っています。下の行の穴は１つです。','穴１つは合っています。切り欠きは上から左へ移ります。','向きと個数を、１つずつ確かめましょう。切り欠きは左、穴は１つです。','']};
  for(const q of window.LabQuestions.slice(0,3))q.choices.forEach((c,i)=>c.feedback=legacyFeedback[q.id][i]);
  for(const q of window.LabQuestions)q.appearance=q.board.find(Boolean).kind==='marks'?`marks-${q.board[0].mark}`:q.board[0].kind;
})();
