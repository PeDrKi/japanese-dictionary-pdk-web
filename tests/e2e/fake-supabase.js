/* fake-supabase.js — thay cho vendor/supabase.js trong test giao diện.
   Mô phỏng đủ phần của supabase-js mà app dùng: auth, from().select/insert/update/upsert/delete + eq/in/gte/order/range, rpc().
   Dữ liệu nằm trong window.__DB (test đọc/ghi trực tiếp để kiểm tra). Dữ liệu ban đầu: window.__SEED. */
(() => {
  const TABLES = ['cards', 'decks', 'deck_categories', 'deck_cards', 'radicals', 'radical_cards', 'user_decompositions', 'study_sessions', 'starter_decks', 'starter_cards', 'grammar_points'];
  const seed = window.__SEED || {};
  const DB = window.__DB = { n: 0, calls: [], me: seed.me || { role: 'user', status: 'active' }, fail: null };
  for (const t of TABLES) DB[t] = JSON.parse(JSON.stringify(seed[t] || []));
  if (seed.oldSchema) delete DB.grammar_points;   // mô phỏng máy chủ chưa chạy schema v7
  const USER = { id: '11111111-1111-4111-8111-111111111111', email: seed.email || 'test@example.com' };
  const nowIso = () => new Date().toISOString();
  const bump = () => { DB.n++; };
  const KEYS = { deck_cards: ['deck_id', 'card_id'], radical_cards: ['radical_id', 'card_id'], user_decompositions: ['character'], cards: ['id'] };
  const keyOf = (t, r) => (KEYS[t] || ['id']).map(k => r[k]).join('|');
  const err = (message, code = 'XX000') => ({ data: null, error: { message, code } });

  class Q {
    constructor(table) { this.t = table; this.op = 'select'; this.filters = []; this.orders = []; this.rng = null; this.sel = false; this.opts = {}; }
    select(cols, opts = {}) { if (this.op === 'select') { this.cols = cols; this.opts = opts; } else this.sel = true; return this; }
    insert(rows) { this.op = 'insert'; this.rows = [].concat(rows); return this; }
    update(patch) { this.op = 'update'; this.patch = patch; return this; }
    upsert(rows, o = {}) { this.op = 'upsert'; this.rows = [].concat(rows); this.o = o; return this; }
    delete() { this.op = 'delete'; return this; }
    eq(c, v) { this.filters.push(r => r[c] === v); return this; }
    in(c, vs) { this.filters.push(r => vs.includes(r[c])); return this; }
    gte(c, v) { this.filters.push(r => r[c] >= v); return this; }
    order(c, o = {}) { this.orders.push([c, o.ascending !== false]); return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
    run() {
      if (DB.fail && DB.fail.table === this.t && DB.fail.op === this.op) return DB.fail.result;
      DB.calls.push([this.op, this.t]);
      const tab = DB[this.t]; if (!tab) return err('relation "' + this.t + '" does not exist', '42P01');
      const match = r => this.filters.every(f => f(r));
      if (this.op === 'select') {
        let rows = tab.filter(match);
        if (this.opts.head) return { data: null, error: null, count: rows.length };
        for (const [c, asc] of [...this.orders].reverse()) rows = [...rows].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
        if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
        return { data: JSON.parse(JSON.stringify(rows)), error: null, count: rows.length };
      }
      if (this.op === 'insert' || this.op === 'upsert') {
        const out = [];
        for (const raw of this.rows) {
          const row = { deleted_at: null, version: 1, created_at: nowIso(), updated_at: nowIso(), user_id: USER.id, ...raw };
          if (this.t === 'cards') Object.assign(row, { srs_interval: 1, srs_ease: 2.5, srs_due_date: null, status: 'new', is_favorite: false, ...raw });
          if (this.t === 'cards' && !row.id) row.id = crypto.randomUUID();
          const k = keyOf(this.t, row), i = tab.findIndex(r => keyOf(this.t, r) === k);
          if (i >= 0) {
            if (this.op === 'insert') return err('duplicate key value violates unique constraint', '23505');
            if (this.o && this.o.ignoreDuplicates) continue;
            tab[i] = { ...tab[i], ...raw, version: (tab[i].version || 1) + 1, updated_at: nowIso() }; out.push(tab[i]);
          } else {
            if (this.t === 'cards' && tab.some(r => !r.deleted_at && r.character === row.character && r.type === row.type && r.id !== row.id) && false) return err('duplicate', '23505');
            tab.push(row); out.push(row);
          }
        }
        bump(); return { data: this.sel || this.op === 'upsert' ? JSON.parse(JSON.stringify(out)) : null, error: null };
      }
      if (this.op === 'update') {
        const hit = tab.filter(match); hit.forEach(r => { Object.assign(r, this.patch, { version: (r.version || 1) + 1, updated_at: nowIso() }); });
        if (hit.length) bump(); return { data: this.sel ? JSON.parse(JSON.stringify(hit)) : null, error: null };
      }
      if (this.op === 'delete') { const keep = tab.filter(r => !match(r)); if (keep.length !== tab.length) bump(); DB[this.t] = keep; return { data: null, error: null }; }
      return err('unsupported ' + this.op);
    }
  }

  // log_study: cập nhật SRS + ghi study_sessions giống hàm SQL (cùng công thức làm tròn .5 về chẵn)
  const half = x => { const f = Math.floor(x), d = x - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : (f % 2 === 0 ? f : f + 1); };
  function logStudy(a) {
    const c = DB.cards.find(r => r.id === a.p_card); if (!c) return err('card not found', 'P0002');
    if (DB.me.status === 'blocked') return err('Tài khoản đang bị khóa', '42501');
    if (DB.study_sessions.some(s => s.id === a.p_id)) return { data: c, error: null };
    const ok = a.p_result === 'correct', iv = c.srs_interval || 1, ez = c.srs_ease || 2.5;
    const ne = ok ? Math.min(ez + 0.1, 2.8) : Math.max(ez - 0.2, 1.3), ni = ok ? Math.min(Math.max(iv + 1, half(iv * ne)), 90) : 1;
    const d = new Date(a.p_today + 'T00:00:00'); d.setDate(d.getDate() + ni);
    const due = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    Object.assign(c, { srs_interval: ni, srs_ease: Math.round(ne * 10) / 10, srs_due_date: due, status: ok ? (c.status === 'new' ? 'learning' : 'known') : (c.status === 'known' ? 'learning' : 'new'), version: c.version + 1 });
    DB.study_sessions.push({ id: a.p_id, card_id: c.id, result: a.p_result, studied_at: a.p_at, user_id: USER.id }); bump();
    return { data: JSON.parse(JSON.stringify(c)), error: null };
  }
  const session = () => ({ access_token: 'fake', refresh_token: 'fake', expires_at: Math.floor(Date.now() / 1000) + 3600, user: USER });
  const RPC = {
    jp_schema_version: () => ({ data: seed.oldSchema ? 6 : 7, error: null }),
    jp_sync_sig: () => ({ data: 'sig-' + DB.n, error: null }),
    jp_me: () => ({ data: [DB.me], error: null }),
    log_study: logStudy,
  };
  window.supabase = {
    createClient() {
      let signedIn = localStorage.getItem('fake-session') !== 'out' && seed.signedIn !== false;
      return {
        auth: {
          async getSession() { return { data: { session: signedIn ? session() : null }, error: null }; },
          async signInWithPassword(c) { if (c.password === 'wrong-password') return { data: null, error: { message: 'Invalid login credentials', code: 'invalid_credentials' } }; signedIn = true; localStorage.removeItem('fake-session'); return { data: { session: session() }, error: null }; },
          async signUp() { return { data: { session: null }, error: null }; },
          async signOut() { signedIn = false; localStorage.setItem('fake-session', 'out'); return { error: null }; },
          async resetPasswordForEmail() { return { data: {}, error: null }; },
          async updateUser() { return { data: { user: USER }, error: null }; },
          async setSession() { return { data: { session: session() }, error: null }; },
        },
        from: t => new Q(t),
        async rpc(name, args) { DB.calls.push(['rpc', name]); const f = RPC[name]; return f ? f(args || {}) : err('function ' + name + ' does not exist', '42883'); },
      };
    },
  };
})();
