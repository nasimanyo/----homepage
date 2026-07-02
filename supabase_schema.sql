-- ============================================================
-- 幼馴染アプリ Supabase スキーマ
-- Supabase の SQL Editor に貼り付けて実行してください
-- ============================================================

-- ① プロフィール（Supabase Auth の users と連動）
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  points int not null default 0,
  last_login_bonus_date date,
  last_roulette_date date,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 既存DB向け: ポイント列が無い場合に追加
alter table profiles add column if not exists points int not null default 0;
alter table profiles add column if not exists last_login_bonus_date date;
alter table profiles add column if not exists last_roulette_date date;

-- ② お知らせ（ホーム上部フィード）
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  title text not null,
  body text,
  kind text not null default 'info',  -- 'info' | 'poll_started' | 'event'
  ref_id uuid,                         -- polls.id や events.id への参照
  created_at timestamptz not null default now()
);

-- ③ 投票（調整さん風）
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open',   -- 'open' | 'closed'
  decided_at date,                        -- 決定した日付
  created_at timestamptz not null default now()
);

-- ④ 投票の選択肢（候補日）
create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  candidate_date date not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ⑤ 投票結果
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references poll_options(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  answer text not null default 'ok',  -- 'ok' | 'ng' | 'maybe'
  created_at timestamptz not null default now(),
  unique(option_id, voter_id)
);

-- ⑥ 情報メモ
create table if not exists info_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  title text not null,
  body text,
  kind text not null default 'memo',  -- 'memo' | 'place' | 'link'
  url text,
  created_at timestamptz not null default now()
);

-- ⑦ 運営への問い合わせ
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  subject text not null,
  message text not null,
  contact text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table profiles enable row level security;
alter table announcements enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table votes enable row level security;
alter table info_posts enable row level security;
alter table contact_messages enable row level security;

-- profiles: 誰でも読める、自分だけ更新
drop policy if exists profiles_select on profiles;
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- announcements: 誰でも読める、ログイン済みは投稿
drop policy if exists announcements_select on announcements;
drop policy if exists announcements_insert on announcements;
drop policy if exists announcements_delete on announcements;
create policy "announcements_select" on announcements for select using (true);
create policy "announcements_insert" on announcements for insert with check (auth.uid() is not null);
create policy "announcements_delete" on announcements for delete using (
  auth.uid() = author_id or exists(select 1 from profiles where id=auth.uid() and is_admin)
);

-- polls
drop policy if exists polls_select on polls;
drop policy if exists polls_insert on polls;
drop policy if exists polls_update on polls;
create policy "polls_select" on polls for select using (true);
create policy "polls_insert" on polls for insert with check (
  exists(select 1 from profiles where id=auth.uid() and is_admin)
);
create policy "polls_update" on polls for update using (
  exists(select 1 from profiles where id=auth.uid() and is_admin)
);

-- poll_options
drop policy if exists poll_options_select on poll_options;
drop policy if exists poll_options_insert on poll_options;
drop policy if exists poll_options_delete on poll_options;
create policy "poll_options_select" on poll_options for select using (true);
create policy "poll_options_insert" on poll_options for insert with check (
  exists(select 1 from profiles where id=auth.uid() and is_admin)
);
create policy "poll_options_delete" on poll_options for delete using (
  exists(select 1 from profiles where id=auth.uid() and is_admin)
);

-- votes: 誰でも読める、自分の票だけ操作
drop policy if exists votes_select on votes;
drop policy if exists votes_insert on votes;
drop policy if exists votes_update on votes;
drop policy if exists votes_delete on votes;
create policy "votes_select" on votes for select using (true);
create policy "votes_insert" on votes for insert with check (auth.uid() = voter_id);
create policy "votes_update" on votes for update using (auth.uid() = voter_id);
create policy "votes_delete" on votes for delete using (auth.uid() = voter_id);

-- info_posts: 誰でも読める、ログイン済みは投稿
drop policy if exists info_select on info_posts;
drop policy if exists info_insert on info_posts;
drop policy if exists info_delete on info_posts;
create policy "info_select" on info_posts for select using (true);
create policy "info_insert" on info_posts for insert with check (auth.uid() is not null);
create policy "info_delete" on info_posts for delete using (
  auth.uid() = author_id or exists(select 1 from profiles where id=auth.uid() and is_admin)
);

-- contact_messages: 管理者だけ閲覧・更新、誰でも投稿可
drop policy if exists contact_messages_select on contact_messages;
drop policy if exists contact_messages_insert on contact_messages;
drop policy if exists contact_messages_update on contact_messages;
create policy "contact_messages_select" on contact_messages for select using (
  exists(select 1 from profiles where id=auth.uid() and is_admin)
);
create policy "contact_messages_insert" on contact_messages for insert with check (true);
create policy "contact_messages_update" on contact_messages for update using (
  exists(select 1 from profiles where id=auth.uid() and is_admin)
);

-- ============================================================
-- 管理者ユーザーの設定（サインアップ後に実行）
-- <YOUR_USER_ID> をあなたの auth.users の UUID に置き換えてください
-- ============================================================
-- update profiles set is_admin = true where id = '<YOUR_USER_ID>';

-- ============================================================
-- Realtime の有効化（Supabase ダッシュボード > Database > Replication でも設定）
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pr.prrelid = 'public.announcements'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pr.prrelid = 'public.votes'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime' AND pr.prrelid = 'public.polls'::regclass
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE polls;
  END IF;
END
$$;
