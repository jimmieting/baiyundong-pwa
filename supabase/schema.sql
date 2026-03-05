-- =============================================
-- 白云洞登山局 · Supabase 数据库建表
-- 在 Supabase Dashboard → SQL Editor 中运行
-- =============================================

-- 1. 用户表
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone text unique,               -- 手机号（登录用）
  nickname text default '匿名攀登者',
  identity text default 'ANONYMOUS', -- ANONYMOUS / HONOR
  total_climbs int default 0,
  total_ascent int default 0,
  personal_pb int,                  -- 个人最佳（秒）
  created_at timestamptz default now()
);

-- 2. 攀登记录表
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  status text default 'RUNNING',    -- RUNNING / ARRIVED / COMPLETED / SUSPECT
  start_time timestamptz default now(),
  end_time timestamptz,
  duration_sec int default 0,
  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,
  start_alt double precision default 0,
  end_alt double precision default 0,
  altitude_samples jsonb default '[]'::jsonb,
  is_valid boolean default false,
  validation_flags text[] default '{}',
  created_at timestamptz default now()
);

-- 3. 文化卡片
create table if not exists culture_cards (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  priority int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. 反馈
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  type text default 'BUG',          -- BUG / SUGGESTION
  content text not null,
  status text default 'PENDING',    -- PENDING / RESOLVED
  created_at timestamptz default now()
);

-- 5. 运营配置
create table if not exists config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- =============================================
-- 索引
-- =============================================
create index if not exists idx_workouts_user on workouts(user_id);
create index if not exists idx_workouts_status on workouts(status);
create index if not exists idx_workouts_start_time on workouts(start_time desc);
create index if not exists idx_workouts_valid on workouts(is_valid, duration_sec);

-- =============================================
-- RLS（行级安全）
-- =============================================

-- 启用 RLS
alter table users enable row level security;
alter table workouts enable row level security;
alter table culture_cards enable row level security;
alter table feedback enable row level security;
alter table config enable row level security;

-- users: 自己可读写
create policy "users_select_own" on users for select using (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);
create policy "users_insert_own" on users for insert with check (auth.uid() = id);

-- workouts: 自己可写，所有人可读已完成记录（排行榜）
create policy "workouts_insert_own" on workouts for insert with check (auth.uid() = user_id);
create policy "workouts_update_own" on workouts for update using (auth.uid() = user_id);
create policy "workouts_select_own" on workouts for select using (auth.uid() = user_id);
create policy "workouts_select_public" on workouts for select using (is_valid = true);

-- culture_cards: 所有人可读
create policy "culture_read" on culture_cards for select using (true);

-- feedback: 自己可写
create policy "feedback_insert" on feedback for insert with check (auth.uid() = user_id);

-- config: 所有人可读
create policy "config_read" on config for select using (true);

-- =============================================
-- 校验函数（替代微信云函数 validateRecord）
-- =============================================
create or replace function validate_workout(workout_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  w workouts%rowtype;
  flags text[] := '{}';
  is_valid boolean := true;
  dur int;
begin
  select * into w from workouts where id = workout_id;
  if not found then
    return jsonb_build_object('success', false, 'error', '记录不存在');
  end if;

  dur := extract(epoch from (w.end_time - w.start_time))::int;

  -- 校验1: 时长合理性（15分钟 ~ 3小时）
  if dur < 900 then
    flags := flags || 'TOO_SHORT';
    is_valid := false;
  end if;
  if dur > 10800 then
    flags := flags || 'TOO_LONG';
    is_valid := false;
  end if;

  -- 校验2: 海拔增量（预期 280m ± 100m）
  if w.end_alt - w.start_alt < 180 then
    flags := flags || 'LOW_ALTITUDE';
    is_valid := false;
  end if;
  if w.end_alt - w.start_alt > 380 then
    flags := flags || 'HIGH_ALTITUDE';
    is_valid := false;
  end if;

  -- 更新记录
  update workouts set
    status = case when is_valid then 'COMPLETED' else 'SUSPECT' end,
    duration_sec = dur,
    is_valid = validate_workout.is_valid,
    validation_flags = flags
  where id = workout_id;

  -- 如果有效，更新用户统计
  if is_valid then
    update users set
      total_climbs = total_climbs + 1,
      total_ascent = total_ascent + (w.end_alt - w.start_alt)::int,
      personal_pb = least(coalesce(personal_pb, 999999), dur)
    where id = w.user_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'isValid', is_valid,
    'status', case when is_valid then 'COMPLETED' else 'SUSPECT' end,
    'duration', dur,
    'flags', to_jsonb(flags)
  );
end;
$$;

-- =============================================
-- 排行榜视图
-- =============================================
create or replace view leaderboard as
select
  w.id,
  w.user_id,
  u.nickname,
  w.duration_sec,
  w.start_time,
  w.end_alt - w.start_alt as altitude_gain,
  rank() over (order by w.duration_sec asc) as rank
from workouts w
join users u on w.user_id = u.id
where w.is_valid = true
  and w.status = 'COMPLETED'
order by w.duration_sec asc;

-- =============================================
-- 种子数据
-- =============================================
insert into culture_cards (content, priority) values
  ('朱熹曾于鼓山白云洞题"天路"二字，意指通往精神高处的道路。', 10),
  ('白云洞海拔约400米，从埠兴村登山口出发，垂直爬升约280米。', 8),
  ('鼓山摩崖石刻始于宋代，现存题刻500余方，为全国之最。', 6)
on conflict do nothing;

insert into config (key, value) values
  ('group_qr_url', ''),
  ('announcement', '')
on conflict do nothing;
