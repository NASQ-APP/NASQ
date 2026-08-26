-- ---------------------------------------------------------------------------
-- الموديل الشخصي — هوية ثابتة ببذرة مقفولة (المبدأ ٣ · M-03)
-- ---------------------------------------------------------------------------

create table public.models (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null,
  is_default        boolean not null default false,
  gender            public.gender not null,

  height_cm         int not null check (height_cm between 120 and 220),
  weight_kg         int check (weight_kg between 30 and 250),
  body_shape        text not null check (body_shape in ('slim','straight','athletic','curvy','plus')),
  skin_tone         text not null,
  hair_style        text,
  hair_color        text,
  age_group         text,

  -- أكتاف · صدر · خصر · أرداف (M-06)
  measurements      jsonb not null default '{}'::jsonb,

  -- تُشتق من المواصفات وتُمرَّر لكل استدعاء توليد
  seed              int not null,
  preview_image_url text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index models_user_idx on public.models (user_id);

-- موديل افتراضي واحد لكل جنس لكل مستخدمة
create unique index models_one_default_per_gender
  on public.models (user_id, gender)
  where is_default;

create trigger models_touch
  before update on public.models
  for each row execute function public.touch_updated_at();

alter table public.models enable row level security;

create policy "models: قراءة موديلاتي"
  on public.models for select using (user_id = auth.uid());
create policy "models: إضافة موديل"
  on public.models for insert with check (user_id = auth.uid());
create policy "models: تعديل موديلاتي"
  on public.models for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "models: حذف موديلاتي"
  on public.models for delete using (user_id = auth.uid());
