/**
 * ترتيب الإطلالة الحالية في خانات.
 *
 * الإطلالة تُقرأ كطبقات على الجسم لا كقائمة مسطّحة، فترتيب الخانات ثابت من
 * الأعلى للأسفل ثم المحمولات. وخانة واحدة لكل موضع — عدا الإكسسوارات.
 *
 * منطق نقي: يستقبل قطعًا ويرجّع خانات، بلا React ولا حالة.
 */
import { slotOfItem } from '@/domain/wardrobe'
import type { BodySlot, WardrobeItem } from '@/domain/wardrobe'

export type OutfitSlotId = BodySlot

export type OutfitSlotDefinition = {
  id: OutfitSlotId
  label: string
  /** يقبل أكثر من قطعة؟ الإكسسوارات فقط. */
  multiple: boolean
  /** نص زر الإضافة لما تكون الخانة فاضية */
  addLabel: string
}

/** ترتيب العرض: من الجذع للأسفل، ثم المحمول. */
export const OUTFIT_SLOTS: OutfitSlotDefinition[] = [
  { id: 'full', label: 'قطعة كاملة', multiple: false, addLabel: 'إضافة فستان أو عباية' },
  { id: 'top', label: 'العلوي', multiple: false, addLabel: 'إضافة قطعة علوية' },
  { id: 'bottom', label: 'السفلي', multiple: false, addLabel: 'إضافة قطعة سفلية' },
  { id: 'outer', label: 'الخارجي', multiple: false, addLabel: 'إضافة جاكيت' },
  { id: 'shoes', label: 'الأحذية', multiple: false, addLabel: 'إضافة حذاء' },
  { id: 'bag', label: 'الشنطة', multiple: false, addLabel: 'إضافة حقيبة' },
  { id: 'accessory', label: 'الإكسسوارات', multiple: true, addLabel: 'إضافة إكسسوار' },
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

/**
 * القطعة اللي راح تُستبدل لو أضفنا `candidate`.
 *
 * القطعة الكاملة (فستان · عباية · ثوب) تغطي الجذع والساقين، فإضافتها تتعارض
 * مع العلوي والسفلي معًا — والعكس صحيح. بدون هذا المنطق تتكدّس القطع فوق
 * بعضها بلا معنى.
 */
export function conflictsWith(candidate: WardrobeItem, current: WardrobeItem[]): WardrobeItem[] {
  const slot = slotOfItem(candidate)
  const definition = OUTFIT_SLOTS.find((item) => item.id === slot)
  if (definition?.multiple) return []

  const covered: BodySlot[] =
    slot === 'full' ? ['full', 'top', 'bottom'] : slot === 'top' || slot === 'bottom' ? [slot, 'full'] : [slot]

  return current.filter(
    (item) => item.id !== candidate.id && covered.includes(slotOfItem(item)),
  )
}
