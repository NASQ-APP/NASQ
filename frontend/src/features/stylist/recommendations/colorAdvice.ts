/**
 * «وش لون يضبط معها؟» — سؤالٌ لا يحتاج إطلالة كاملة.
 *
 * بناء ثلاث إطلالات لأجل سؤال عن لون يعطي جوابًا مثقلًا بما لم يُسأل عنه.
 * والجواب هنا **مصنَّف** لا مرصوف: آمن وأنيق وناعم وجريء — فتختار المستخدمة
 * حسب مزاجها لا حسب ترتيبنا.
 *
 * ونقول ما عندها منه قطع فعلاً: نصيحة بلون لا تملكه معلومةٌ لطيفة بلا فعل.
 */
import { ITEM_COLORS } from '@/domain/wardrobe'
import { readColor } from '../colors/colorSpace'
import { scoreColorHarmony, type ColorRelation } from '../colors/colorHarmony'
import type { WardrobeItem } from '@/domain/wardrobe'

export type AdviceTone = 'safe' | 'elegant' | 'soft' | 'bold'

export type ColorSuggestion = {
  name: string
  hex: string
  tone: AdviceTone
  relation: ColorRelation
  score: number
  /** كم قطعة عندها بهذا اللون — صفر يعني نصيحة بلا قطعة */
  ownedCount: number
}

const TONE_OF: Record<ColorRelation, AdviceTone> = {
  neutral: 'safe',
  monochromatic: 'safe',
  analogous: 'soft',
  'split-complementary': 'elegant',
  complementary: 'bold',
  triadic: 'bold',
  balanced: 'elegant',
}

export const TONE_LABEL: Record<AdviceTone, string> = {
  safe: 'آمن',
  elegant: 'أنيق',
  soft: 'ناعم',
  bold: 'جريء',
}

/**
 * ألوان تناسب القطعة، مرتّبة ومصنّفة.
 *
 * تُقاس على **لوحتنا** لا على العجلة كاملة: نصيحة بلون لا اسم له عندنا ولا
 * قطعة منه لا تُستعمل. واللوحة ستّ عشرة لونًا تغطي ما في الخزائن فعلاً.
 */
/**
 * نصيحة من **لون** لا من قطعة.
 *
 * «وش لون كعب يليق مع فستان أحمر؟» سؤالٌ عن نظرية لا عن مخزون. وكان الجواب
 * يشترط قطعةً في الخزانة، فيفشل السؤال كله لأن الحذاء غير مسجَّل — ويُقال لها
 * «ما لقيت حذاء» ردًّا على سؤال لم تسأله.
 *
 * فصلُ اللون عن القطعة يجعل النصيحة ممكنة دائمًا، وبقاءُ `ownedCount` يجعل
 * الفرق بين «هذا يليق» و«وهذا عندك» مرئيًّا في الجواب.
 */
export function colorAdviceForHex(
  hex: string,
  wardrobe: WardrobeItem[] = [],
  limit = 6,
  excludeId?: string,
): ColorSuggestion[] {
  const anchor = readColor(hex)

  const owned = new Map<string, number>()
  for (const piece of wardrobe) {
    if (piece.id === excludeId) continue
    const family = readColor(piece.colorHex).family
    owned.set(family, (owned.get(family) ?? 0) + 1)
  }

  return rankPalette(anchor, owned, limit)
}

export function colorAdviceFor(
  item: WardrobeItem,
  wardrobe: WardrobeItem[] = [],
  limit = 6,
): ColorSuggestion[] {
  const anchor = readColor(item.colorHex)

  const owned = new Map<string, number>()
  for (const piece of wardrobe) {
    if (piece.id === item.id) continue
    const family = readColor(piece.colorHex).family
    owned.set(family, (owned.get(family) ?? 0) + 1)
  }

  return rankPalette(anchor, owned, limit)
}

/** ترتيب اللوحة حول لونٍ مقروء — نواة النصيحة، بمدخلين لا نسختين. */
function rankPalette(
  anchor: ReturnType<typeof readColor>,
  owned: Map<string, number>,
  limit: number,
): ColorSuggestion[] {
  return ITEM_COLORS.filter((color) => color.name !== anchor.family)
    .map((color): ColorSuggestion => {
      const verdict = scoreColorHarmony(anchor.hex, color.hex)
      return {
        name: color.name,
        hex: color.hex,
        tone: TONE_OF[verdict.relation],
        relation: verdict.relation,
        score: verdict.score,
        ownedCount: owned.get(color.name) ?? 0,
      }
    })
    .toSorted((a, b) => {
      /*
        ما تملكه يتقدّم على المتساوي معه انسجامًا — النصيحة القابلة للتنفيذ
        الآن أنفع من نصيحة تحتاج تسوّقًا. والفرق يُكسر بالانسجام لا بالملكية
        وحدها، وإلا تصدّرت ألوانٌ عندها منها كثير وهي لا تناسب.
      */
      const gap = b.score - a.score
      if (Math.abs(gap) > 0.06) return gap
      return Math.sign(b.ownedCount) - Math.sign(a.ownedCount)
    })
    .slice(0, limit)
}

/** جملة واحدة تشرح النصيحة — قصيرة كما تُقال لا كتقرير. */
export function explainAdvice(item: WardrobeItem, suggestions: ColorSuggestion[]): string {
  if (suggestions.length === 0) return ''
  const anchor = readColor(item.colorHex).family
  const top = suggestions.slice(0, 3).map((suggestion) => suggestion.name)
  return `${anchor} يقبل ${top.join(' و')} — من الأهدأ إلى الأوضح.`
}
