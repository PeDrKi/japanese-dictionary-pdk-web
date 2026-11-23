// Chạy các bài test giao diện (Playwright + Supabase giả). Không cần backend, không cần mạng.
// Cài một lần:  npm install   và   npx playwright install chromium     Chạy:  npm run test:e2e
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm', '.tsv': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname); const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port;
const FAKE = fs.readFileSync(path.join(here, 'fake-supabase.js'), 'utf8');

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const results = []; let failed = 0;

// Mỗi bài test nhận helper { page, check, open } — open(seed) mở app với dữ liệu giả ban đầu.
// Mỗi bài chạy tối đa 2 lần: máy chậm (CI) hay làm trễ vài thao tác chờ cố định; lần 2 vẫn lỗi mới tính là lỗi thật.
async function session(seed, fn, opts = {}) {
  const first = await attempt(seed, fn, opts);
  const out = first.fails ? await attempt(seed, fn, opts) : first;
  if (first.fails && !out.fails) console.log('(thử lại lần 2 → đạt: ' + (opts.name || '') + ')');
  const final = first.fails && out.fails ? out : out;
  for (const l of final.lines) console.log(l);
  for (const r of final.res) results.push(r);
  failed += final.fails;
}
async function attempt(seed, fn, opts = {}) {
  const lines = [], res = []; let fails = 0;
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: opts.viewport || { width: 1280, height: 800 }, reducedMotion: (opts.motion || process.env.MOTION) ? 'no-preference' : 'reduce' });   // mặc định tắt hiệu ứng cho test ổn định; opts.motion bật lại để thử hiệu ứng
  await context.route('**/vendor/supabase.js', r => r.fulfill({ contentType: 'text/javascript', body: `window.__SEED = ${JSON.stringify(seed || {})};\n` + FAKE }));
  await context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());                       // test không cần mạng
  // test không phụ thuộc cấu hình thật trong js/config.js: mặc định phục vụ bản trống (opts.baked để thử chế độ đã nhúng sẵn)
  if (!opts.baked) await context.route('**/js/config.js', r => r.fulfill({ contentType: 'text/javascript', body: 'window.JP_CONFIG = { url: "", key: "" };' }));
  await context.route('**/api/jisho*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(opts.jisho || { data: [] }) }));
  await context.route('https://api.mymemory.translated.net/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(opts.mymemory || { responseStatus: 403, responseData: { translatedText: '' } }) }));
  await context.route(/^https?:\/\/fake\.supabase\.test\/auth\/v1\/settings/, r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, status: r.request().headers()['apikey'] === 'anon' ? 200 : 401, body: '{}' }));
  if (!opts.noCfg) await context.addInitScript(() => { if (!localStorage.getItem('jp_cfg')) localStorage.setItem('jp_cfg', JSON.stringify({ url: 'http://fake.supabase.test', key: 'anon' })); });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const check = (name, cond, extra = '') => { res.push([name, !!cond]); if (!cond) fails++; lines.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + extra)); };
  try { await page.goto(BASE + '/index.html'); await fn({ page, check, errors, db: () => page.evaluate(() => window.__DB), wait: ms => page.waitForTimeout(ms) }); }
  catch (e) { fails++; lines.push('FAIL (lỗi test) ' + (opts.name || '') + ': ' + e.stack.split('\n').slice(0,3).join(' / ')); }
  await context.close();
  return { lines, res, fails };
}

const files = fs.readdirSync(here).filter(f => f.endsWith('.spec.mjs')).filter(f => !process.argv[2] || process.argv[2].split(',').some(k => f.includes(k))).sort();
for (const f of files) { console.log('\n# ' + f); const mod = await import(pathToFileURL(path.join(here, f)).href); await mod.default({ session }); }
await browser.close(); server.close();
console.log(`\n${results.length - failed} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
