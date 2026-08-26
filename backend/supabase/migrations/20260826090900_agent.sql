-- ---------------------------------------------------------------------------
-- محادثات الوكيل (A-09 … A-13)
-- ---------------------------------------------------------------------------

create table public.agent_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text,
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index agent_threads_user_idx on public.agent_threads (user_id, updated_at desc);

create trigger agent_threads_touch
  before update on public.agent_threads
  for each row execute function public.touch_updated_at();

alter table public.agent_threads enable row level security;

create policy "agent_threads: محادثاتي" on public.agent_threads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- بحث دلالي داخل خزانة المستخدمة وحدها (A-08)
create or replace function public.search_items(
  query_embedding extensions.vector(1536),
  match_count int default 12
)
returns table (item_id uuid, similarity float)
language sql
stable
as $fn$
  select e.item_id, 1 - (e.embedding <=> query_embedding) as similarity
  from public.item_embeddings e
  join public.items i on i.id = e.item_id
  where i.user_id = auth.uid()
  order by e.embedding <=> query_embedding
  limit match_count;
$fn$;
