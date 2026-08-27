/**
 * قراءة حالة الرحلة.
 *
 * الرحلة نصفها تخطيط ونصفها حزم، والواجهة تحتاج تقول أين وصلت المستخدمة من
 * الاثنين بلا ما تعيد العدّ في كل مكوّن. الحساب هنا نقي فيُختبر بلا DOM.
 *
 * قائمة الشنطة **مشتقة** من قطع الأيام، ما تُكتب يدويًا (T-04) — فالمجموعات
 * كذلك مشتقّة، ما فيها ترتيب يدوي يتعفّن مع الوقت.
 */
import { SLOT_FILTERS, slotOfCategory } from '@/domain/wardrobe'
import { packingList } from './types'
import type { BodySlot, WardrobeItem } from '@/domain/wardrobe'
import type { Trip } from './types'

export type TripProgress = {
  totalDays: number
  plannedDays: number
  /** نسبة الأيام المخطّطة — 0 إلى 1 */
  planned: number
  /** أرقام الأيام الفاضية، بترتيبها */
  emptyDays: number[]
  pieces: number
  packedPieces: number
  /** نسبة ما حُزم من قائمة الشنطة — 0 إلى 1 */
  packed: number
  /** كل الأيام مخطّطة وكل القطع محزومة */
  done: boolean
}

const ratio = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole)

export function tripProgress(trip: Trip): TripProgress {
  const pieces = packingList(trip)
  // القطع المحزومة تُحسب من القائمة المشتقّة: قطعة أُزيلت من الأيام ما تُعدّ
  const packedPieces = pieces.filter((id) => trip.packed.includes(id))
  const plannedDays = trip.days.filter((day) => day.itemIds.length > 0)

  return {
    totalDays: trip.days.length,
    plannedDays: plannedDays.length,
    planned: ratio(plannedDays.length, trip.days.length),
    emptyDays: trip.days.filter((day) => day.itemIds.length === 0).map((day) => day.day),
    pieces: pieces.length,
    packedPieces: packedPieces.length,
    packed: ratio(packedPieces.length, pieces.length),
    done: plannedDays.length === trip.days.length && packedPieces.length === pieces.length,
  }
}

export type PackingGroup = {
  slot: BodySlot
  label: string
  items: WardrobeItem[]
}

/**
 * قائمة الشنطة مقسّمة بحسب موضع القطعة — الشنطة تُحزم بالمجموعات (أحذية مع
 * أحذية) لا بترتيب إضافتها للأيام. الترتيب من `SLOT_FILTERS` فيطابق ترتيب
 * فلاتر الخزانة في كل مكان.
 */
export function packingGroups(trip: Trip, wardrobe: WardrobeItem[]): PackingGroup[] {
  const byId = new Map(wardrobe.map((item) => [item.id, item]))
  const pieces = packingList(trip)
    .map((id) => byId.get(id))
    .filter((item): item is WardrobeItem => Boolean(item))

  return SLOT_FILTERS.filter((filter) => filter.slot !== 'all')
    .map((filter) => ({
      slot: filter.slot as BodySlot,
      label: filter.name,
      items: pieces.filter((item) => slotOfCategory(item.categoryId) === filter.slot),
    }))
    .filter((group) => group.items.length > 0)
}

/** أول يوم فاضي — يقود زر «كمّلي التخطيط». */
export const nextEmptyDay = (trip: Trip): number | undefined =>
  trip.days.find((day) => day.itemIds.length === 0)?.day
