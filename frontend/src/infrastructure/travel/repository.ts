/**
 * رحلات المستخدمة على الخادم — أربعة جداول لكيان واحد.
 *
 * `trips` الرحلة، و`trip_days` أيامها، و`trip_day_items` لبس كل يوم،
 * و`trip_packed` ما أُشّر إنه انحزم. والمجال يرى **رحلة واحدة** فيها كل ذلك.
 *
 * **قائمة الشنطة مشتقّة لا مكتوبة** (T-04): `trip_packed` يحفظ التأشير فقط،
 * أما أي القطع تظهر في القائمة فيحسبه المجال من أيام الرحلة.
 *
 * أيام الرحلة تُعرَف بمعرّفها في القاعدة وبرقمها في المجال. فالكتابة على يوم
 * تحتاج ترجمة الرقم لمعرّف — نقرأها عند الحاجة بدل ما نحملها في الواجهة،
 * لأن حملها يعني معرّفات في المجال لا معنى لها فيه.
 */
import { requireSupabase } from '@/infrastructure/supabase'
import type { Trip, TripDay } from '@/domain/travel'
import type { Tables } from '@/infrastructure/supabase'

type TripRow = Tables<'trips'> & {
  trip_days: {
    id: string
    day: number
    label: string | null
    trip_day_items: { item_id: string }[] | null
  }[] | null
  trip_packed: { item_id: string }[] | null
}

const COLUMNS = '*, trip_days(id, day, label, trip_day_items(item_id)), trip_packed(item_id)'

async function currentUserId(): Promise<string> {
  const db = requireSupabase()
  const { data, error } = await db.auth.getUser()
  if (error || !data.user) throw new Error('no-session')
  return data.user.id
}

const toTrip = (row: TripRow): Trip => ({
  id: row.id,
  city: row.city,
  cityLatin: row.city_latin,
  from: row.date_from,
  to: row.date_to,
  days: (row.trip_days ?? [])
    .toSorted((a, b) => a.day - b.day)
    .map(
      (day): TripDay => ({
        day: day.day,
        label: day.label ?? '',
        itemIds: (day.trip_day_items ?? []).map((entry) => entry.item_id),
      }),
    ),
  packed: (row.trip_packed ?? []).map((entry) => entry.item_id),
  createdAt: row.created_at,
})

export async function fetchTrips(): Promise<Trip[]> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('trips')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TripRow[]).map(toTrip)
}

/** الرحلة وأيامها معًا — اليوم بلا رحلته صفّ يتيم يرفضه المفتاح الأجنبي. */
export async function insertTrip(trip: Trip): Promise<void> {
  const db = requireSupabase()
  const userId = await currentUserId()

  const { error } = await db.from('trips').insert({
    id: trip.id,
    user_id: userId,
    city: trip.city,
    city_latin: trip.cityLatin,
    date_from: trip.from,
    date_to: trip.to,
    created_at: trip.createdAt,
  })
  if (error) throw error

  if (trip.days.length === 0) return
  const { error: daysError } = await db.from('trip_days').insert(
    trip.days.map((day) => ({ trip_id: trip.id, day: day.day, label: day.label || null })),
  )
  if (daysError) throw daysError
}

export async function deleteTrip(id: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db.from('trips').delete().eq('id', id)
  if (error) throw error
}

/** معرّف يوم بعينه — الجسر بين رقم اليوم في المجال ومفتاحه في القاعدة. */
async function dayIdOf(tripId: string, day: number): Promise<string | undefined> {
  const db = requireSupabase()
  const { data, error } = await db
    .from('trip_days')
    .select('id')
    .eq('trip_id', tripId)
    .eq('day', day)
    .maybeSingle()
  if (error) throw error
  return data?.id
}

/**
 * لبس يوم كامل — نمسح ثم نكتب.
 *
 * الواجهة تعطي القائمة النهائية لا فرقًا، فحساب المضاف والمحذوف عندنا يضيف
 * منطقًا بلا مقابل: اليوم قطع معدودة، والمسح والكتابة طلبان ثابتان.
 */
export async function setDayItems(
  tripId: string,
  day: number,
  itemIds: string[],
): Promise<void> {
  const db = requireSupabase()
  const dayId = await dayIdOf(tripId, day)
  if (!dayId) return

  const { error } = await db.from('trip_day_items').delete().eq('trip_day_id', dayId)
  if (error) throw error

  if (itemIds.length === 0) return
  const { error: insertError } = await db
    .from('trip_day_items')
    .insert(itemIds.map((itemId) => ({ trip_day_id: dayId, item_id: itemId })))
  if (insertError) throw insertError
}

export async function setDayLabel(tripId: string, day: number, label: string): Promise<void> {
  const db = requireSupabase()
  const { error } = await db
    .from('trip_days')
    .update({ label })
    .eq('trip_id', tripId)
    .eq('day', day)
  if (error) throw error
}

/** التأشير على قطعة أنها انحزمت — أو رفعه. */
export async function setPacked(
  tripId: string,
  itemId: string,
  packed: boolean,
): Promise<void> {
  const db = requireSupabase()

  if (!packed) {
    const { error } = await db
      .from('trip_packed')
      .delete()
      .eq('trip_id', tripId)
      .eq('item_id', itemId)
    if (error) throw error
    return
  }

  // نفس القطعة تُؤشَّر مرتين بضغطتين سريعتين — `upsert` يتحمّلها بلا خطأ
  const { error } = await db
    .from('trip_packed')
    .upsert({ trip_id: tripId, item_id: itemId }, { onConflict: 'trip_id,item_id' })
  if (error) throw error
}
