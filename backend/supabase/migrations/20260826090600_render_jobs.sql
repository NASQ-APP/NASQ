-- ---------------------------------------------------------------------------
-- مهام التوليد (S-04)
--
-- التوليد غير متزامن: الطلب يرجّع `id` فورًا، والحالة تُتابَع من الواجهة عبر
-- Realtime. لا طلب معلّق ينتظر، فالواجهة ما تتعلّق أبدًا.
-- ---------------------------------------------------------------------------

create type public.render_status as enum (
  'idle', 'uploading', 'validating', 'processing', 'generating', 'completed', 'failed'
);

create table public.render_jobs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  outfit_id    uuid references public.outfits (id) on delete set null,

  status       public.render_status not null default 'idle',
  stage        text,
  provider     text not null,

  -- الطلب كما بُني في المجال — يُستخدم كمفتاح للتخزين المؤقت (S-09)
  prompt       jsonb not null,
  request_hash text not null,

  result_url   text,
  error_code   text,
  error_message text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index render_jobs_user_idx on public.render_jobs (user_id, created_at desc);
-- نفس القطع + نفس الموديل = ما يتولّد مرتين (S-09)
create index render_jobs_cache_idx
  on public.render_jobs (user_id, request_hash)
  where status = 'completed';

create trigger render_jobs_touch
  before update on public.render_jobs
  for each row execute function public.touch_updated_at();

alter table public.render_jobs enable row level security;

-- الإنشاء والتحديث من Edge Function بمفتاح الخدمة فقط.
-- العميل يقرأ حالة مهامه ليتابعها عبر Realtime.
create policy "render_jobs: متابعة مهامي" on public.render_jobs
  for select using (user_id = auth.uid());

-- بث التغييرات للواجهة
alter publication supabase_realtime add table public.render_jobs;

-- سقف يومي للتوليد لكل مستخدمة (S-09)
create or replace function public.render_jobs_today(target_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $fn$
  select count(*)::int
  from public.render_jobs
  where user_id = target_user
    and created_at >= date_trunc('day', now());
$fn$;
