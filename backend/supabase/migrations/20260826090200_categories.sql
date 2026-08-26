-- ---------------------------------------------------------------------------
-- الفئات الثابتة (٣٢ فئة) — مرجع عام للقراءة، ما تملكها مستخدمة
-- ---------------------------------------------------------------------------

create type public.body_slot as enum (
  'top', 'bottom', 'full', 'outer', 'shoes', 'bag', 'accessory'
);

create type public.gender as enum ('male', 'female');

create table public.categories (
  id          text primary key,
  name        text not null,
  name_latin  text not null,
  gender      public.gender not null,
  slot        public.body_slot not null,
  "group"     text not null check ("group" in ('clothing', 'shoes', 'bags', 'accessories')),
  sort_order  int not null default 0
);

alter table public.categories enable row level security;

-- مرجع عام: أي مستخدمة مسجّلة تقرأه، وما فيه كتابة من العميل
create policy "categories: قراءة عامة"
  on public.categories for select
  to authenticated
  using (true);

insert into public.categories (id, name, name_latin, gender, slot, "group", sort_order) values
  ('women-tshirts',    'تيشيرتات',   'T-Shirts',    'female', 'top',       'clothing',    1),
  ('women-shirts',     'قمصان',      'Shirts',      'female', 'top',       'clothing',    2),
  ('women-blouses',    'بلوزات',     'Blouses',     'female', 'top',       'clothing',    3),
  ('women-tops',       'توبات',      'Tops',        'female', 'top',       'clothing',    4),
  ('women-sweaters',   'كنزات',      'Sweaters',    'female', 'top',       'clothing',    5),
  ('women-hoodies',    'هوديز',      'Hoodies',     'female', 'top',       'clothing',    6),
  ('women-jackets',    'جاكيتات',    'Jackets',     'female', 'outer',     'clothing',    7),
  ('women-coats',      'معاطف',      'Coats',       'female', 'outer',     'clothing',    8),
  ('women-dresses',    'فساتين',     'Dresses',     'female', 'full',      'clothing',    9),
  ('women-abayas',     'عبايات',     'Abayas',      'female', 'full',      'clothing',   10),
  ('women-skirts',     'تنانير',     'Skirts',      'female', 'bottom',    'clothing',   11),
  ('women-pants',      'بناطيل',     'Pants',       'female', 'bottom',    'clothing',   12),
  ('women-jeans',      'جينز',       'Jeans',       'female', 'bottom',    'clothing',   13),
  ('women-shorts',     'شورتات',     'Shorts',      'female', 'bottom',    'clothing',   14),
  ('women-shoes',      'أحذية',      'Shoes',       'female', 'shoes',     'shoes',      15),
  ('women-bags',       'حقائب',      'Bags',        'female', 'bag',       'bags',       16),
  ('women-accessories','إكسسوارات',  'Accessories', 'female', 'accessory', 'accessories',17),
  ('men-tshirts',      'تيشيرتات',   'T-Shirts',    'male',   'top',       'clothing',   18),
  ('men-shirts',       'قمصان',      'Shirts',      'male',   'top',       'clothing',   19),
  ('men-polos',        'بولو',       'Polos',       'male',   'top',       'clothing',   20),
  ('men-sweaters',     'كنزات',      'Sweaters',    'male',   'top',       'clothing',   21),
  ('men-hoodies',      'هوديز',      'Hoodies',     'male',   'top',       'clothing',   22),
  ('men-jackets',      'جاكيتات',    'Jackets',     'male',   'outer',     'clothing',   23),
  ('men-coats',        'معاطف',      'Coats',       'male',   'outer',     'clothing',   24),
  ('men-suits',        'بدل',        'Suits',       'male',   'full',      'clothing',   25),
  ('men-thobes',       'ثياب',       'Thobes',      'male',   'full',      'clothing',   26),
  ('men-pants',        'بناطيل',     'Pants',       'male',   'bottom',    'clothing',   27),
  ('men-jeans',        'جينز',       'Jeans',       'male',   'bottom',    'clothing',   28),
  ('men-shorts',       'شورتات',     'Shorts',      'male',   'bottom',    'clothing',   29),
  ('men-shoes',        'أحذية',      'Shoes',       'male',   'shoes',     'shoes',      30),
  ('men-bags',         'حقائب',      'Bags',        'male',   'bag',       'bags',       31),
  ('men-accessories',  'إكسسوارات',  'Accessories', 'male',   'accessory', 'accessories',32);
