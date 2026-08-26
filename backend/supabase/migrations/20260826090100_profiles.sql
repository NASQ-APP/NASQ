-- ---------------------------------------------------------------------------
-- الملف الشخصي — سطر واحد لكل مستخدمة، يُنشأ تلقائيًا عند التسجيل
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  locale      text not null default 'ar',
  city        text,
  units       text not null default 'metric' check (units in ('metric', 'imperial')),
  theme       text not null default 'light' check (theme in ('light', 'dark')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- RLS من أول migration، مو لاحقًا (§17)
alter table public.profiles enable row level security;

create policy "profiles: قراءة ملفي"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: تعديل ملفي"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: إنشاء ملفي"
  on public.profiles for insert
  with check (id = auth.uid());

-- إنشاء الملف الشخصي مع الحساب
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
