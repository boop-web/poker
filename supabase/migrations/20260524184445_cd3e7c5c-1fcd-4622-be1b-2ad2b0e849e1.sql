
-- Roles enum + table (separate from profiles for security)
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  chips bigint not null default 10000,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Security definer to avoid recursive RLS
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Poker tables
create type public.table_status as enum ('waiting', 'playing', 'paused');

create table public.poker_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  small_blind integer not null default 10,
  big_blind integer not null default 20,
  max_seats integer not null default 6 check (max_seats between 2 and 9),
  min_buyin integer not null default 400,
  max_buyin integer not null default 4000,
  status table_status not null default 'waiting',
  -- Live game state JSON: { phase, board, pot, current_bet, dealer_seat, current_seat, last_raise, deck, hand_id }
  state jsonb not null default '{"phase":"idle","board":[],"pot":0,"current_bet":0,"dealer_seat":null,"current_seat":null,"deck":[],"hand_id":null}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.table_seats (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat_number integer not null check (seat_number between 0 and 8),
  chips integer not null,
  -- Per-hand state
  hole_cards jsonb not null default '[]'::jsonb,
  current_bet integer not null default 0,
  has_folded boolean not null default false,
  is_all_in boolean not null default false,
  has_acted boolean not null default false,
  sitting_out boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (table_id, seat_number),
  unique (table_id, user_id)
);

create table public.hands (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  board jsonb not null default '[]'::jsonb,
  pot integer not null default 0,
  winner_user_id uuid references auth.users(id),
  winner_seat integer,
  summary text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.hand_actions (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references public.hands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  amount integer not null default 0,
  phase text not null,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);

-- Updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_tables_updated before update on public.poker_tables
  for each row execute function public.touch_updated_at();

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
begin
  v_username := coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    'player_' || substr(new.id::text, 1, 8)
  );
  -- Ensure unique username
  while exists(select 1 from public.profiles where username = v_username) loop
    v_username := v_username || floor(random() * 1000)::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, coalesce(new.raw_user_meta_data ->> 'display_name', v_username));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.poker_tables enable row level security;
alter table public.table_seats enable row level security;
alter table public.hands enable row level security;
alter table public.hand_actions enable row level security;
alter table public.chat_messages enable row level security;

-- profiles
create policy "Profiles viewable by authenticated" on public.profiles for select to authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Admins update any profile" on public.profiles for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "Users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- poker_tables
create policy "Tables viewable by authenticated" on public.poker_tables for select to authenticated using (true);
create policy "Admins manage tables" on public.poker_tables for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- table_seats: server actions handle most mutations, but allow viewing
create policy "Seats viewable by authenticated" on public.table_seats for select to authenticated using (true);

-- hands + actions + chat
create policy "Hands viewable by authenticated" on public.hands for select to authenticated using (true);
create policy "Hand actions viewable by authenticated" on public.hand_actions for select to authenticated using (true);
create policy "Chat viewable by authenticated" on public.chat_messages for select to authenticated using (true);
create policy "Users send chat" on public.chat_messages for insert to authenticated with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.poker_tables;
alter publication supabase_realtime add table public.table_seats;
alter publication supabase_realtime add table public.hands;
alter publication supabase_realtime add table public.chat_messages;
alter table public.poker_tables replica identity full;
alter table public.table_seats replica identity full;
alter table public.hands replica identity full;
