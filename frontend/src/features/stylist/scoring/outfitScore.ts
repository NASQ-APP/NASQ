/**
 * ترتيب الإطلالات — أوزان معلنة، لا حدس.
 *
 * الأوزان مكتوبة هنا في مكان واحد ليُقرأ القرار ويُعدَّل: أي عامل رجّح هذي
 * الإطلالة على تلك، وكم وزنه. ورقمٌ مخبّأ في شرط داخل دالة لا يُراجَع.
 *
 * **ونظرية الألوان آخر العوامل وزنًا لا أوّلها.** العجلة إرشاد إحصائي، وذوق
 * المستخدمة وسياقها أصدق منها عنها. فترتيبنا: قيدها ← ذوقها ← سياقها ← توافق
 * القطع ← اللون.
 */
import { slotOf } from '@/domain/outfit'
import { scoreColorHarmony } from '../colors/colorHarmony'
import { readColor } from '../colors/colorSpace'
import type { StylistContext, StylistOccasion } from '../context/stylistContext'
import type { WardrobeItem } from '@/domain/wardrobe'

export type ScoreBreakdown = {
  style: number
  occasion: number
  color: number
  preference: number
  balance: number
  total: number
}

/**
 * الأوزان — مجموعها واحد.
 *
 * الذوق أثقل عامل: الإطلالة الصحيحة لونيًا التي لا تشبهها لن تُلبس. والتوازن
 * (اكتمال الإطلالة) يليه لأن إطلالة ناقصة ليست إطلالة.
 */
export const WEIGHTS = {
  style: 0.25,
  occasion: 0.2,
  color: 0.2,
  preference: 0.15,
  balance: 0.2,
} as const

/* ----------------------------- الذوق ----------------------------- */

/**
 * قرب الإطلالة من ذوقها المصرَّح.
 *
 * الألوان المصرَّحة هي الإشارة الوحيدة القابلة للقياس عندنا: الوسوم («كلاسيكي»)
 * ما يقابلها حقل في القطعة، فربطها بالقطع تخمينٌ لا قياس.
 */
function styleScore(items: WardrobeItem[], context: StylistContext): number {
  const liked = new Set(context.declared.colors.map((color) => color.name))
  const observed = new Set(context.observed.colors.map((color) => color.name))

  if (liked.size === 0 && observed.size === 0) return 0.5

  const hits = items.filter((item) => {
    const family = readColor(item.colorHex).family
    // المصرَّح يزن ضِعف المُلاحَظ: قالته بنفسها، ولم نستنتجه عنها
    return liked.has(family) || liked.has(item.colorName)
  }).length

  const observedHits = items.filter((item) => observed.has(item.colorName)).length

  const score = (hits * 2 + observedHits) / (items.length * 2)
  return Math.min(1, score)
}

/* ---------------------------- المناسبة ---------------------------- */

/** ما يليق بكل مناسبة — من الموضع والشكل، وهما ما نملكه فعلاً. */
const OCCASION_FIT: Record<StylistOccasion, (item: WardrobeItem) => number> = {
  work: (item) => {
    const neutral = readColor(item.colorHex).neutral
    const casual = item.shape === 'shorts' || item.shape === 'hoodie' || item.shape === 'tee'
    return (neutral ? 0.6 : 0.35) + (casual ? -0.25 : 0.25)
  },
  evening: (item) => {
    const dressy =
      slotOf(item) === 'full' || item.shape === 'heels' || item.shape === 'clutch'
    const casual = item.shape === 'sneakers' || item.shape === 'hoodie' || item.shape === 'jeans'
    return 0.5 + (dressy ? 0.4 : 0) + (casual ? -0.35 : 0)
  },
  casual: (item) => {
    const relaxed =
      item.shape === 'tee' || item.shape === 'jeans' || item.shape === 'sneakers' ||
      item.shape === 'hoodie'
    return 0.5 + (relaxed ? 0.3 : 0)
  },
  travel: (item) => {
    const practical =
      item.shape === 'sneakers' || item.shape === 'jeans' || item.shape === 'tee' ||
      item.shape === 'tote'
    const impractical = item.shape === 'heels' || item.shape === 'clutch'
    return 0.5 + (practical ? 0.3 : 0) + (impractical ? -0.3 : 0)
  },
  any: () => 0.5,
}

function occasionScore(items: WardrobeItem[], occasion: StylistOccasion): number {
  if (items.length === 0) return 0
  const fit = OCCASION_FIT[occasion]
  const sum = items.reduce((total, item) => total + Math.max(0, Math.min(1, fit(item))), 0)
  return sum / items.length
}

/* ----------------------------- اللون ----------------------------- */

/**
 * انسجام الإطلالة = متوسط علاقات كل زوج.
 *
 * القياس بالأزواج لا بالمجموع: ثلاثة ألوان قد ينسجم كلٌّ منها مع الأساس
 * ويتصارع اثنان منها معًا، والمتوسط الزوجي يلتقط ذلك.
 */
function colorScore(items: WardrobeItem[]): number {
  const coloured = items.filter((item) => Boolean(item.colorHex))
  if (coloured.length < 2) return 0.6

  let total = 0
  let pairs = 0
  for (let i = 0; i < coloured.length; i++) {
    for (let j = i + 1; j < coloured.length; j++) {
      total += scoreColorHarmony(coloured[i].colorHex, coloured[j].colorHex).score
      pairs++
    }
  }
  return pairs === 0 ? 0.6 : total / pairs
}

/* --------------------------- تفضيلاتها --------------------------- */

/** المفضّلة والأحدث ترجّح — ما لُبس كثيرًا يُحبّ غالبًا. */
function preferenceScore(items: WardrobeItem[]): number {
  if (items.length === 0) return 0
  const favourites = items.filter((item) => item.favorite).length
  return Math.min(1, 0.4 + favourites / items.length)
}

/* --------------------------- اكتمالها --------------------------- */

/**
 * هل الإطلالة إطلالة؟
 *
 * علوي وسفلي (أو قطعة كاملة) وحذاء هي الحدّ الأدنى. وما دونه ليس خيارًا
 * ناقصًا بل ليس خيارًا — عرضه يكلّف المستخدمة وقتًا على شيء لا تلبسه.
 */
function balanceScore(items: WardrobeItem[]): number {
  const slots = new Set(items.map(slotOf))
  const covered = slots.has('full') || (slots.has('top') && slots.has('bottom'))
  if (!covered) return 0

  let score = 0.6
  if (slots.has('shoes')) score += 0.25
  if (slots.has('bag') || slots.has('accessory') || slots.has('outer')) score += 0.15
  return Math.min(1, score)
}

/* ---------------------------- المجموع ---------------------------- */

export function scoreOutfit(items: WardrobeItem[], context: StylistContext): ScoreBreakdown {
  const style = styleScore(items, context)
  const occasion = occasionScore(items, context.occasion)
  const color = colorScore(items)
  const preference = preferenceScore(items)
  const balance = balanceScore(items)

  const total =
    style * WEIGHTS.style +
    occasion * WEIGHTS.occasion +
    color * WEIGHTS.color +
    preference * WEIGHTS.preference +
    balance * WEIGHTS.balance

  return { style, occasion, color, preference, balance, total }
}
