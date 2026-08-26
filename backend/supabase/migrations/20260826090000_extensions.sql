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
