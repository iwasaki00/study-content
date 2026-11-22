/* 誤答分類は監査済みの選択肢IDに限定。説明文から心理や理由を推定しない。 */
window.LabInsightsContent=(()=>{
  const improvedIds=['Q03','Q22','Q24','Q39','Q40','Q43','Q56','Q57','Q58','Q62','Q63','Q64'];
  const errorMap={
    Q04:{a:['rotation','反対方向へ90°の選択肢'],c:['mirror','向きは同じで、鏡の形を選択']},
    Q06:{a:['mirror','直前の図形に上下反転'],c:['mirror','直前の図形に半回転'],d:['mirror','左右を入れ替えない選択肢']},
    Q14:{a:['count','前の増分＋４を反復'],c:['count','一定の増分＋１'],d:['count','前々回の増分＋３']},
    Q51:{a:['partial','横の位置は一致・縦の位置が１段不足'],b:['partial','縦の位置は一致・横の位置は不一致'],d:['partial','横の位置は一致・縦の位置は不一致']},
    Q29:{b:['movement','左２マスの代わりに右２マスへ循環']},
    Q30:{a:['order','次の左２マスの代わりに前の右１マスを反復'],d:['movement','左２マスの代わりに右２マス']},
    Q15:{a:['overlay','ORの代わりにAND'],b:['overlay','ORの代わりにXOR']},
    Q19:{a:['overlay','XORの代わりにOR'],b:['overlay','XORの代わりにAND']},
    Q02:{a:['partial','向きは一致・個数は不一致'],c:['partial','個数は一致・向きは不一致'],d:['partial','個数は一致・向きは不一致']},
    Q03:{a:['partial','切り欠きは一致・穴の数は不一致'],b:['partial','穴の数は一致・切り欠きは不一致']},
    Q22:{a:['partial','向きは一致・個数は不一致'],c:['partial','個数は一致・向きは不一致']},
    Q23:{a:['partial','形は一致・塗りは不一致'],b:['partial','塗りは一致・形は不一致']},
    Q24:{a:['order','ORの結果から回転を省略'],c:['overlay','XORの結果を時計回り90°回転'],d:['overlay','ANDの結果を時計回り90°回転']},
    Q39:{a:['partial','位置は一致・反転状態は不一致'],b:['partial','反転状態は一致・位置は不一致']},
    Q40:{a:['order','ANDの結果から回転を省略'],b:['overlay','ORの結果を反時計回り90°回転'],c:['rotation','ANDの結果を逆方向に90°回転']},
    Q43:{a:['mirror','反転の番に回転'],d:['mirror','向きは一致・鏡の形は不一致']},
    Q56:{a:['overlay','最初の２入力だけのAND'],b:['overlay','３入力のOR']},
    Q57:{a:['order','２番目の先行回転を省略']},
    Q58:{a:['order','ORのあとの中央段抽出を省略'],b:['overlay','ORの代わりにAND']},
    Q62:{a:['order','ORのあとの移動を省略'],c:['overlay','XORの結果を右へ循環移動']},
    Q63:{a:['partial','位置と向きは一致・塗りは不一致'],b:['partial','向きと塗りは一致・位置は不一致'],c:['partial','位置と塗りは一致・向きは不一致']},
    Q64:{b:['order','ANDと回転のあとで移動を省略']}
  };
  const metadata={
    Q03:{names:['切り欠きだけ回転','穴の数だけ比較','独立した２特徴を統合'],order:'切り欠き → 穴の数 → ２つを合わせる（独立した特徴）',features:[['direction','切り欠き'],['count','穴の数']]},
    Q22:{names:['縦の回転','横の個数','２つを統合'],order:'縦の向き → 横の個数 → ２つを合わせる（独立した特徴）',features:[['direction','向き'],['count','四角の数']]},
    Q24:{names:['ORで集める','全体を右へ90°','２段階の結果'],order:'OR → 時計回り90°',features:[['cells','印の位置']]},
    Q39:{names:['形だけ左右反転','枠の位置だけ移動','独立した２特徴を統合'],order:'形 → 枠の位置 → ２つを合わせる（独立した特徴）',features:[['mirror','鏡の形'],['position','枠の位置']]},
    Q40:{names:['ANDで絞る','全体を左へ90°','２段階の結果'],order:'AND → 反時計回り90°',features:[['cells','印の位置']]},
    Q43:{names:['左90°の番','左右反転の番'],order:'左90°と左右反転を交互に。次に行う操作を確認',features:[['direction','角の向き'],['mirror','鏡の形']]},
    Q56:{names:['入力１ AND 入力２','さらに入力３とAND','下段の最初のAND','下段も３入力でAND','残る印を照合'],order:'入力１ AND 入力２ → その結果 AND 入力３',features:[['cells','印の位置']]},
    Q57:{names:['２番目だけ右90°','回転後にOR','下段の先行回転','下段のOR','順番を照合'],order:'２番目だけ時計回り90° → OR',features:[['cells','印の位置']]},
    Q58:{names:['ORで集める','中央段だけ残す','下段のOR','下段の条件抽出','残る印を照合'],order:'OR → 中央の段にある印だけを残す',features:[['cells','印の位置']]},
    Q62:{names:['ORで集める','右へ循環移動','下段のOR','下段の循環移動','位置を照合'],order:'OR → 右へ１マス（右端の次は左端）',features:[['cells','印の位置']]},
    Q63:{names:['位置だけ追う','旗だけ回す','塗りだけ比べる','３特徴を統合'],order:'位置 → 向き → 塗り → ３つを合わせる（独立した特徴）',features:[['position','位置'],['direction','向き'],['paint','塗り']]},
    Q64:{names:['ANDで絞る','右へ90°','右へ循環移動','下段のAND','下段の回転','下段の移動','３段階を照合'],order:'AND → 時計回り90° → 右へ１マス',features:[['cells','印の位置']]}
  };
  function enhance(questions){
    for(const q of questions){if(errorMap[q.id])q.errorMap=Object.fromEntries(Object.entries(errorMap[q.id]).map(([id,[tag,detail]])=>[id,{tag,detail}]));}
    for(const id of improvedIds){const q=questions.find(q=>q.id===id);q.insight=metadata[id];for(const e of q.explanations)e.animate=true;}
    const q=id=>questions.find(q=>q.id===id);
    q('Q43').explanations[0]={...q('Q43').explanations[0],demo:'transform',transform:'ccw'};
    q('Q43').explanations[1]={...q('Q43').explanations[1],demo:'transform',transform:'mirror-x'};
    q('Q39').explanations[1]={...q('Q39').explanations[1],demo:'component-move',from:3,to:6};
    q('Q63').explanations[0]={...q('Q63').explanations[0],demo:'component-move',from:0,to:1};
    q('Q63').explanations[1]={...q('Q63').explanations[1],demo:'component-turn',from:0,to:3,transform:'cw'};
    q('Q56').explanations=[...[0,2].flatMap(row=>[0,1].map(part=>({text:part?'途中の結果を３番目とも比べ、共通の印だけに絞ります。':'まず１番目と２番目に共通する印を残します。',demo:'three-intersection',row,part,focus:'marks',animate:true}))),{text:'３つすべてに共通する印だけが残ります。',demo:'answer',focus:'combine'}];
    const titles={Q43:'角と鏡の形',Q56:'３つの図の関係',Q57:'２図と出力の関係',Q58:'残る印の関係',Q62:'２図と出力の関係',Q63:'枠の中の３つの特徴',Q64:'図形をつなぐ手順'};
    for(const [id,title] of Object.entries(titles))q(id).title=title;
    const feedback={Q57:{d:'左の図の印は含められています。２番目を回した結果と、余分な印を比べます。'},Q62:{d:'一部の位置は合っています。片方だけの印も残し、右端から戻る位置を確かめます。'},Q64:{a:'印が２つなのは合っています。共通部分から回転と移動を順に確かめます。',d:'共通の印は２つです。まず共通部分に絞ってから回転と移動を確かめます。'}};
    for(const [id,items] of Object.entries(feedback))for(const [choice,text] of Object.entries(items))q(id).choices.find(c=>c.id===choice).feedback=text;
  }
  const value=(s,key)=>key==='cells'?[...s.cells].sort((a,b)=>a-b).join(','):s[key];
  function matches(q,chosen){const correct=q.choices.find(c=>c.id===q.answerId).shape;return (q.insight?.features||[]).map(([key,label])=>({key,label,match:value(chosen.shape,key)===value(correct,key)}));}
  function feedback(q,chosen){
    if(!q.insight||chosen.id===q.answerId)return '';
    const correct=q.choices.find(c=>c.id===q.answerId),{svg}=window.LabShapes;
    return `<div class="insight-error-visual"><p>一致した特徴と、違った特徴</p><ul>${matches(q,chosen).map(f=>`<li>${f.match?'✓':'×'} ${f.label}：${f.match?'一致':'不一致'}</li>`).join('')}</ul><div class="demo"><div class="demo-tile">${svg(chosen.shape)}<span>選んだ図形</span></div><b>≠</b><div class="demo-tile">${svg(correct.shape)}<span>規則をすべて適用した図形</span></div></div></div>`;
  }
  function header(q,step){return q.insight?`<div class="rule-header"><strong>${q.insight.names[step]}</strong><p>確認・適用順：${q.insight.order}</p></div>`:'';}
  return {improvedIds,metadata,errorMap,enhance,matches,feedback,header};
})();
window.LabInsightsContent.enhance(window.LabQuestions);
