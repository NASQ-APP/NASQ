-- ---------------------------------------------------------------------------
-- الامتدادات والدوال المشتركة
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto" with schema extensions;
-- للبحث الدلالي و«عندك مثله» (A-08)
create extension if not exists "vector" with schema extensions;

-- تحديث updated_at تلقائيًا على أي جدول يستعملها
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- دوال الملكية.
--
-- جدول الربط لازم يتحقق من **الطرفين**. التحقق من طرف واحد يسمح للمستخدمة
-- تربط صفًّا يخصّها بصفٍّ يخص غيرها، فتتسرّب بياناته عبر أي مسار قراءة يجمع
-- الجدولين — مثل رابط المشاركة العام.
--
-- تعمل بصلاحية المنادي، فالاستعلام داخلها يمر على RLS نفسها.
-- ---------------------------------------------------------------------------

create or replace function public.owns_item(target uuid)
returns boolean language sql stable security invoker as $$
  select exists (select 1 from public.items where id = target and user_id = auth.uid());
$$;

create or replace function public.owns_closet(target uuid)
returns boolean language sql stable security invoker as $$
  select exists (select 1 from public.closets where id = target and user_id = auth.uid());
$$;

create or replace function public.owns_outfit(target uuid)
returns boolean language sql stable security invoker as $$
  select exists (select 1 from public.outfits where id = target and user_id = auth.uid());
$$;

create or replace function public.owns_trip(target uuid)
returns boolean language sql stable security invoker as $$
  select exists (select 1 from public.trips where id = target and user_id = auth.uid());
$$;

create or replace function public.owns_model(target uuid)
returns boolean language sql stable security invoker as $$
  select target is null
      or exists (select 1 from public.models where id = target and user_id = auth.uid());
$$;
