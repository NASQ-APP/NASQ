/**
 * ترتيب الإطلالة الحالية في خانات.
 *
 * الإطلالة تُقرأ كطبقات على الجسم لا كقائمة مسطّحة، فترتيب الخانات ثابت من
 * الأعلى للأسفل ثم المحمولات. والخانة **تقبل أي عدد**: الطبقات حقيقية (قميص
 * تحت كنزة)، وحصر الخانة بقطعة يقرّر عن المستخدمة بدل ما يخدمها.
 *
 * منطق نقي: يستقبل قطعًا ويرجّع خانات، بلا React ولا حالة.
 */
import { slotOfItem } from '@/domain/wardrobe'
import type { BodySlot, WardrobeItem } from '@/domain/wardrobe'

export type OutfitSlotId = BodySlot

export type OutfitSlotDefinition = {
  id: OutfitSlotId
  label: string
  /** نص زر الإضافة لما تكون الخانة فاضية */
  addLabel: string
}

/** ترتيب العرض: من الجذع للأسفل، ثم المحمول. */
export const OUTFIT_SLOTS: OutfitSlotDefinition[] = [
  { id: 'full', label: 'قطعة كاملة', addLabel: 'إضافة فستان أو عباية' },
  { id: 'top', label: 'العلوي', addLabel: 'إضافة قطعة علوية' },
  { id: 'bottom', label: 'السفلي', addLabel: 'إضافة قطعة سفلية' },
  { id: 'outer', label: 'الخارجي', addLabel: 'إضافة جاكيت' },
  { id: 'shoes', label: 'الأحذية', addLabel: 'إضافة حذاء' },
  { id: 'bag', label: 'الشنطة', addLabel: 'إضافة حقيبة' },
  { id: 'accessory', label: 'الإكسسوارات', addLabel: 'إضافة إكسسوار' },
]

export type FilledSlot = OutfitSlotDefinition & { items: WardrobeItem[] }

/** يوزّع القطع المختارة على الخانات بالترتيب الثابت. */
export function toSlots(items: WardrobeItem[]): FilledSlot[] {
  return OUTFIT_SLOTS.map((slot) => ({
    ...slot,
    items: items.filter((item) => slotOfItem(item) === slot.id),
  }))
}

/** الخانات اللي فيها قطع — تُعرض أولاً، والفاضية تُعرض كدعوة للإضافة. */
export const filledSlots = (items: WardrobeItem[]): FilledSlot[] =>
  toSlots(items).filter((slot) => slot.items.length > 0)
