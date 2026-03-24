-- ── Marketplace tables ─────────────────────────────────────────────────────────

create table if not exists marketplace_items (
  id           text primary key,
  name         text not null,
  description  text,
  price        int  not null check (price > 0),
  emoji        text not null default '🎁',
  is_active    boolean not null default true,
  weekly_limit int  not null default 1,
  sort_order   int  not null default 0
);

create table if not exists marketplace_purchases (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references profiles(id) on delete cascade,
  item_id      text not null references marketplace_items(id),
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  week_start   date not null,
  requested_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  admin_note   text
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

alter table marketplace_items    enable row level security;
alter table marketplace_purchases enable row level security;

-- Students can read active items
create policy "students read active items"
  on marketplace_items for select
  using (is_active = true);

-- Students can read their own purchases
create policy "students read own purchases"
  on marketplace_purchases for select
  using (student_id = auth.uid());

-- Students can insert their own purchases
create policy "students insert own purchases"
  on marketplace_purchases for insert
  with check (student_id = auth.uid());

-- ── Seed items ─────────────────────────────────────────────────────────────────

insert into marketplace_items (id, name, description, price, emoji, sort_order) values
  ('early-tech',     'Early Tech Time',      'Start tech time 30 minutes early today',          75,  '⏰', 10),
  ('extra-tech',     'Extra Tech Time',      'Add a full hour of extra tech time',              125, '🕹️', 20),
  ('skip-task',      'Skip a Task',          'Skip one task of your choice this week',          150, '⚡', 30),
  ('choose-movie',   'Choose the Movie',     'You pick the movie for family movie night',        80, '🎬', 40),
  ('family-activity','Choose Family Activity','Pick the activity for the next family outing',   100, '🎯', 50),
  ('pick-restaurant','Pick the Restaurant',  'Choose where the family eats out',                60, '🍕', 60),
  ('new-video-game', 'New Video Game',       'Earn a new video game of your choice',            400, '🎮', 70),
  ('school-day-off', 'Homeschool Day Off',   'Take a full day off from school — earned it!',   300, '📚', 80),
  ('stay-up-late',   'Stay Up Late',         'Stay up 30 minutes past bedtime',                 60, '🌙', 90),
  ('choose-dessert', 'Choose Dessert',       'Pick tonight''s dessert for the whole family',    40, '🍦', 100)
on conflict (id) do nothing;
