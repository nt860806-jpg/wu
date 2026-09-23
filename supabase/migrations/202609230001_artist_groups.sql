create table if not exists public.artist_groups (
  id text primary key,
  name text not null unique,
  display_name text not null,
  kr_name text not null default '',
  fandom text not null default '',
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.artist_groups enable row level security;

drop policy if exists "Anyone can read active artist groups" on public.artist_groups;
create policy "Anyone can read active artist groups"
  on public.artist_groups for select to anon, authenticated
  using (is_active);

drop policy if exists "Admins can read all artist groups" on public.artist_groups;
create policy "Admins can read all artist groups"
  on public.artist_groups for select to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com'));

drop policy if exists "Admins can insert artist groups" on public.artist_groups;
create policy "Admins can insert artist groups"
  on public.artist_groups for insert to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com'));

drop policy if exists "Admins can update artist groups" on public.artist_groups;
create policy "Admins can update artist groups"
  on public.artist_groups for update to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('nt860806@gmail.com', 'asd0578236@gmail.com'));

grant select on public.artist_groups to anon, authenticated;
grant insert, update on public.artist_groups to authenticated;

insert into public.artist_groups (id, name, display_name, kr_name, fandom, description)
values
  ('twice', 'TWICE', 'TWICE', '트와이스', 'ONCE', '10週年紀念周邊、CANDYBONG ∞ 應援手燈與回歸專輯特典熱烈集單中。'),
  ('stray-kids', 'Stray Kids', 'Stray Kids', '스트레이 키즈', 'STAY', 'dominATE 世界巡演 Nachimbong Ver.2 手燈與官方 SKZOO 周邊專屬代購。'),
  ('itzy', 'ITZY', 'ITZY', '있지', 'MIDZY', 'Born To Be 巡迴環形手燈、官方會員限定周邊與韓國限定快閃特典。'),
  ('nmixx', 'NMIXX', 'NMIXX', '엔믹스', 'NSWER', 'MIXXTICK 水母泡泡投影手燈、Fe3O4 通路自拍小卡與限定應援品。'),
  ('day6', 'DAY6', 'DAY6', '데이식스', 'My Day', '十週年紀念 LIGHT BAND Ver.3 手錶手燈與回歸首週榜單專屬採購。'),
  ('xdinary-heroes', 'Xdinary Heroes', 'Xdinary Heroes', '엑스디너리 히어로즈', 'Villains', '搖滾舞台應援周邊、首發演唱會 T-Shirt 與限定特典卡全套。')
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'artist_groups'
  ) then
    alter publication supabase_realtime add table public.artist_groups;
  end if;
end;
$$;
