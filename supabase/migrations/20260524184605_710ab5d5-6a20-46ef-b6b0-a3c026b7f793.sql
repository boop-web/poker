
alter table public.table_seats drop column hole_cards;

create table public.seat_holes (
  seat_id uuid primary key references public.table_seats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  table_id uuid not null references public.poker_tables(id) on delete cascade,
  hole_cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.seat_holes enable row level security;
create policy "Players see only own holes" on public.seat_holes
  for select to authenticated using (auth.uid() = user_id);

alter publication supabase_realtime add table public.seat_holes;
alter table public.seat_holes replica identity full;
