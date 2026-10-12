// Nạp các file js/*.js của app vào một "trình duyệt giả" (vm của Node) để test logic thuần, không cần DOM thật / mạng / Supabase.
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const noop = () => {};
function fakeEl() {
  return { style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, addEventListener: noop,
    setAttribute: noop, appendChild: noop, remove: noop, querySelector: () => null, querySelectorAll: () => [], focus: noop, click: noop };
}

export function loadApp(files = ['core'], extra = {}) {
  const store = new Map();
  const win = {
    JP_CONFIG: { url: '', key: '' }, addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }),
    innerWidth: 1280, innerHeight: 800, ...extra,
  };
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, URL, Blob, TextEncoder, TextDecoder, Intl, Date, Math, JSON, Map, Set, WeakMap, Promise,
    crypto: globalThis.crypto, fetch: async () => { throw new Error('fetch không có trong test đơn vị'); }, AbortSignal,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() },
    navigator: { onLine: true, userAgent: 'node-test' }, location: { hash: '', href: 'http://localhost/', reload: noop }, history: { pushState: noop, back: noop, state: null },
    document: { readyState: 'complete', addEventListener: noop, createElement: fakeEl, querySelector: () => null, querySelectorAll: () => [], body: fakeEl(), documentElement: fakeEl(), visibilityState: 'visible', activeElement: null, contains: () => false },
    ...win,
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of files) {
    const file = path.join(ROOT, 'js', f + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  // lấy giá trị/hàm khai báo bằng const/function ở cấp cao nhất của các file đã nạp
  return { ctx, run: expr => vm.runInContext(expr, ctx), get: name => vm.runInContext(name, ctx) };
}
