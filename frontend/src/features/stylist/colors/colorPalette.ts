/**
 * لوحة الإطلالة — ٦٠ / ٣٠ / ١٠.
 *
 * ألوان متساوية القوة تتنازع، فالعين ما تلقى أين تستقرّ. القاعدة العملية أن
 * يحكم لونٌ المساحة الأكبر، ويسنده ثانٍ، ويأتي ثالثٌ لمسةً صغيرة.
 *
 * **والمساحة تُقرأ من موضع القطعة لا من تخمين**: الفستان والعلوي والسفلي هي
 * المساحة، والحذاء والحقيبة والإكسسوار هي اللمسة. فلا نحتاج قياس بكسل ولا
 * سؤال المستخدمة.
 */
import { slotOf } from '@/domain/outfit'
import { readColor } from './colorSpace'
import { scoreColorHarmony, type ColorRelation } from './colorHarmony'
import type { WardrobeItem } from '@/domain/wardrobe'

export type OutfitPalette = {
  dominant: string
  secondary?: string
  accent?: string
  /** وصف عربي قصير للاستراتيجية — يُعرض تحت اللوحة */
  strategy: string
  relation: ColorRelation
  /** كل ألوان الإطلالة بأسمائها، بترتيب الوزن */
  names: string[]
}

/** وزن الموضع في المساحة المرئية — الأكبر يحكم اللوحة. */
const AREA_WEIGHT: Record<string, number> = {
  full: 100,
  outer: 70,
  top: 60,
  bottom: 60,
  shoes: 20,
  bag: 15,
  accessory: 8,
}

const STRATEGY: Record<ColorRelation, string> = {
  monochromatic: 'درجات من لون واحد',
  analogous: 'ألوان متجاورة',
  complementary: 'تقابل متوازن',
  'split-complementary': 'تقابل مخفَّف',
  triadic: 'ثلاثيّ جريء',
  neutral: 'محايد وأساس',
  balanced: 'لوحة متباعدة',
}

/**
 * يبني لوحة الإطلالة من قطعها.
 *
 * القطع بلا لون معروف تُستبعد من اللوحة ولا تُخمَّن: لوحة تقول لونًا ليس في
 * الإطلالة أسوأ من لوحة ناقصة.
 */
export function buildPalette(items: WardrobeItem[]): OutfitPalette | undefined {
  const coloured = items.filter((item) => Boolean(item.colorHex))
  if (coloured.length === 0) return undefined

  const ranked = coloured.toSorted(
    (a, b) => (AREA_WEIGHT[slotOf(b)] ?? 10) - (AREA_WEIGHT[slotOf(a)] ?? 10),
  )

  /*
    الألوان المتكرّرة تُدمج: فستان عنّابي وحذاء عنّابي لونٌ واحد في اللوحة لا
    اثنان، وعرضهما مرتين يوهم بتنوّع ليس موجودًا.
  */
  const unique: WardrobeItem[] = []
  for (const item of ranked) {
    if (!unique.some((kept) => kept.colorHex === item.colorHex)) unique.push(item)
  }

  const [dominant, secondary, accent] = unique

  // الاستراتيجية تُقرأ من علاقة الأقوى بالذي يليه — هما ما يحدّد شخصية اللوحة
  const relation = secondary
    ? scoreColorHarmony(dominant.colorHex, secondary.colorHex).relation
    : 'neutral'

  const names = unique.slice(0, 3).map((item) => readColor(item.colorHex).family)

  return {
    dominant: dominant.colorHex,
    secondary: secondary?.colorHex,
    accent: accent?.colorHex,
    strategy: STRATEGY[relation],
    relation,
    names,
  }
}
