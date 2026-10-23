/* Service worker: mở nhanh + chạy được khi mất mạng (giao diện); dữ liệu luôn lấy từ Supabase. */
const VERSION = 'jpdic-v3.31';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'vendor/supabase.js', 'vendor/sql-wasm.js', 'vendor/sql-wasm.wasm', 'data/kanji_ids.tsv', 'js/config.js', 'js/core.js', 'js/data.js', 'js/conflict.js', 'js/ui.js', 'js/views.js', 'js/study.js', 'js/tools.js', 'js/backup.js', 'js/grammar.js', 'js/conj.js', 'js/trans.js', 'js/admin.js', 'js/ime.js', 'js/keys.js', 'js/main.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const staticHost = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (url.pathname.startsWith('/api/') || (!sameOrigin && !staticHost)) return; // Supabase, API, dịch thuật… luôn đi thẳng
  const isStatic = /^\/(vendor|icons|data)\//.test(url.pathname) || !sameOrigin;   // ít đổi → cache trước cho nhanh
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: false });
    if (isStatic && hit) return hit;
    // Mã giao diện (html/js/css): ưu tiên bản MỚI từ mạng (tối đa 4 giây) để các tệp luôn cùng một phiên bản; mất mạng/chậm → dùng cache
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 4000);
    try {
      const res = await fetch(req, { signal: ctl.signal });
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    } catch { if (hit) return hit; throw new Error('offline'); }
    finally { clearTimeout(timer); }
  }));
});
