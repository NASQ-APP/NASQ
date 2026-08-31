/**
 * خلاصة ذوق المستخدمة، مشتقّة من **قطع التجربة**.
 *
 * القطعة اللي تلصق رابطها هي أصدق إشارة عن ذوقها: هي اختارتها بنفسها من
 * متجر أو من بنترست، وما فيها تخمين. كانت الخلاصة تُبنى من صفحة «إلهامي»
 * — انحذفت الصفحة، وصارت قطع التجربة المكان الوحيد للمستورد.
 *
 * محسوبة دائمًا، ما تُخزَّن — فما تقدر تتناقض مع ما أضافته المستخدمة أو حذفته.
 */
import { useMemo } from 'react'
import { useWardrobe } from '@/features/wardrobe/store'
import { useOnboarding } from '@/features/onboarding/store'
import { categoryById } from '@/domain/wardrobe'
import { EMPTY_STYLE_PROFILE } from '@/domain/style/types'
import type { ItemColor, WardrobeItem } from '@/domain/wardrobe'
import type { UserStyleProfile } from '@/domain/style/types'

/**
 * ترتيب بالتكرار، الأكثر أولًا.
 *
 * القطعة المفضّلة تُحسب مرتين: ضغطة القلب قرار زائد على مجرّد الإضافة، فلونها
 * أولى من لون قطعة مرّت مرور الكرام.
 */
const rank = <T,>(values: { value: T; weight: number }[], key: (value: T) => string): T[] => {
  const counts = new Map<string, { value: T; count: number }>()
  for (const { value, weight } of values) {
    const k = key(value)
    const entry = counts.get(k) ?? { value, count: 0 }
    entry.count += weight
    counts.set(k, entry)
  }
  return [...counts.values()].toSorted((a, b) => b.count - a.count).map((entry) => entry.value)
}

/**
 * يبني ملف الذوق من قطع التجربة.
 *
 * `tags` ما تنشتق من القطعة — الوسم («كاجوال»، «مودست») حكم على الأسلوب، مب
 * حقلًا في المنتج. يجي من التعارف الأول حيث صرّحت به هي.
 */
export function styleProfileOf(
  pieces: WardrobeItem[],
  declaredTags: string[] = [],
): UserStyleProfile {
  if (pieces.length === 0) return { ...EMPTY_STYLE_PROFILE, tags: declaredTags.slice(0, 4) }

  const weighted = pieces.map((piece) => ({ piece, weight: piece.favorite ? 2 : 1 }))

  const colors = weighted.map(({ piece, weight }) => ({
    value: { name: piece.colorName, hex: piece.colorHex } as ItemColor,
    weight,
  }))

  const categoryIds = weighted
    .filter(({ piece }) => Boolean(categoryById(piece.categoryId)))
    .map(({ piece, weight }) => ({ value: piece.categoryId, weight }))

  return {
    colors: rank(colors, (color) => color.name).slice(0, 6),
    tags: declaredTags.slice(0, 4),
    categoryIds: rank(categoryIds, (id) => id),
    fromCount: pieces.length,
  }
}

/**
 * ملف الذوق الحالي — يتحدّث تلقائيًا مع كل قطعة تجربة تُضاف أو تُحذف.
 *
 * نختار المصفوفة الثابتة ونصفّيها في `useMemo`: المحدّد اللي يبني مصفوفة
 * جديدة كل رسم يخلي zustand v5 يعيد الرسم بلا نهاية.
 */
export const useStyleProfile = (): UserStyleProfile => {
  const items = useWardrobe((state) => state.items)
  const declaredTags = useOnboarding((state) => state.declared.tags)

  return useMemo(
    () => styleProfileOf(items.filter((item) => item.source === 'try'), declaredTags),
    [items, declaredTags],
  )
}
