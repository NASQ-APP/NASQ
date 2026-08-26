/**
 * الإكمال المحايد (A-02).
 *
 * القطعة الواحدة ما تُعرض أبدًا على جسم نصف عارٍ. القطع المضافة لازم تُقرأ
 * كملابس استوديو محايدة — سادة، بلا ماركة، وواضح إنها مو من خزانة المستخدمة.
 */
import { slotOfCategory } from '@/domain/wardrobe/categories'
import type { GarmentShape, WardrobeItem } from '@/domain/wardrobe/types'
import type { BodySlot } from '@/domain/shared/types'
import type { Framing, NeutralFiller, TryOnGarment } from './types'

/** درجات مسطّحة منخفضة التباين — حشو استوديو، ما تشبه قطعة تُشترى. */
const NEUTRAL_COLOR = {
  top: '#F0EFEC',
  bottom: '#4A4B50',
  shoes: '#CFCEC9',
} as const

export const NEUTRAL_SHAPE: Record<keyof typeof NEUTRAL_COLOR, GarmentShape> = {
  top: 'shirt',
  bottom: 'pants',
  shoes: 'flats',
}

export const slotOf = (item: WardrobeItem): BodySlot => slotOfCategory(item.categoryId)

export const toGarment = (item: WardrobeItem): TryOnGarment => ({
  itemId: item.id,
  categoryId: item.categoryId,
  slot: slotOf(item),
  colorHex: item.colorHex,
  shape: item.shape,
  name: item.name,
})

/**
 * يحسب وش ناقص الجسم.
 * القطعة الكاملة (فستان · عباية · ثوب) تغطي الجذع والساقين، فما يُضاف تحتها
 * علوي ولا سفلي.
 */
export function neutralCompletion(garments: TryOnGarment[], framing: Framing): NeutralFiller[] {
  const slots = new Set(garments.map((g) => g.slot))
  const fillers: NeutralFiller[] = []

  if (!slots.has('full')) {
    if (!slots.has('top')) {
      fillers.push({
        slot: 'top',
        colorHex: NEUTRAL_COLOR.top,
        reason: 'أضفنا قميصًا أبيض بسيطًا حتى تظهر القطعة المختارة على إطلالة كاملة.',
      })
    }
    if (!slots.has('bottom')) {
      fillers.push({
        slot: 'bottom',
        colorHex: NEUTRAL_COLOR.bottom,
        reason: 'أضفنا بنطلونًا محايدًا حتى يبقى التركيز على القطعة المختارة.',
      })
    }
  }

  if (!slots.has('shoes') && (framing === 'full' || framing === 'lower')) {
    fillers.push({
      slot: 'shoes',
      colorHex: NEUTRAL_COLOR.shoes,
      reason: 'حذاء محايد لإكمال الإطلالة.',
    })
  }

  return fillers
}
