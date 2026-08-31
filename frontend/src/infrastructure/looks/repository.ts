/**
 * الإطلالات المحفوظة على الخادم.
 *
 * الإطلالة صفّ في `outfits` وقطعها صفوف في `outfit_items`. الترتيب محفوظ في
 * `position` لأن ترتيب اللبس معنى لا تفصيل عرض: العباية فوق الفستان، والفستان
 * فوق الحذاء.
 *
 * **الصورة تُرفع لسلّة `outfits`**: التوليد يعطي رابط `data:` أو `blob:` يعيش
 * في تبويب واحد. حفظه في القاعدة يعني إطلالة بلا صورة على أي جهاز آخر، فنرفع
 * الصورة ونحفظ مسارها.
 */
import { requireSupabase } from '@/infrastructure/supabase'
import { slotOfCategory } from '@/domain/wardrobe'
import type { Framing, SavedLook } from '@/domain/outfit'
import type { BodySlot } from '@/domain/shared/types'
import type { Tables } from '@/infrastructure/supabase'

const BUCKET = 'outfits'
const SIGNED_URL_TTL = 60 * 60 * 8

type OutfitRow = Tables<'outfits'> & {
  outfit_items: { item_id: string | null; position: number }[] | null
}

const COLUMNS = '*, outfit_items(item_id, position)'

async function currentUserId(): Promise<string> {
  const db = requireSupabase()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new Error('no-session')
  return data.user.id
}

/* ---------------- القراءة ---------------- */

function toLook(row: OutfitRow, imageUrl: string | undefined): SavedLook {
  const itemIds = (row.outfit_items ?? [])
    .toSorted((a, b) => a.position - b.position)
    .map((entry) => entry.item_id)
    .filter((id): id is string => Boolean(id))

  return {
    id: row.id,
    // إطلالة قديمة بلا رقم محفوظ: نشتقّه من المعرّف بدل ما نعرض صفرًا
    number: row.number ?? 0,
    name: row.name,
    occasion: row.occasion ?? '',
    resultImageUrl: imageUrl ?? row.result_image_url ?? '',
    modelId: row.model_id ?? undefined,
    itemIds,
    framing: row.framing as Framing,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  }
}

/**
 * إطلالات المستخدمة، وصورها موقّعة دفعة واحدة.
 *
 * السلّة خاصة، فالرابط المخزَّن مسار لا عنوان يُفتح. التوقيع الجماعي يوفّر
 * طلبًا لكل إطلالة.
 */
export async function fetchLooks(): Promise<SavedLook[]> {
  const db = requireSupabase()
  const userId = await currentUserId()

  const { data, error } = await db
    .from('outfits')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = data as OutfitRow[]
  const signed = await signOutfitImages(userId, rows.map((row) => row.id))

  return rows.map((row) => toLook(row, signed[row.id]))
}

async function signOutfitImages(
  userId: string,
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const db = requireSupabase()

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrls(
      ids.map((id) => `${userId}/${id}`),
      SIGNED_URL_TTL,
    )
  // إطلالات بلا صور مرفوعة: ما نفشل القراءة كلها بسببها
  if (error || !data) return {}

  const urls: Record<string, string> = {}
  data.forEach((entry, index) => {
    const id = ids[index]
    if (id && entry.signedUrl && !entry.error) urls[id] = entry.signedUrl
  })
  return urls
}

/* ---------------- الكتابة ---------------- */

/**
 * يحوّل رابط الصورة المولّدة لملف قابل للرفع.
 *
 * `data:` و`blob:` كلاهما يُقرأ بـ`fetch` في نفس الصفحة. ورابط `https` خارجي
 * ما نرفعه — نتركه كما هو ونحفظه نصًّا.
 */
async function blobFromUrl(url: string): Promise<Blob | undefined> {
  if (!url.startsWith('data:') && !url.startsWith('blob:')) return undefined
  try {
    return await (await fetch(url)).blob()
  } catch {
    return undefined
  }
}

export async function insertLook(look: SavedLook, itemSlotOf: (id: string) => BodySlot) {
  const db = requireSupabase()
  const userId = await currentUserId()

  // الصورة أولًا: بلا مسار محفوظ تصير الإطلالة بلا وجه على أي جهاز آخر
  let storedImage: string | null = null
  const blob = await blobFromUrl(look.resultImageUrl)
  if (blob) {
    const path = `${userId}/${look.id}`
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type || 'image/png' })
    if (!error) storedImage = path
  } else if (look.resultImageUrl) {
    storedImage = look.resultImageUrl
  }

  const { error } = await db.from('outfits').insert({
    id: look.id,
    user_id: userId,
    number: look.number,
    name: look.name,
    occasion: look.occasion || null,
    result_image_url: storedImage,
    model_id: look.modelId ?? null,
    framing: look.framing,
    notes: look.notes ?? null,
    created_at: look.createdAt,
  })
  if (error) throw error

  if (look.itemIds.length === 0) return

  const { error: itemsError } = await db.from('outfit_items').insert(
    look.itemIds.map((itemId, position) => ({
      outfit_id: look.id,
      item_id: itemId,
      layer: itemSlotOf(itemId),
      position,
    })),
  )
  if (itemsError) throw itemsError
}

export async function renameLook(id: string, name: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from('outfits')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteLook(id: string): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()

  const { error } = await db.from('outfits').delete().eq('id', id)
  if (error) throw error

  // الصورة ما تسقط مع الصفّ — التخزين منفصل عن القاعدة
  await db.storage.from(BUCKET).remove([`${userId}/${id}`])
}

/** ميل القطعة في الجسم — يُشتق من فئتها، فما نطلبه من الواجهة. */
export const slotOfItemCategory = (categoryId: string): BodySlot => slotOfCategory(categoryId)
