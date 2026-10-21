// Dữ liệu mẫu cố định cho các bài test giao diện
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const base = { deleted_at: null, version: 1, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', user_id: '11111111-1111-4111-8111-111111111111', srs_interval: 1, srs_ease: 2.5, is_favorite: false, status: 'new', srs_due_date: null };
const card = (n, o) => ({ ...base, id: `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`, ...o });
export const SEED = {
  cards: [
    card(1, { type: 'vocab', character: '食べる', meaning_vi: 'ăn', reading_kana: 'たべる', romaji: 'taberu', jlpt_level: 'N5', pos: 'verb2', status: 'learning', study_count: 5, is_favorite: true, srs_due_date: day(-2) }),
    card(2, { type: 'vocab', character: '水', meaning_vi: 'nước', reading_kana: 'みず', romaji: 'mizu', jlpt_level: 'N5', pos: 'noun', srs_due_date: day(5) }),
    card(3, { type: 'kanji', character: '日', meaning_vi: 'ngày, mặt trời', reading_on: 'ニチ', reading_kun: 'ひ', status: 'known', study_count: 25, srs_due_date: day(0) }),
    card(4, { type: 'hiragana', character: 'あ', meaning_vi: 'a' }),
  ],
  decks: [{ ...base, id: 'd0000000-0000-4000-8000-000000000001', name: 'Từ vựng N5', icon: '📘', color: '#4A90D9', category_id: null, description: '' }],
  deck_cards: [{ ...base, deck_id: 'd0000000-0000-4000-8000-000000000001', card_id: 'c0000000-0000-4000-8000-000000000001' }],
};
export const JISHO_CAT = { data: [{ japanese: [{ word: '猫', reading: 'ねこ' }], senses: [{ english_definitions: ['cat'], parts_of_speech: ['Noun'] }], jlpt: ['jlpt-n5'], is_common: true }] };
export const MYMEMORY_CAT = { responseStatus: 200, responseData: { translatedText: 'con mèo' } };
