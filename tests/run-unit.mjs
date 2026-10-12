// Chạy mọi file tests/unit/*.test.mjs bằng bộ chạy test có sẵn của Node (không cần cài gói nào). Dùng được trên Windows/macOS/Linux.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'unit');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.mjs')).map(f => path.join(dir, f));
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
