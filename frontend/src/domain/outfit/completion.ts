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
