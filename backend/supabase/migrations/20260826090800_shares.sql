-- ---------------------------------------------------------------------------
-- المشاركة (P-01 · P-03)
--
-- رابط عام للقراءة فقط بتوكن، يفتح بدون تسجيل دخول، وقابل للإلغاء بضغطة.
-- الأسعار مخفية افتراضيًا.
-- ---------------------------------------------------------------------------

create table public.shares (
  id          uuid primary key default gen_random_uuid(),
  outfit_id   uuid not null references public.outfits (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  token       text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  is_active   boolean not null default true,
  show_brands boolean not null default true,
  show_prices boolean not null default false,
  view_count  int not null default 0,
  created_at  timestamptz not null default now()
);

create index shares_outfit_idx on public.shares (outfit_id);

alter table public.shares enable row level security;

create policy "shares: روابطي" on public.shares
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- القراءة العامة تمر من هنا فقط: دالة تُرجّع ما تسمح به إعدادات المشاركة،
-- بدون فتح جدول الإطلالات لغير أصحابه. تُستدعى من دالة الحافة /share.
create or replace function public.shared_outfit(share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  share  public.shares%rowtype;
  outfit public.outfits%rowtype;
  pieces jsonb;
begin
  select * into share from public.shares where token = share_token and is_active;
  if not found then
    return null;
  end if;

  select * into outfit from public.outfits where id = share.outfit_id;
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'name',  i.name,
           'brand', case when share.show_brands then i.brand end,
           'price', case when share.show_prices then i.price end
         )), '[]'::jsonb)
    into pieces
    from public.outfit_items oi
    join public.items i on i.id = oi.item_id
   where oi.outfit_id = outfit.id;

  update public.shares set view_count = view_count + 1 where id = share.id;

  return jsonb_build_object(
    'name',      outfit.name,
    'occasion',  outfit.occasion,
    'imageUrl',  outfit.result_image_url,
    'simulated', outfit.is_simulated,
    'items',     pieces
  );
end;
$fn$;
