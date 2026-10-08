-- ════════════════════════════════════════════════════════════════════════════
-- 日本語 Web — schema Supabase (Postgres) · phiên bản 3 (xử lý xung đột nhiều thiết bị)
-- Chạy: Supabase Dashboard → SQL Editor → New query → dán TOÀN BỘ → Run
-- Dùng được cho cả cài mới LẪN nâng cấp từ bản đầu (an toàn khi chạy lại nhiều lần).
-- Cấu trúc bám sát japanese.db của bản desktop (8 bảng, khoá chính UUID),
-- thêm cột user_id + Row Level Security để mỗi tài khoản chỉ thấy dữ liệu của mình.
--
-- Phần xử lý xung đột (nhiều thiết bị cùng sửa):
--   • cards / decks / radicals có cột `version` do SERVER tăng sau mỗi lần sửa.
--     App gửi "chỉ sửa nếu version vẫn là N" → phát hiện được ai đó vừa sửa trước.
--   • updated_at do SERVER đặt ở mọi lần ghi (không tin đồng hồ điện thoại).
--   • log_study(): ghi 1 lượt ôn + cập nhật lịch SRS NGUYÊN TỬ trên server, nên 2 thiết
--     bị cùng ôn 1 thẻ không ghi đè lên nhau; gửi lại cùng 1 lượt ôn (mất mạng rồi gửi
--     lại) không bị tính 2 lần; lượt ôn cũ hơn lượt gần nhất không phá lịch mới.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Danh mục bộ thẻ ─────────────────────────────────────────────────────────
create table if not exists public.deck_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  icon        text default '🗂️',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ── Bộ thẻ ──────────────────────────────────────────────────────────────────
create table if not exists public.decks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  description  text,
  color        text default '#4A90D9',
  icon         text default '📁',
  category_id  uuid references public.deck_categories(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create unique index if not exists decks_user_name_alive
  on public.decks (user_id, name) where deleted_at is null;

-- ── Thẻ ─────────────────────────────────────────────────────────────────────
create table if not exists public.cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type            text not null check (type in ('kanji','hiragana','katakana','vocab')),
  character       text not null,
  reading_on      text,
  reading_kun     text,
  reading_kana    text,
  reading_hanviet text,
  romaji          text,
  meaning_vi      text not null,
  meaning_en      text,
  example_jp      text,
  example_vi      text,
  stroke_count    integer,
  jlpt_level      text,
  status          text not null default 'new' check (status in ('new','learning','known')),
  is_favorite     boolean not null default false,
  source          text,
  notes           text,
  srs_interval    integer not null default 1,
  srs_ease        double precision not null default 2.5,
  srs_due_date    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists cards_user_created on public.cards (user_id, created_at desc);
create index if not exists cards_user_due     on public.cards (user_id, srs_due_date) where deleted_at is null;

-- ── Thẻ ↔ Bộ thẻ ────────────────────────────────────────────────────────────
create table if not exists public.deck_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  deck_id     uuid not null references public.decks(id)  on delete cascade,
  card_id     uuid not null references public.cards(id)  on delete cascade,
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (deck_id, card_id)
);
create index if not exists deck_cards_user on public.deck_cards (user_id);

-- ── Bộ thủ ──────────────────────────────────────────────────────────────────
create table if not exists public.radicals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  character   text not null,
  name        text,
  color       text default '#4A90D9',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists radicals_user_char_alive
  on public.radicals (user_id, character) where deleted_at is null;

create table if not exists public.radical_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  radical_id  uuid not null references public.radicals(id) on delete cascade,
  card_id     uuid not null references public.cards(id)   on delete cascade,
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (radical_id, card_id)
);
create index if not exists radical_cards_user on public.radical_cards (user_id);

-- ── Tách bộ do người dùng tự định nghĩa ─────────────────────────────────────
create table if not exists public.user_decompositions (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  character   text not null,
  parts       text not null,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, character)
);

-- ── Lịch sử ôn tập ──────────────────────────────────────────────────────────
create table if not exists public.study_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id     uuid not null references public.cards(id) on delete cascade,
  result      text not null check (result in ('correct','incorrect')),
  studied_at  timestamptz not null default now()
);
create index if not exists study_user_time on public.study_sessions (user_id, studied_at desc);
create index if not exists study_card_time on public.study_sessions (card_id, studied_at desc);

-- ════════════ PHIÊN BẢN 2: XỬ LÝ XUNG ĐỘT ════════════════════════════════════

-- Số phiên bản của từng hàng (server tăng sau mỗi lần sửa)
alter table public.cards    add column if not exists version bigint not null default 1;
alter table public.decks    add column if not exists version bigint not null default 1;
alter table public.radicals add column if not exists version bigint not null default 1;

-- Bản đầu dùng kiểu real (float4); đổi sang double precision để phép tính SRS giống hệt
-- bản desktop (Python dùng double). Làm tròn về 1 chữ số thập phân vì ease luôn là bội của 0.1.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cards'
               and column_name = 'srs_ease' and data_type = 'real') then
    alter table public.cards alter column srs_ease type double precision
      using round(srs_ease::numeric, 1)::double precision;
  end if;
end $$;

-- Trigger cho bảng có version: ép version=1 khi tạo, +1 khi sửa; updated_at do server đặt
create or replace function public.touch_versioned() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
  else
    new.version := old.version + 1;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;

-- Trigger cho bảng không có version: chỉ đặt updated_at do server
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cards','decks','radicals']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before insert or update on public.%I
                    for each row execute function public.touch_versioned()', t);
  end loop;
  foreach t in array array['deck_cards','radical_cards','user_decompositions']
  loop
    execute format('drop trigger if exists trg_touch on public.%I', t);
    execute format('create trigger trg_touch before insert or update on public.%I
                    for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── Row Level Security ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['deck_categories','decks','cards','deck_cards','radicals',
                           'radical_cards','user_decompositions','study_sessions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ── Phiên bản schema (app kiểm tra khi khởi động để báo "chưa chạy schema mới") ──
create or replace function public.jp_schema_version() returns integer
language sql stable as $$ select 3 $$;

-- Chữ ký nhẹ của toàn bộ dữ liệu của bạn: app hỏi cái này mỗi ~60 giây thay vì tải lại tất cả.
-- Đổi khi có thêm / xóa / sửa bất kỳ hàng nào (chạy với quyền của người gọi nên RLS chỉ tính dữ liệu của bạn).
create or replace function public.jp_sync_sig() returns text
language sql stable set search_path = public as $$
  select md5(concat_ws('|',
    (select count(*)::text || coalesce(max(updated_at)::text, '') from cards),
    (select count(*)::text || coalesce(max(updated_at)::text, '') from decks),
    (select count(*)::text || coalesce(max(updated_at)::text, '') from radicals),
    (select count(*)::text || coalesce(max(updated_at)::text, '') from deck_cards),
    (select count(*)::text || coalesce(max(updated_at)::text, '') from radical_cards),
    (select count(*)::text || coalesce(max(updated_at)::text, '') from user_decompositions),
    (select count(*)::text || coalesce(max(studied_at)::text, '') from study_sessions),
    (select coalesce(md5(string_agg(id::text || name || coalesce(icon, '') || sort_order::text, ',' order by id)), '') from deck_categories)
  )) $$;

-- ── Ghi 1 lượt ôn + cập nhật lịch SRS, nguyên tử trên server ────────────────
-- Thuật toán y hệt domain/srs.py của bản desktop (SM-2 rút gọn), dùng cùng kiểu số thực
-- double và cùng cách làm tròn (.5 về số chẵn) nên cho đúng kết quả của Python.
--   p_id     : UUID do thiết bị tạo cho lượt ôn này → gửi lại cùng id thì KHÔNG tính lần 2
--   p_at     : thời điểm ôn thật (khi ôn lúc offline, gửi muộn)
--   p_today  : ngày hiện tại theo giờ máy người dùng (server dùng UTC nên không tự biết)
-- Trả về hàng thẻ sau khi cập nhật (hoặc null nếu thẻ không còn).
create or replace function public.log_study(
  p_id uuid, p_card uuid, p_result text,
  p_at timestamptz default now(), p_today date default current_date
) returns public.cards
language plpgsql
set search_path = public
as $$
declare
  c public.cards;
  last_at timestamptz;
  iv int; ez double precision; ne double precision; ni int; ns text;
begin
  if p_result not in ('correct', 'incorrect') then
    raise exception 'p_result phải là correct hoặc incorrect';
  end if;

  select * into c from public.cards where id = p_card for update;   -- khoá hàng: 2 thiết bị xếp hàng lần lượt
  if not found then return null; end if;

  select max(studied_at) into last_at from public.study_sessions where card_id = p_card;

  insert into public.study_sessions (id, card_id, result, studied_at)
  values (p_id, p_card, p_result, p_at)
  on conflict (id) do nothing;
  if not found then return c; end if;                  -- lượt này đã được ghi trước đó (gửi lại)

  if last_at is not null and p_at < last_at then       -- lượt ôn cũ hơn lượt gần nhất: giữ lịch mới
    return c;
  end if;

  iv := coalesce(nullif(c.srs_interval, 0), 1);
  ez := coalesce(nullif(c.srs_ease, 0), 2.5::double precision);

  if p_result = 'correct' then
    ne := least(ez + 0.1::double precision, 2.8::double precision);   -- ease tối đa 2.8
    ni := least(greatest(iv + 1, round(iv * ne)::int), 90);           -- luôn tăng, tối đa 90 ngày
    ns := case when c.status = 'new' then 'learning' else 'known' end;
  else
    ne := greatest(ez - 0.2::double precision, 1.3::double precision);   -- ease tối thiểu 1.3
    ni := 1;
    ns := case when c.status = 'known' then 'learning' else 'new' end;
  end if;

  update public.cards
     set status = ns, srs_interval = ni, srs_ease = ne, srs_due_date = p_today + ni
   where id = p_card
  returning * into c;
  return c;
end $$;

grant execute on function public.log_study(uuid, uuid, text, timestamptz, date) to authenticated;
grant execute on function public.jp_schema_version() to authenticated, anon;
grant execute on function public.jp_sync_sig() to authenticated;
revoke execute on function public.log_study(uuid, uuid, text, timestamptz, date) from public, anon;
revoke execute on function public.jp_sync_sig() from public, anon;

-- Báo cho API nạp lại cấu trúc mới ngay (cột version, hàm log_study)
notify pgrst, 'reload schema';
