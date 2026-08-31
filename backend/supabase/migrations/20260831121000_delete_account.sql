-- ---------------------------------------------------------------------------
-- حذف الحساب — بيد صاحبته
--
-- كل جداول المستخدمة معلّقة على `auth.users` بـ`on delete cascade`، فحذف صفّها
-- هناك يمسح خزائنها وقطعها وإطلالاتها ورحلاتها وملفها معًا. لكن `auth.users`
-- مخطّط محمي: عميل المتصفح ما يلمسه مهما كانت جلسته. فالباب الوحيد دالة تعمل
-- بصلاحيات مالكها.
--
-- والصلاحية هنا **ما تتوسّع**: المُعرِّف يجي من `auth.uid()` — أي من الرمز
-- الموقّع — لا من معامل تمرّره الواجهة. فما فيه رقم تكتبه المستخدمة ليحذف حساب
-- غيرها. وبلا جلسة ترفع خطأً بدل ما تحذف صفًّا مجهولًا.
-- ---------------------------------------------------------------------------

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'no-session' using errcode = '28000';
  end if;

  /*
    الملفات أولًا.

    التخزين ما يتعلّق بمفتاح أجنبي على `auth.users`، فحذف الحساب وحده يترك
    صور قطعها وإطلالاتها في السلّتين بلا مالك — وبلا صفّ في `auth.users`
    تصير غير مقروءة وغير محذوفة: نفاية دائمة. المجلد باسم المُعرِّف، فالمسح
    بالبادئة يطابق سياسات السلّة نفسها.
  */
  delete from storage.objects
   where bucket_id in ('items', 'outfits')
     and (storage.foldername(name))[1] = caller::text;

  delete from auth.users where id = caller;
end;
$$;

-- الحذف فعل صاحبة الحساب وحدها — الزائر بلا جلسة ما له ما يحذفه
revoke execute on function public.delete_account() from anon, public;
grant  execute on function public.delete_account() to authenticated;
