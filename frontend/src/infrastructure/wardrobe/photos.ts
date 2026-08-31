/**
 * الصور المرفوعة — سلّة `items` الخاصة.
 *
 * كانت بلوبات في IndexedDB، فما تتبع المستخدمة لجهاز ثاني وتخنق تخزين
 * المتصفّح. الحين ترفع لسلّة خاصة، ومسارها `<user_id>/<entity_id>` — نفس
 * التقسيم الذي تشترطه سياسة التخزين، فلا أحد يقرأ صور غيره.
 *
 * **اسم الملف هو مُعرِّف الشيء** لا أكثر: قطعة أو إلهام. فقراءة الصور تصير
 * سرد مجلّد المستخدمة، بلا ما نسأل أي جدول عن مسارات — والصورة تبقى مقروءة
 * حتى لو كان صاحبها في جدول ما ربطناه بعد.
 *
 * السلّة **غير عامة**: الروابط توقّع بمهلة، ونطلبها دفعة واحدة عند الإقلاع
 * بدل طلب لكل صورة.
 */
import { requireSupabase } from '@/infrastructure/supabase'

const BUCKET = 'items'

/** مهلة الرابط الموقّع — أطول من أي جلسة تصفّح، وأقصر من أن يُسرّب ويعيش. */
const SIGNED_URL_TTL = 60 * 60 * 8

const pathFor = (userId: string, entityId: string) => `${userId}/${entityId}`

/** يرفع صورة ويرجّع مسارها. */
export async function uploadPhoto(userId: string, entityId: string, blob: Blob): Promise<string> {
  const db = requireSupabase()
  const path = pathFor(userId, entityId)

  const { error } = await db.storage.from(BUCKET).upload(path, blob, {
    // نفس القطعة تُصوَّر مرة ثانية — نستبدل بدل ما نكدّس نسخًا
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  })
  if (error) throw error

  // `photo_path` يخصّ القطع؛ الإلهامات ما لها صفّ هنا فما يتطابق شيء — وهذا
  // مقصود: التحديث بلا تطابق ما يرمي، والصورة تبقى مقروءة من السرد.
  await db.from('items').update({ photo_path: path }).eq('id', entityId)

  return path
}

export async function deletePhoto(userId: string, entityId: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.storage.from(BUCKET).remove([pathFor(userId, entityId)])
  if (error) throw error
}

/**
 * روابط عرض موقّعة لكل صور المستخدمة، في طلبين.
 *
 * المفتاح مُعرِّف الشيء لا المسار — الواجهة تعرف القطعة ولا يهمها أين تعيش
 * صورتها.
 */
export async function signAllPhotos(userId: string): Promise<Record<string, string>> {
  const db = requireSupabase()

  const { data: files, error } = await db.storage.from(BUCKET).list(userId, { limit: 1000 })
  if (error) throw error
  if (!files || files.length === 0) return {}

  const { data, error: signError } = await db.storage
    .from(BUCKET)
    .createSignedUrls(
      files.map((file) => `${userId}/${file.name}`),
      SIGNED_URL_TTL,
    )
  if (signError) throw signError

  const urls: Record<string, string> = {}
  data.forEach((entry, index) => {
    const id = files[index]?.name
    if (id && entry.signedUrl && !entry.error) urls[id] = entry.signedUrl
  })
  return urls
}

/** يمسح صور المستخدمة كلها — تُستدعى مع تفريغ الخزانة. */
export async function deleteAllPhotos(userId: string): Promise<void> {
  const db = requireSupabase()
  const { data, error } = await db.storage.from(BUCKET).list(userId, { limit: 1000 })
  if (error || !data || data.length === 0) return
  await db.storage.from(BUCKET).remove(data.map((file) => `${userId}/${file.name}`))
}
