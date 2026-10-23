/* backup.js — Sao lưu toàn bộ (1 file .json) và khôi phục từ file đó.
   Sao lưu: đọc MỚI từ máy chủ mọi bảng của tài khoản (kể cả thẻ trong thùng rác, toàn bộ lịch sử ôn tập).
   Khôi phục: chỉ THÊM phần còn thiếu, không ghi đè dữ liệu đang có — nên an toàn khi bấm nhầm hoặc khôi phục 2 lần. */
'use strict';
const BACKUP_FORMAT = 1;
const BACKUP_TABLES = ['deck_categories', 'decks', 'cards', 'deck_cards', 'radicals', 'radical_cards', 'user_decompositions', 'grammar_points', 'conj_forms', 'conj_verbs', 'conj_cells', 'translations', 'study_sessions'];
const BACKUP_MAX_BYTES = 200 * 1024 * 1024;
const BACKUP_STALE_DAYS = 30;

function buildBackup(data, when = new Date()) {
  const out = {}; const counts = {};
  for (const t of BACKUP_TABLES) { out[t] = Array.isArray(data[t]) ? data[t] : []; counts[t] = out[t].length; }
  return { app: 'jpdic-web', format: BACKUP_FORMAT, exported_at: when.toISOString(), counts, data: out };
}

// Kiểm tra file người dùng chọn có đúng là bản sao lưu của app không. Trả { ok, error, counts }.
function validateBackup(b) {
  const bad = error => ({ ok: false, error });
  if (!b || typeof b !== 'object' || b.app !== 'jpdic-web' || !b.data || typeof b.data !== 'object') return bad('Đây không phải file sao lưu của ứng dụng này.');
  if (b.format !== BACKUP_FORMAT) return bad('File sao lưu thuộc phiên bản không được hỗ trợ.');
  const counts = {};
  for (const t of BACKUP_TABLES) {
    const rows = b.data[t];
    if (rows === undefined) { counts[t] = 0; continue; }
    if (!Array.isArray(rows)) return bad(`Bảng "${t}" trong file bị hỏng.`);
    for (const r of rows) if (!r || typeof r !== 'object' || Array.isArray(r)) return bad(`Bảng "${t}" có dòng không hợp lệ.`);
    if (t !== 'user_decompositions' && t !== 'conj_cells' && rows.some(r => typeof r.id !== 'string' || !r.id)) return bad(`Bảng "${t}" có dòng thiếu id.`);
    counts[t] = rows.length;
  }
  return { ok: true, counts };
}

// Lập kế hoạch khôi phục: trả { tables:[[tên, dòng[], onConflict]], skipped:{...} } theo đúng thứ tự khóa ngoại.
// `cur` là dữ liệu đang có: { cats, decks, cards, deckCards, radicals, radCards }.
function planRestore(b, cur) {
  const D = t => (b.data[t] || []);
  const clean = r => { const o = { ...r }; delete o.user_id; delete o.version; delete o.updated_at; return o; };
  const live = r => !r.deleted_at;
  const skipped = {};
  const skip = (t, n = 1) => { skipped[t] = (skipped[t] || 0) + n; };

  // Tên/ký tự trùng với dữ liệu đang có (cùng chữ, khác id) → dùng luôn bản đang có, tránh vi phạm ràng buộc duy nhất
  const catMap = new Map(), deckMap = new Map(), radMap = new Map();
  const catByName = new Map((cur.cats || []).map(c => [c.name, c.id]));
  const deckByName = new Map((cur.decks || []).filter(live).map(d => [d.name, d.id]));
  const radByChar = new Map((cur.radicals || []).filter(live).map(r => [r.character, r.id]));

  const cats = [];
  for (const c of D('deck_categories')) {
    const hit = catByName.get(c.name);
    if (hit && hit !== c.id) { catMap.set(c.id, hit); skip('deck_categories'); continue; }
    cats.push(clean(c));
  }
  const decks = [];
  for (const d of D('decks')) {
    const hit = live(d) ? deckByName.get(d.name) : null;
    if (hit && hit !== d.id) { deckMap.set(d.id, hit); skip('decks'); continue; }
    const o = clean(d); if (o.category_id && catMap.has(o.category_id)) o.category_id = catMap.get(o.category_id); decks.push(o);
  }
  const rads = [];
  for (const r of D('radicals')) {
    const hit = live(r) ? radByChar.get(r.character) : null;
    if (hit && hit !== r.id) { radMap.set(r.id, hit); skip('radicals'); continue; }
    rads.push(clean(r));
  }
  const cards = D('cards').map(clean);

  const cardIds = new Set([...(cur.cards || []).map(c => c.id), ...cards.map(c => c.id)]);
  const deckIds = new Set([...(cur.decks || []).map(d => d.id), ...decks.map(d => d.id)]);
  const radIds = new Set([...(cur.radicals || []).map(d => d.id), ...rads.map(d => d.id)]);
  const link = (rows, key, parentMap, parentIds, curRows, curKey) => {
    const have = new Set(curRows.map(r => r[curKey] + '|' + r.card_id)); const out = [];
    for (const r of rows) {
      const o = clean(r); o[key] = parentMap.get(o[key]) || o[key];
      const k = o[key] + '|' + o.card_id;
      if (!parentIds.has(o[key]) || !cardIds.has(o.card_id) || have.has(k)) { skip('links'); continue; }
      have.add(k); out.push(o);
    }
    return out;
  };
  const dcs = link(D('deck_cards'), 'deck_id', deckMap, deckIds, cur.deckCards || [], 'deck_id');
  const rcs = link(D('radical_cards'), 'radical_id', radMap, radIds, cur.radCards || [], 'radical_id');
  const sess = D('study_sessions').map(clean).filter(s => cardIds.has(s.card_id) || (skip('study_sessions'), false));

  const cfIds = new Set([...(cur.conjForms || []).map(x => x.id), ...D('conj_forms').map(x => x.id)]);
  const cvIds = new Set([...(cur.conjVerbs || []).map(x => x.id), ...D('conj_verbs').map(x => x.id)]);
  const cells = D('conj_cells').map(clean).filter(c => (cfIds.has(c.form_id) && cvIds.has(c.verb_id)) || (skip('conj_cells'), false));

  return { tables: [
    ['deck_categories', cats, 'id'], ['decks', decks, 'id'], ['cards', cards, 'id'], ['deck_cards', dcs, 'id'],
    ['radicals', rads, 'id'], ['radical_cards', rcs, 'id'], ['user_decompositions', D('user_decompositions').map(clean), 'user_id,character'],
    ['grammar_points', D('grammar_points').map(clean), 'id'],
    ['conj_forms', D('conj_forms').map(clean), 'id'], ['conj_verbs', D('conj_verbs').map(clean), 'id'], ['conj_cells', cells, 'verb_id,form_id'], ['translations', D('translations').map(clean), 'id'], ['study_sessions', sess, 'id'],
  ], skipped };
}

function backupAgeDays(now = Date.now()) {
  const t = LS.get('jp_last_backup', null); if (!t) return null;
  const ms = Date.parse(t); return isNaN(ms) ? null : Math.floor((now - ms) / 864e5);
}
function backupStale(liveCount, now = Date.now()) {
  if (liveCount < 20) return false;
  const sn = LS.get('jp_backup_snooze', null); if (sn && Date.parse(sn) > now) return false;
  const a = backupAgeDays(now); return a === null || a >= BACKUP_STALE_DAYS;
}
function backupLabel() {
  const a = backupAgeDays();
  return a === null ? 'Chưa sao lưu lần nào' : a === 0 ? 'Lần cuối: hôm nay' : `Lần cuối: ${a} ngày trước`;
}

async function fetchEverything() {
  const data = {};
  for (const t of BACKUP_TABLES) {
    try {
      data[t] = t === 'user_decompositions' ? await fetchAll(t, q => q, 'character')
        : t === 'conj_cells' ? await fetchAll(t, q => q.order('verb_id'), 'form_id')
        : t === 'study_sessions' ? await fetchAll(t, q => q, 'id', 'id,card_id,result,studied_at')
        : await fetchAll(t);
    } catch (e) { if (t === 'grammar_points' || t.startsWith('conj_') || t === 'translations') data[t] = []; else throw e; }
  }
  return data;
}

ACT.backupTools = () => {
  const s = openSheet(`<h2>Sao lưu & khôi phục</h2><p class="small mute" style="margin:0 0 10px">${esc(backupLabel())}</p><div class="list">
    <button class="item" data-act="backupExport"><span class="grow"><span class="t">Sao lưu toàn bộ</span><br><span class="s">Thẻ, bộ thẻ, danh mục, bộ thủ, ngữ pháp, bảng chia động từ, bản dịch, lịch sử ôn → 1 file .json</span></span></button>
    <label class="item" style="cursor:pointer"><span class="grow"><span class="t">Khôi phục từ file sao lưu…</span><br><span class="s">Chỉ thêm phần còn thiếu, không ghi đè dữ liệu đang có</span></span><input type="file" accept=".json,application/json" id="bkin" hidden></label></div>`);
  s.$('#bkin').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || s.busy) return;
    s.busy = true;
    if (f.size > BACKUP_MAX_BYTES) { toast('File quá lớn để là bản sao lưu', true); s.busy = false; return; }
    let b; try { b = JSON.parse(await f.text()); } catch { toast('Không đọc được file (không phải JSON)', true); s.busy = false; return; }
    const v = validateBackup(b); if (!v.ok) { toast(v.error, true); s.busy = false; return; }
    s.close();
    const c = v.counts;
    if (!await confirmBox(`Khôi phục ${c.cards} thẻ, ${c.decks} bộ thẻ, ${c.grammar_points} mẫu ngữ pháp, ${c.conj_verbs} động từ chia, ${c.translations} bản dịch, ${c.study_sessions} lượt ôn? Dữ liệu đang có được giữ nguyên.`, 'Khôi phục')) return;
    await guard(async () => {
      await flushQueue();
      const plan = planRestore(b, { cats: S.cats, decks: S.decks, cards: S.cards, deckCards: S.deckCards, radicals: S.radicals, radCards: S.radCards, conjForms: S.conj_forms, conjVerbs: S.conj_verbs });
      let n = 0;
      for (const [t, rows, conflict] of plan.tables) {
        for (let i = 0; i < rows.length; i += 200) {
          await must(sb.from(t).upsert(rows.slice(i, i + 200), { onConflict: conflict, ignoreDuplicates: true }));
          n += Math.min(200, rows.length - i);
        }
      }
      await loadAll();
    }, 'Đã khôi phục dữ liệu từ file sao lưu'); render();
  };
};
ACT.backupExport = async () => {
  await guard(async () => {
    await flushQueue();
    const b = buildBackup(await fetchEverything());
    download(`jpdic_backup_${localDate()}.json`, JSON.stringify(b), 'application/json');
    LS.set('jp_last_backup', b.exported_at);
  }, 'Đã tạo file sao lưu'); render();
};
ACT.backupSnooze = () => { LS.set('jp_backup_snooze', new Date(Date.now() + 7 * 864e5).toISOString()); render(); };
