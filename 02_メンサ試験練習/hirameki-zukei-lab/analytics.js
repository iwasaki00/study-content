/* 通常初見・旧版記録・復習・チャレンジを分けて集計。 */
window.LabAnalytics = (()=>{
  function summarize(questions,data,categories){
    const pool=questions.filter(q=>!q.practice);
    const rows=categories.map(category=>{
      const ids=pool.filter(q=>q.category===category).map(q=>q.id);
      const records=ids.map(id=>data.records[id]).filter(Boolean);
      const firsts=records.map(r=>r.first).filter(a=>a.source==='practice');
      const legacy=records.map(r=>r.first).filter(a=>!a.source);
      const sum=(key,field)=>records.reduce((total,r)=>total+(r[key]?.[field]||0),0);
      const timedCount=sum('practiceStats','timedCount'),totalMs=sum('practiceStats','totalMs');
      return {category,denominator:firsts.length,correct:firsts.filter(a=>a.correct).length,hinted:firsts.filter(a=>a.hints>0).length,
        timedCount,averageMs:timedCount?totalMs/timedCount:null,practiced:records.length,total:ids.length,
        pending:ids.filter(id=>data.reviews[id]).length,legacyCount:legacy.length,legacyCorrect:legacy.filter(a=>a.correct).length,
        reviewAnswers:sum('reviewStats','answers'),reviewTimedCount:sum('reviewStats','timedCount'),reviewTotalMs:sum('reviewStats','totalMs')};
    });
    const ranked=rows.slice().sort((a,b)=>(a.denominator?a.correct/a.denominator:1)-(b.denominator?b.correct/b.denominator:1));
    let weakest=null;
    if(rows.every(r=>r.denominator>=5)&&ranked[0].correct/ranked[0].denominator<ranked[1].correct/ranked[1].denominator)weakest=ranked[0].category;
    const outcomes=data.challenges.filter(c=>c.status==='finished').flatMap(c=>Object.values(c.answers));
    const answered=outcomes.filter(a=>a.state==='answered');
    return {rows,weakest,enough:rows.every(r=>r.denominator>=5),challenge:{sessions:data.challenges.filter(c=>c.status==='finished').length,answered:answered.length,correct:answered.filter(a=>a.correct).length,averageMs:answered.length?answered.reduce((n,a)=>n+a.elapsedMs,0)/answered.length:null,skipped:outcomes.filter(a=>a.state==='skipped').length,timeout:outcomes.filter(a=>a.state==='timeout').length,interrupted:outcomes.filter(a=>a.state==='interrupted').length}};
  }
  return {summarize};
})();
