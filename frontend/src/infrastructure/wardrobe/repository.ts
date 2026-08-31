/**
 * خزانة المستخدمة على الخادم.
 *
 * كل دالة هنا تكتب صفوفًا مملوكة لـ `auth.uid()`، وRLS على القاعدة يرفض أي
 * صفّ غيرها. فما نفلتر بالمستخدمة في الاستعلامات — **الفلترة على القاعدة**،
 * والاعتماد عليها أأمن من شرط في الواجهة يُنسى مرة.
 *
 * المعرّفات تُولَّد عندنا (`uuid()`): القطعة تُرسم في اللحظة بمعرّفها النهائي،
 * وإعادة إرسال نفس العملية تكتب نفس الصفّ بدل ما تكرّره.
 */
import { requireSupabase } from '@/infrastructure/supabase'
import { toClosetInsert, toItem, toItemInsert, toItemPatch, toWardrobe } from './mapping'
import type { ItemRowWithClosets } from './mapping'
import type { Wardrobe, WardrobeItem } from '@/domain/wardrobe'

/** أعمدة القطعة مع خزائنها — استعلام واحد بدل استعلامين ودمج يدوي. */
const ITEM_COLUMNS = '*, item_closets(closet_id)'

/** مُعرِّف المستخدمة من الجلسة القائمة. */
async function currentUserId(): Promise<string> {
  const db = requireSupabase()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new Error('no-session')
  return data.user.id
}

/* ---------------- القراءة ---------------- */

export type WardrobeSnapshot = {
  wardrobes: Wardrobe[]
  items: WardrobeItem[]
}

/**
 * كل ما تملكه المستخدمة، باستعلامين متوازيين.
 *
 * القطع تُقرأ بالأحدث أولاً لأن الواجهة تعرضها كذلك، والخزائن بترتيب العرض
 * الذي اختارته — الترتيب من القاعدة لا من الواجهة، فيبقى واحدًا على كل جهاز.
 */
export async function fetchWardrobe(): Promise<WardrobeSnapshot> {
  const db = requireSupabase()

  const [closets, items] = await Promise.all([
    db.from('closets').select('*').order('sort_order').order('created_at'),
    db.from('items').select(ITEM_COLUMNS).order('created_at', { ascending: false }),
  ])

  if (closets.error) throw closets.error
  if (items.error) throw items.error

  return {
    wardrobes: closets.data.map(toWardrobe),
    items: (items.data as ItemRowWithClosets[]).map(toItem),
  }
}

/* ---------------- الخزائن ---------------- */

export async function insertWardrobe(wardrobe: Wardrobe, sortOrder: number): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()
  const { error } = await db.from('closets').insert(toClosetInsert(wardrobe, userId, sortOrder))
  if (error) throw error
}

export async function renameWardrobe(
  id: string,
  name: string,
  nameLatin?: string,
): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from('closets')
    .update({
      name,
      ...(nameLatin === undefined ? {} : { name_latin: nameLatin }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

/**
 * حذف الخزانة **لا يحذف قطعها** — تنتقل لخزانة بديلة.
 *
 * `item_closets` يسقط مع الخزانة بـ CASCADE، فلو اكتفينا بالحذف صارت القطع
 * بلا خزانة وضاعت من الواجهة. فننقلها أولاً ثم نحذف: القطعة أغلى من التنظيم.
 */
export async function deleteWardrobe(id: string, fallbackId: string | null): Promise<void> {
  const db = requireSupabase()

  if (fallbackId) {
    const { data, error } = await db
      .from('item_closets')
      .select('item_id')
      .eq('closet_id', id)
    if (error) throw error

    if (data.length > 0) {
      const moved = data.map((row) => ({ item_id: row.item_id, closet_id: fallbackId }))
      const { error: moveError } = await db
        .from('item_closets')
        .upsert(moved, { onConflict: 'item_id,closet_id' })
      if (moveError) throw moveError
    }
  }

  const { error } = await db.from('closets').delete().eq('id', id)
  if (error) throw error
}

/* ---------------- القطع ---------------- */

export async function insertItem(item: WardrobeItem): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()

  const { error } = await db.from('items').insert(toItemInsert(item, userId))
  if (error) throw error

  if (item.wardrobeId) {
    const { error: linkError } = await db
      .from('item_closets')
      .insert({ item_id: item.id, closet_id: item.wardrobeId })
    if (linkError) throw linkError
  }
}

export async function updateItem(id: string, patch: Partial<WardrobeItem>): Promise<void> {
  const db = requireSupabase()

  const row = toItemPatch(patch)
  if (Object.keys(row).length > 0) {
    const { error } = await db
      .from('items')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  // الخزانة علاقة، فتغييرها ما يمرّ على أعمدة القطعة
  if ('wardrobeId' in patch) await linkItemToWardrobe(id, patch.wardrobeId ?? null)
}

/** ينقل القطعة لخزانة واحدة — يمسح ارتباطاتها السابقة أولاً. */
export async function linkItemToWardrobe(
  itemId: string,
  wardrobeId: string | null,
): Promise<void> {
  const db = requireSupabase()

  const { error } = await db.from('item_closets').delete().eq('item_id', itemId)
  if (error) throw error

  if (!wardrobeId) return
  const { error: linkError } = await db
    .from('item_closets')
    .insert({ item_id: itemId, closet_id: wardrobeId })
  if (linkError) throw linkError
}

/** نقل قطعة تجربة للخزانة يحوّلها لقطعة مملوكة — قرار صريح من المستخدمة. */
export async function moveItem(itemId: string, wardrobeId: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from('items')
    .update({ source: 'wardrobe', updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error

  await linkItemToWardrobe(itemId, wardrobeId)
}

export async function deleteItem(id: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from('items').delete().eq('id', id)
  if (error) throw error
}

export async function setFavorite(id: string, favorite: boolean): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from('items').update({ is_favorite: favorite }).eq('id', id)
  if (error) throw error
}

/* ---------------- الحذف الجماعي ---------------- */

export async function deleteAllItems(): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()
  const { error } = await db.from('items').delete().eq('user_id', userId)
  if (error) throw error
}

export async function deleteEverything(): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()

  // القطع أولًا: حذف الخزانة ينقل قطعها لا يحذفها، فلو عكسنا بقيت يتيمة
  const { error: itemsError } = await db.from('items').delete().eq('user_id', userId)
  if (itemsError) throw itemsError

  const { error } = await db.from('closets').delete().eq('user_id', userId)
  if (error) throw error
}
