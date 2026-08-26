-- ---------------------------------------------------------------------------
-- الخزائن والقطع
--
-- التنظيم على مستويين (W-01): الأقسام التلقائية تُشتق من `categories.slot`،
-- والخزائن المسمّاة تعيش هنا. القطعة تدخل عدة خزائن عبر `item_closets`.
--
-- ملاحظة على §16: الوثيقة تقترح «غياب سطر في item_closets = قطعة تجربة».
-- خالفناها عمدًا بعمود `source` صريح، لأن المبدأ ٦ يقول التنظيم اختياري —
-- فقطعة مملوكة خارج أي خزانة حالة مشروعة، وما ينفع تُقرأ كقطعة تجربة.
-- ---------------------------------------------------------------------------

create type public.item_source as enum ('wardrobe', 'try');

create table public.closets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  name_latin  text not null default 'Closet',
  icon        text,
  color       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index closets_user_idx on public.closets (user_id, sort_order);

create trigger closets_touch
  before update on public.closets
  for each row execute function public.touch_updated_at();

create table public.items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,

  image_url         text,
  image_cutout_url  text,

  category_id       text not null references public.categories (id),
  shape             text not null,
  color_hex         text not null,
  color_name        text not null,
  color_secondary   text,
  pattern           text,
  material          text,
  seasons           text[] not null default '{}',
  occasions         text[] not null default '{}',
  length            text,
  fit               text,

  name              text not null,
  size              text,
  brand             text,
  -- سعر وتاريخ شراء للتحليل الشخصي فقط — لا علاقة له بالبيع (W-12)
  price             numeric(10, 2),
  purchase_date     date,

  source            public.item_source not null default 'wardrobe',
  store_id          text,
  source_link       text,

  notes             text,
  tags              text[] not null default '{}',
  is_favorite       boolean not null default false,
  wear_count        int not null default 0,
  last_worn_at      timestamptz,

  garment_template  text,
  -- اقتراحات التصنيف التلقائي كما رجّعها المزوّد (A-07)
  ai_meta           jsonb not null default '{}'::jsonb,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index items_user_idx      on public.items (user_id, created_at desc);
create index items_category_idx  on public.items (user_id, category_id);
create index items_source_idx    on public.items (user_id, source);
create index items_favorite_idx  on public.items (user_id) where is_favorite;

create trigger items_touch
  before update on public.items
  for each row execute function public.touch_updated_at();

-- القطعة تدخل عدة خزائن. حذف الخزانة ينقل قطعها ولا يحذفها أبدًا (W-02)
create table public.item_closets (
  item_id    uuid not null references public.items (id) on delete cascade,
  closet_id  uuid not null references public.closets (id) on delete cascade,
  primary key (item_id, closet_id)
);

create index item_closets_closet_idx on public.item_closets (closet_id);

-- تمثيل متجه لكل قطعة — يخدم البحث بالمعنى و«عندك مثله» (A-08)
create table public.item_embeddings (
  item_id    uuid primary key references public.items (id) on delete cascade,
  embedding  extensions.vector(1536),
  created_at timestamptz not null default now()
);

-- ---------------------------------- RLS ----------------------------------

alter table public.closets        enable row level security;
alter table public.items          enable row level security;
alter table public.item_closets   enable row level security;
alter table public.item_embeddings enable row level security;

create policy "closets: خزائني" on public.closets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "items: قطعي" on public.items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "item_closets: ربط قطعي بخزائني" on public.item_closets
  for all
  using (
    exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())
    and exists (select 1 from public.closets c where c.id = closet_id and c.user_id = auth.uid())
  );

create policy "item_embeddings: تمثيل قطعي" on public.item_embeddings
  for all
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()))
  with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));
