/* ime.js — gõ tiếng Nhật ngay trong ô nhập: gõ romaji → ra hiragana / katakana.
   Phím tắt Ctrl+`: Tắt → あ (hiragana) → ア (katakana) → Tắt. Cũng bấm được vào nút nhỏ hiện cạnh ô đang gõ.
   Lưu ý: đây là bộ gõ kana đơn giản, KHÔNG đổi sang kanji; muốn kanji hãy dùng bàn phím tiếng Nhật của hệ điều hành. */
'use strict';
const IME = (() => {
  const T = {};
  const add = (kana, ...romaji) => romaji.forEach(r => { T[r] = kana; });
  add('あ', 'a'); add('い', 'i', 'yi'); add('う', 'u', 'wu'); add('え', 'e'); add('お', 'o');
  add('か', 'ka'); add('き', 'ki'); add('く', 'ku'); add('け', 'ke'); add('こ', 'ko');
  add('さ', 'sa'); add('し', 'si', 'shi'); add('す', 'su'); add('せ', 'se'); add('そ', 'so');
  add('た', 'ta'); add('ち', 'ti', 'chi'); add('つ', 'tu', 'tsu'); add('て', 'te'); add('と', 'to');
  add('な', 'na'); add('に', 'ni'); add('ぬ', 'nu'); add('ね', 'ne'); add('の', 'no');
  add('は', 'ha'); add('ひ', 'hi'); add('ふ', 'hu', 'fu'); add('へ', 'he'); add('ほ', 'ho');
  add('ま', 'ma'); add('み', 'mi'); add('む', 'mu'); add('め', 'me'); add('も', 'mo');
  add('や', 'ya'); add('ゆ', 'yu'); add('よ', 'yo');
  add('ら', 'ra'); add('り', 'ri'); add('る', 'ru'); add('れ', 're'); add('ろ', 'ro');
  add('わ', 'wa'); add('を', 'wo'); add('ゐ', 'wi'); add('ゑ', 'we');
  add('が', 'ga'); add('ぎ', 'gi'); add('ぐ', 'gu'); add('げ', 'ge'); add('ご', 'go');
  add('ざ', 'za'); add('じ', 'zi', 'ji'); add('ず', 'zu'); add('ぜ', 'ze'); add('ぞ', 'zo');
  add('だ', 'da'); add('ぢ', 'di'); add('づ', 'du'); add('で', 'de'); add('ど', 'do');
  add('ば', 'ba'); add('び', 'bi'); add('ぶ', 'bu'); add('べ', 'be'); add('ぼ', 'bo');
  add('ぱ', 'pa'); add('ぴ', 'pi'); add('ぷ', 'pu'); add('ぺ', 'pe'); add('ぽ', 'po');
  add('ゔ', 'vu'); add('ふぁ', 'fa'); add('ふぃ', 'fi'); add('ふぇ', 'fe'); add('ふぉ', 'fo');
  add('ぁ', 'xa', 'la'); add('ぃ', 'xi', 'li'); add('ぅ', 'xu', 'lu'); add('ぇ', 'xe', 'le'); add('ぉ', 'xo', 'lo');
  add('ゃ', 'xya', 'lya'); add('ゅ', 'xyu', 'lyu'); add('ょ', 'xyo', 'lyo'); add('っ', 'xtu', 'xtsu', 'ltu'); add('ゎ', 'xwa');
  // âm ghép: ky, sh, ch, ...
  const Y = { k: ['き', 'ky'], g: ['ぎ', 'gy'], s: ['し', 'sy'], z: ['じ', 'zy'], t: ['ち', 'ty'], d: ['ぢ', 'dy'], n: ['に', 'ny'], h: ['ひ', 'hy'], b: ['び', 'by'], p: ['ぴ', 'py'], m: ['み', 'my'], r: ['り', 'ry'] };
  for (const k in Y) { const [base, pre] = Y[k]; add(base + 'ゃ', pre + 'a'); add(base + 'ゅ', pre + 'u'); add(base + 'ょ', pre + 'o'); add(base + 'ぇ', pre + 'e'); }
  add('しゃ', 'sha'); add('しゅ', 'shu'); add('しょ', 'sho'); add('しぇ', 'she');
  add('ちゃ', 'cha'); add('ちゅ', 'chu'); add('ちょ', 'cho'); add('ちぇ', 'che');
  add('じゃ', 'ja'); add('じゅ', 'ju'); add('じょ', 'jo'); add('じぇ', 'je');
  add('てぃ', 'thi'); add('でぃ', 'dhi'); add('とぅ', 'twu'); add('どぅ', 'dwu');
  add('ん', "n'", 'nn'); add('ー', '-'); add('、', ','); add('。', '.'); add('「', '['); add('」', ']');

  const DOUBLE = /[kstcpfhmrgzdbjwyvl]/;
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  let mode = 0;   // 0 tắt, 1 hiragana, 2 katakana

  // Nhận phần chữ đứng trước con trỏ, trả phần đã đổi (hoặc null nếu không có gì để đổi).
  function convertTail(before, kata) {
    const lo = before.toLowerCase(), put = k => (kata ? toKata(k) : k);
    const prev = before.slice(-1);
    // dấu câu chỉ đổi khi không phải số thập phân "1.5" / "1,5"
    for (const n of [3, 2, 1]) {                       // khớp dài nhất: shi, kya, ka ...
      const tail = lo.slice(-n);
      if (tail.length < n) continue;
      if (/^[,.]$/.test(tail) && /\d/.test(before.slice(-2, -1))) return null;
      if (T[tail] !== undefined && !(tail.length === 1 && !/[aiueo\-,.\[\]]/.test(tail))) {
        return before.slice(0, before.length - n) + put(T[tail]);
      }
    }
    if (lo.slice(-3) === 'tch') return before.slice(0, -3) + put('っ') + before.slice(-2);          // matcha
    if (/n[bcdfghjklmpqrstvwxz]$/.test(lo)) return before.slice(0, -2) + put('ん') + before.slice(-1);   // kanta → かんた (n + phụ âm)
    const l2 = lo.slice(-2);
    if (l2.length === 2 && l2[0] === l2[1] && DOUBLE.test(l2[0])) return before.slice(0, -2) + put('っ') + before.slice(-1);   // kk → っk
    void prev; return null;
  }

  const eligible = el => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|)$/.test(el.getAttribute('type') || '')))
    && !el.dataset.noime && !/^(url|key|email|password)$/.test(el.name || '') && !el.readOnly && !el.disabled;

  const put = k => (mode === 2 ? toKata(k) : k);
  function onInput(e) {
    if (!mode || e.isComposing || e.inputType !== 'insertText' || !e.data || e.data.length !== 1) return;
    const el = e.target; if (!eligible(el)) return;
    const pos = el.selectionStart; if (pos == null || pos !== el.selectionEnd) return;
    const ch = e.data, c = ch.toLowerCase(); let before = el.value.slice(0, pos);
    const nnEnd = el.__nnEnd; el.__nnEnd = -1;
    // "nn" đã thành ん, nhưng "nni" nghĩa là ん + に (như bộ gõ thật)
    if (nnEnd === pos - 1 && /[aiueoy]/.test(c)) before = before.slice(0, -1) + (c === 'y' ? 'ny' : put(T['n' + c]));
    else {
      const out = convertTail(before, mode === 2);
      if (out !== null) { if (/n{2}$/i.test(before) && out.endsWith(put('ん'))) el.__nnEnd = out.length; before = out; }
    }
    if (before === el.value.slice(0, pos)) return;
    el.value = before + el.value.slice(pos);
    el.setSelectionRange(before.length, before.length);     // listener ở document (capture) chạy trước listener của app → app thấy giá trị đã đổi
    if (el.__nnEnd !== -1 && el.__nnEnd !== before.length) el.__nnEnd = -1;
  }

  let pill = null, cur = null;
  const label = () => (mode === 0 ? 'A' : mode === 1 ? 'あ' : 'ア');
  const title = () => 'Gõ tiếng Nhật: ' + (mode === 0 ? 'đang tắt' : mode === 1 ? 'hiragana' : 'katakana') + ' (Ctrl+` để đổi)';
  function place() {
    if (!pill) return;
    if (!cur || !document.contains(cur)) { pill.hidden = true; return; }
    const r = cur.getBoundingClientRect(), w = 34;
    pill.hidden = false; pill.textContent = label(); pill.title = title(); pill.setAttribute('aria-label', title());
    pill.dataset.on = mode ? '1' : '0';
    pill.style.left = Math.max(4, Math.min(innerWidth - w - 4, r.right - w)) + 'px';
    pill.style.top = Math.max(4, r.top - 30) + 'px';
  }
  function cycle(to) {
    mode = to === undefined ? (mode + 1) % 3 : to;
    place();
    if (typeof toast === 'function') toast(mode === 0 ? 'Đã tắt gõ tiếng Nhật' : mode === 1 ? 'Gõ tiếng Nhật: hiragana (あ) — gõ romaji, vd taberu → たべる' : 'Gõ tiếng Nhật: katakana (ア) — vd kohi- → コヒー');
    const s = document.getElementById('imestate'); if (s) s.textContent = describe();
    syncSide();
  }
  // Chỉ báo trạng thái ở cuối thanh bên (màn hình rộng): A = tắt, あ = hiragana, ア = katakana; bấm để đổi
  const side = () => `<span class="g jp">${label()}</span><span class="l">${mode === 0 ? 'Gõ JP: tắt' : mode === 1 ? 'Hiragana' : 'Katakana'}</span>`;
  function syncSide() { const b = document.getElementById('imeside'); if (!b) return; b.innerHTML = side(); b.dataset.on = mode ? '1' : '0'; b.title = title(); b.setAttribute('aria-label', title()); }
  const describe = () => mode === 0 ? 'Đang tắt' : mode === 1 ? 'Hiragana あ' : 'Katakana ア';

  function init() {
    pill = document.createElement('button'); pill.type = 'button'; pill.className = 'imepill jp'; pill.hidden = true; pill.tabIndex = -1;
    document.body.appendChild(pill);
    pill.addEventListener('pointerdown', e => { e.preventDefault(); });         // giữ nguyên ô đang gõ (không mất focus)
    pill.addEventListener('click', e => { e.preventDefault(); cycle(); });
    document.addEventListener('input', onInput, true);
    document.addEventListener('focusin', e => { cur = eligible(e.target) ? e.target : null; place(); });
    document.addEventListener('focusout', () => { setTimeout(() => { if (!eligible(document.activeElement)) { cur = null; place(); } }, 0); });
    addEventListener('resize', place); document.addEventListener('scroll', place, true);
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && e.code === 'Backquote') { e.preventDefault(); e.stopPropagation(); cycle(); }
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { cycle, describe, convertTail, side, syncSide, get mode() { return mode; } };
})();
