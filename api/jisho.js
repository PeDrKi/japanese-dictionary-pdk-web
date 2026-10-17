// Vercel Serverless Function — chuyển tiếp truy vấn tới Jisho (Jisho không bật CORS cho trình duyệt).
// Gọi: /api/jisho?keyword=雨
// Giới hạn tốc độ theo IP (trong bộ nhớ của từng instance → chỉ là lớp chặn cơ bản, không phải bảo đảm tuyệt đối;
// muốn chặn chắc hơn hãy bật Rate Limiting / WAF của Vercel cho đường dẫn /api/*).
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 30, hits = new Map();
function limited(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);   // dọn bộ nhớ
  return h.length > MAX_PER_WINDOW;
}
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'method not allowed' }); }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (limited(ip)) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'quá nhiều yêu cầu, hãy thử lại sau 1 phút' }); }
  const raw = Array.isArray(req.query.keyword) ? req.query.keyword[0] : req.query.keyword;
  const keyword = String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);   // bỏ ký tự điều khiển, tối đa 100 ký tự
  if (!keyword) return res.status(400).json({ error: 'missing keyword' });
  try {
    const r = await fetch('https://jisho.org/api/v1/search/words?keyword=' + encodeURIComponent(keyword), {
      headers: { 'User-Agent': 'JapaneseStudyApp/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(502).json({ error: 'jisho ' + r.status });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(502).json({ error: 'không gọi được Jisho' });
  }
}
