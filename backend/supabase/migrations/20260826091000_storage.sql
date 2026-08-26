-- ---------------------------------------------------------------------------
-- التخزين (§17)
--
-- سلّتان خاصّتان — لا رابط عام. القراءة بروابط موقّعة محدودة المدة.
-- **الصورة الشخصية ما لها سلّة**: تعيش في ذاكرة الجلسة في المتصفح فقط،
-- ومستثناة صراحة من التخزين. لا تُنشأ لها سلّة هنا ولا في أي migration لاحق.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('items',   'items',   false, 12582912, array['image/jpeg','image/png','image/webp']),
  ('outfits', 'outfits', false, 12582912, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- كل مستخدمة داخل مجلد باسم معرّفها: items/<user_id>/<file>
create policy "storage: قراءة ملفاتي"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('items', 'outfits')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: رفع ملفاتي"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('items', 'outfits')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: تعديل ملفاتي"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('items', 'outfits')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage: حذف ملفاتي"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('items', 'outfits')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
