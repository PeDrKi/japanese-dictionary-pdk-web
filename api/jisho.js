// Vercel Serverless Function — chuyển tiếp truy vấn tới Jisho (Jisho không bật CORS cho trình duyệt).
// Gọi: /api/jisho?keyword=雨
export default async function handler(req, res) {
  const keyword = String(req.query.keyword || '').trim().slice(0, 100);
  if (!keyword) return res.status(400).json({ error: 'missing keyword' });
  try {
    const r = await fetch('https://jisho.org/api/v1/search/words?keyword=' + encodeURIComponent(keyword), {
      headers: { 'User-Agent': 'JapaneseStudyApp/1.0' },
    });
    if (!r.ok) return res.status(502).json({ error: 'jisho ' + r.status });
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(502).json({ error: String(e) });
  }
}
