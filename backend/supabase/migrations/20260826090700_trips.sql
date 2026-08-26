-- ---------------------------------------------------------------------------
-- السفر — الرحلة أيام، وكل يوم إطلالة. قائمة الشنطة مشتقة من قطع الأيام (T-04)
-- ---------------------------------------------------------------------------

create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  city        text not null,
  city_latin  text not null default '',
  date_from   date not null,
  date_to     date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint trips_range check (date_to >= date_from),
  constraint trips_max_days check (date_to - date_from < 14)
);

create index trips_user_idx on public.trips (user_id, date_from desc);

create trigger trips_touch
  before update on public.trips
  for each row execute function public.touch_updated_at();

create table public.trip_days (
  id       uuid primary key default gen_random_uuid(),
  trip_id  uuid not null references public.trips (id) on delete cascade,
  day      int not null check (day between 1 and 14),
  label    text,
  unique (trip_id, day)
);

create table public.trip_day_items (
  trip_day_id uuid not null references public.trip_days (id) on delete cascade,
  item_id     uuid not null references public.items (id) on delete cascade,
  primary key (trip_day_id, item_id)
);

-- تعليم القطع المحزومة في الشنطة
create table public.trip_packed (
  trip_id  uuid not null references public.trips (id) on delete cascade,
  item_id  uuid not null references public.items (id) on delete cascade,
  primary key (trip_id, item_id)
);

-- ---------------------------------- RLS ----------------------------------

alter table public.trips          enable row level security;
alter table public.trip_days      enable row level security;
alter table public.trip_day_items enable row level security;
alter table public.trip_packed    enable row level security;

create policy "trips: رحلاتي" on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "trip_days: أيام رحلاتي" on public.trip_days
  for all
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

create policy "trip_day_items: قطع أيام رحلاتي" on public.trip_day_items
  for all
  using (exists (
    select 1 from public.trip_days d
    join public.trips t on t.id = d.trip_id
    where d.id = trip_day_id and t.user_id = auth.uid()
  ))
  with check (
    exists (
      select 1 from public.trip_days d
      join public.trips t on t.id = d.trip_id
      where d.id = trip_day_id and t.user_id = auth.uid()
    )
    and public.owns_item(item_id)
  );

create policy "trip_packed: شنطة رحلاتي" on public.trip_packed
  for all
  using (public.owns_trip(trip_id))
  with check (public.owns_trip(trip_id) and public.owns_item(item_id));
