-- ---------------------------------------------------------------------------
-- الإطلالات
--
-- قاعدة سلامة: حذف قطعة لا يحذف الإطلالة. الرابط `on delete set null` يخلي
-- الإطلالة تعرض عدد القطع المفقودة بدل ما تنكسر.
-- ---------------------------------------------------------------------------

create type public.framing as enum ('full', 'upper', 'lower', 'detail');

create table public.outfits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  model_id          uuid references public.models (id) on delete set null,

  name              text not null,
  occasion          text,
  seasons           text[] not null default '{}',

  result_image_url  text,
  framing           public.framing not null default 'full',
  -- true = تركيب محلي مو صورة مولّدة. ما نزيّف نتيجة (المبدأ ٤)
  is_simulated      boolean not null default true,

  tags              text[] not null default '{}',
  notes             text,
  wear_count        int not null default 0,
  last_worn_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index outfits_user_idx on public.outfits (user_id, created_at desc);

create trigger outfits_touch
  before update on public.outfits
  for each row execute function public.touch_updated_at();

create table public.outfit_items (
  id         uuid primary key default gen_random_uuid(),
  outfit_id  uuid not null references public.outfits (id) on delete cascade,
  -- set null مقصود: حذف القطعة ما يكسر الإطلالة، تعرض عدد القطع المفقودة
  item_id    uuid references public.items (id) on delete set null,
  layer      public.body_slot not null,
  position   int not null default 0
);

create index outfit_items_outfit_idx on public.outfit_items (outfit_id);

create table public.outfit_closets (
  outfit_id  uuid not null references public.outfits (id) on delete cascade,
  closet_id  uuid not null references public.closets (id) on delete cascade,
  primary key (outfit_id, closet_id)
);

-- ---------------------------------- RLS ----------------------------------

alter table public.outfits        enable row level security;
alter table public.outfit_items   enable row level security;
alter table public.outfit_closets enable row level security;

create policy "outfits: إطلالاتي" on public.outfits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "outfit_items: قطع إطلالاتي" on public.outfit_items
  for all
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));

create policy "outfit_closets: تصنيف إطلالاتي" on public.outfit_closets
  for all
  using (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.outfits o where o.id = outfit_id and o.user_id = auth.uid()));
