/* 出題の判断は初見の正誤とヒントだけを使う。時間は選定に使わない。 */
window.LabAdaptive = (() => {
  const categories = ['回転・反転','移動・個数','重ね合わせ','複数ルール'];
  function profile(questions,data) {
    return categories.map(category=>{
      const firsts=questions.filter(q=>!q.practice&&q.category===category).map(q=>({q,a:data.records[q.id]?.first})).filter(x=>x.a?.source==='practice'&&Number.isInteger(x.a.hints));
      const n=firsts.length,correct=firsts.filter(x=>x.a.correct).length,hinted=firsts.filter(x=>x.a.hints>0).length;
      const unaided=firsts.filter(x=>x.a.correct&&!x.a.hints).length;
      // ５件ごとの初見区間で、１段階ずつ調整。最大でも１→２→３。
      let level=1;
      for(let i=0;i+5<=n;i+=5){
        const block=firsts.slice().sort((a,b)=>(a.a.at||0)-(b.a.at||0)||a.q.id.localeCompare(b.q.id)).slice(i,i+5);
        const good=block.filter(x=>x.a.correct&&!x.a.hints).length;
        if(good>=4)level=Math.min(3,level+1);else if(good<=2)level=Math.max(1,level-1);
      }
      return {category,n,correct,hinted,unaided,level,need:n?1-(correct-.5*hinted)/n:1};
    });
  }
  function select(questions,data,seed) {
    const rows=profile(questions,data), enough=rows.every(r=>r.n>=5), pool=questions.filter(q=>!q.practice);
    const answered=id=>!!data.records[id]||(data.challenges||[]).some(s=>s.answers?.[id]?.state==='answered');
    const used=Object.fromEntries(categories.map(c=>[c,0])),entries=[];
    const hash=s=>Array.from(s).reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
    while(entries.length<Math.min(8,pool.length)){
      const available=rows.filter(r=>used[r.category]<4&&pool.some(q=>q.category===r.category&&!entries.some(e=>e.questionId===q.id)));
      const missing=available.filter(r=>!used[r.category]);
      const candidates=missing.length?missing:available;
      candidates.sort((a,b)=> enough ? (used[a.category]/(1+3*a.need)-used[b.category]/(1+3*b.need)||b.need-a.need||a.category.localeCompare(b.category)) : used[a.category]-used[b.category]||a.category.localeCompare(b.category));
      const row=candidates[0];if(!row)break;
      const remaining=pool.filter(q=>q.category===row.category&&!entries.some(e=>e.questionId===q.id));
      // 目標より高い候補は１段階まで。基本の間は、発展より基本・標準の再出題。
      const eligible=remaining.filter(q=>q.difficulty<=Math.min(3,row.level+1));
      const source=eligible.length?eligible:remaining;
      source.sort((a,b)=>Number(answered(a.id))-Number(answered(b.id))||Math.abs(a.difficulty-row.level)-Math.abs(b.difficulty-row.level)||(data.lastSeen[a.id]||0)-(data.lastSeen[b.id]||0)||hash(`${seed}:${a.id}`)-hash(`${seed}:${b.id}`));
      const q=source[0],repeated=answered(q.id);
      entries.push({questionId:q.id,category:q.category,level:q.difficulty,repeated,reasons:[missing.length?'４分野を最低１問ずつ':enough?'正答とヒントに基づく配分':'記録不足のため均等配分',`初見 ${row.n}問・正解 ${row.correct}問・ヒント使用 ${row.hinted}問`,`選択前の分野内出題数 ${used[q.category]}問・重み ${(enough?1+3*row.need:1).toFixed(2)}`,repeated?'条件内の未回答が不足したため再出題':'未回答を優先',`目標LEVEL ${row.level}・選択LEVEL ${q.difficulty}`,`前回表示 ${data.lastSeen[q.id]||'なし'}`,`同条件の決定値 ${hash(`${seed}:${q.id}`)}`]});
      used[q.category]++;
    }
    return {algorithm:'adaptive-1',seed:String(seed),profiles:rows,enough,entries,ids:entries.map(e=>e.questionId),answers:{}};
  }
  function guide(questions,data){
    const rows=profile(questions,data);
    if(rows.some(r=>r.n<5))return {text:'まだ記録が少ないため、各分野を均等に練習しましょう。',reason:'各分野５問以上の通常初見記録がそろうまで、得意・苦手は判断しません。',category:null,level:0};
    const ranked=rows.slice().sort((a,b)=>b.need-a.need||a.category.localeCompare(b.category));
    const weak=ranked[0];
    if(weak.need>.3){
      const level=Math.min(...questions.filter(q=>!q.practice&&q.category===weak.category).map(q=>q.difficulty));
      return {text:`${weak.category}の${['','基本','標準','発展'][level]}問題を練習してみましょう。`,reason:`初見正解 ${weak.correct}/${weak.n}問・ヒント使用 ${weak.hinted}/${weak.n}問を参考にしています。`,category:weak.category,level};
    }
    const strong=rows.slice().sort((a,b)=>b.unaided/b.n-a.unaided/a.n)[0];
    const available=questions.filter(q=>!q.practice&&q.category===strong.category&&q.difficulty<=Math.max(2,strong.level)).map(q=>q.difficulty);
    const level=Math.max(...available);
    return {text:`${strong.category}は安定しています。${['','基本','標準','発展'][level]}問題に挑戦できます。`,reason:`初見のヒントなし正解 ${strong.unaided}/${strong.n}問。回答の速さは判断に使いません。`,category:strong.category,level};
  }
  return {profile,select,guide};
})();
