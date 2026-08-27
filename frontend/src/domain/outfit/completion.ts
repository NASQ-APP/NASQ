/**
 * موضع القطعة على الجسم.
 *
 * سؤال يتكرّر في الخزانة والستايليست وصفحة القطعة: هذي القطعة وين تُلبس؟
 * الجواب مشتق من فئتها، فيعيش هنا مرة وحدة بدل ما يتكرّر في كل مستدعٍ.
 */
import { slotOfCategory } from '@/domain/wardrobe/categories'
import type { BodySlot } from '@/domain/shared/types'
import type { WardrobeItem } from '@/domain/wardrobe/types'

export const slotOf = (item: WardrobeItem): BodySlot => slotOfCategory(item.categoryId)

export const toGarment = (item: WardrobeItem): TryOnGarment => ({
  itemId: item.id,
  categoryId: item.categoryId,
  slot: slotOf(item),
  colorHex: item.colorHex,
  shape: item.shape,
  name: item.name,
  imageUrl: item.imageUrl,
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
