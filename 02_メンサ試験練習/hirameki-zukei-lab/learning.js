/* 保存・出題・学習記録。DOMや図形描画に依存しない。 */
window.LabLearning = (() => {
  const KEY = 'hirameki-zukei-lab:v1';
  const categories = ['回転・反転', '移動・個数', '重ね合わせ', '複数ルール'];
  const blank = () => ({ version: 1, onboarded: false, records: {}, reviews: {}, daily: {}, lastSeen: {}, activeDaily: null });
  const status = (correct, hints) => !correct ? '解説で確認' : hints ? 'ヒントを使って正解' : '自力で正解';
  const firstStatus = attempt => !attempt.correct ? '初見で不正解' : attempt.hints ? '初見でヒントあり正解' : '初見でヒントなし正解';
  const jstDate = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  function create(questions, storage, now = () => new Date()) {
    const byId = Object.fromEntries(questions.map(q => [q.id, q]));
    const pool = questions.filter(q => !q.practice);
    let data = blank(), persistent = true;
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        const loaded = JSON.parse(raw);
        if (loaded.version !== 1 || !loaded.records || !loaded.reviews || !loaded.daily || !loaded.lastSeen) throw Error('invalid storage');
        data.onboarded = loaded.onboarded === true;
        data.activeDaily = /^\d{4}-\d{2}-\d{2}$/.test(loaded.activeDaily) ? loaded.activeDaily : null;
        for (const q of pool) {
          const record = loaded.records[q.id];
          if (record && record.first && typeof record.first.correct === 'boolean' && Number.isInteger(record.first.hints) && record.first.hints >= 0) {
            data.records[q.id] = record;
          }
          if (loaded.reviews[q.id]) data.reviews[q.id] = { originId: q.id, createdAt: Number(loaded.reviews[q.id].createdAt) || 0 };
          if (Number.isFinite(loaded.lastSeen[q.id])) data.lastSeen[q.id] = loaded.lastSeen[q.id];
        }
        for (const [date, set] of Object.entries(loaded.daily)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(set.ids) || set.ids.length !== 5 || new Set(set.ids).size !== 5 || !set.ids.every(id => byId[id] && !byId[id].practice)) continue;
          const answers = {};
          for (const id of set.ids) {
            const a = set.answers && set.answers[id];
            if (a && byId[id].choices.some(c => c.id === a.choiceId) && Number.isInteger(a.hints) && a.hints >= 0) {
              const correct = a.choiceId === byId[id].answerId;
              answers[id] = { ...a, correct, status: status(correct, a.hints) };
            }
          }
          data.daily[date] = { ids: set.ids, answers };
        }
      }
    } catch { persistent = false; }
    function save() {
      try { storage.setItem(KEY, JSON.stringify(data)); persistent = true; } catch { persistent = false; }
      return persistent;
    }
    const hash = value => {
      let n = Array.from(value).reduce((n,c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 17);
      n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
      n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
      return (n ^ (n >>> 16)) >>> 0;
    };
    function daily(date = jstDate(now())) {
      if (data.daily[date]) return data.daily[date];
      const ids = [], used = Object.fromEntries(categories.map(c => [c, 0]));
      while (ids.length < 5) {
        const remaining = pool.filter(q => !ids.includes(q.id));
        remaining.sort((a,b) => {
          const answered = Number(!!data.records[a.id]) - Number(!!data.records[b.id]);
          if (answered) return answered;
          // 未回答は分野を分散。既回答は最後に見た日時が古い問題を優先。
          if (data.records[a.id]) {
            const age = (data.lastSeen[a.id] || 0) - (data.lastSeen[b.id] || 0);
            if (age) return age;
          }
          return used[a.category] - used[b.category] || hash(`${date}:${a.id}`) - hash(`${date}:${b.id}`) || a.id.localeCompare(b.id);
        });
        const next = remaining[0];
        ids.push(next.id); used[next.category]++;
      }
      const set = { ids, answers: {} };
      data.daily[date] = set;
      ids.forEach(id => { data.lastSeen[id] = now().getTime(); });
      save(); return set;
    }
    function practice(category) {
      return pool.filter(q => q.category === category).sort((a,b) => Number(!!data.records[a.id]) - Number(!!data.records[b.id]) || (data.lastSeen[a.id] || 0) - (data.lastSeen[b.id] || 0) || a.id.localeCompare(b.id)).map(q => q.id);
    }
    function reviewPlan() {
      const reserved = new Set();
      return Object.values(data.reviews).sort((a,b) => a.createdAt - b.createdAt || a.originId.localeCompare(b.originId)).map(item => {
        const original = byId[item.originId];
        const similar = pool.filter(q => q.id !== original.id && q.ruleFamily === original.ruleFamily && !data.records[q.id] && !reserved.has(q.id))
          .sort((a,b) => b.id.localeCompare(a.id))[0];
        const questionId = similar ? similar.id : original.id;
        reserved.add(questionId);
        return { originId: original.id, questionId };
      });
    }
    function record(questionId, choiceId, hints, context = {}) {
      const q = byId[questionId];
      if (!q || !q.choices.some(c => c.id === choiceId)) return null;
      if (context.dailyDate && data.daily[context.dailyDate]?.answers[questionId]) return null;
      const correct = choiceId === q.answerId;
      const attempt = { choiceId, correct, hints, status: status(correct, hints), at: now().getTime() };
      if (!q.practice) {
        const previous = data.records[questionId];
        data.records[questionId] = { first: previous ? previous.first : { ...attempt }, attempts: (previous ? previous.attempts : 0) + 1, last: { ...attempt } };
        data.lastSeen[questionId] = attempt.at;
        if (context.originId && byId[context.originId]) {
          if (correct && !hints) delete data.reviews[context.originId];
          // 復習では元の項目を維持し、解いた類題を別項目として二重登録しない。
        } else if (!correct || hints) {
          if (!data.reviews[questionId]) data.reviews[questionId] = { originId: questionId, createdAt: attempt.at };
        }
      }
      if (context.dailyDate && data.daily[context.dailyDate]?.ids.includes(questionId)) data.daily[context.dailyDate].answers[questionId] = attempt;
      save(); return attempt;
    }
    return {
      get data() { return data; }, get persistent() { return persistent; },
      daily, practice, reviewPlan, record, save,
      onboard() { data.onboarded = true; save(); },
      activateDaily(date) { data.activeDaily = date; save(); },
      leaveDaily() { if (data.activeDaily) { data.activeDaily = null; save(); } },
      seen(id) { if (byId[id] && !byId[id].practice) { data.lastSeen[id] = now().getTime(); save(); } }
    };
  }
  return { KEY, categories, create, status, firstStatus, jstDate };
})();
