-- تقسية الدوال.
--
-- ١. تثبيت `search_path` على دوال `SECURITY DEFINER`.
--
-- الدالة بلا مسار مثبَّت تبحث عن جداولها في المسار الذي يضبطه **المُستدعي**.
-- ومن يقدر ينشئ مخططًا خاصًا يزرع فيه `items` مزيّفًا ويقدّمه على الحقيقي،
-- فتشتغل الدالة بصلاحيات مالكها على جداوله هو. التثبيت يقفل الباب.
alter function public.touch_updated_at()            set search_path = public, pg_temp;
alter function public.owns_item(uuid)               set search_path = public, pg_temp;
alter function public.owns_closet(uuid)             set search_path = public, pg_temp;
alter function public.owns_outfit(uuid)             set search_path = public, pg_temp;
alter function public.owns_trip(uuid)               set search_path = public, pg_temp;
alter function public.owns_model(uuid)              set search_path = public, pg_temp;
alter function public.handle_new_user()             set search_path = public, pg_temp;
alter function public.render_jobs_today(uuid)       set search_path = public, pg_temp;
alter function public.shared_outfit(text)           set search_path = public, pg_temp;
alter function public.search_items(vector, integer) set search_path = public, extensions, pg_temp;

-- ٢. دالتان داخليتان كانتا مكشوفتين كواجهة REST.
--
-- الصلاحية موروثة من `PUBLIC` لا ممنوحة لدور بعينه، فالسحب لازم يشملها.
-- `handle_new_user` مُشغِّل يعمل بصلاحيات مالكه بلا حاجة لهذا الإذن،
-- و`render_jobs_today` عدّاد حصّة تستدعيه دوال الخادم. كلاهما ليس واجهة.
--
-- `shared_outfit` **يبقى مفتوحًا عمدًا**: رابط المشاركة يُفتح بلا حساب، وهذا
-- كل غرضه. حمايته في الرمز السرّي لا في الإذن.
revoke execute on function public.handle_new_user()          from anon, authenticated, public;
revoke execute on function public.render_jobs_today(uuid)    from anon, authenticated, public;
