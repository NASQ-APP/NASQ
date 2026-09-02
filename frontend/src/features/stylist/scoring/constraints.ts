/**
 * القيود الصريحة — تُطبَّق **قبل** أي ترتيب، ولا يعلو عليها شيء.
 *
 * الفرق بين قيد وتفضيل: التفضيل يرجّح، والقيد يستبعد. من قالت «أتجنّب الكعب»
 * لا تريد كعبًا في المرتبة الأخيرة — تريده غائبًا. فالاستبعاد يسبق الحساب،
 * ولا ينقذ القطعةَ المستبعدة انسجامٌ لوني ولا ذوقٌ ملاحَظ.
 *
 * **وما لا نملك بياناته لا ندّعي فرضه.** `WardrobeItem` ما فيها قصّة ولا خامة
 * ولا طول أكمام، فقيود «ضيّق» و«بدون أكمام» و«نقشات» تبقى محفوظة وغير مطبَّقة
 * — وتُعلَن للمستخدمة بدل أن نصمت ونتركها تظن أنها مطبَّقة.
 */
import { readColor } from '../colors/colorSpace'
import type { AvoidRule } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

/**
 * «لون قوي» بالقياس لا بالاسم.
 *
 * المشبَع الفاقع هو ما يُقصَد، لا كل لون غير محايد: العنّابي الغامق لون واضح
 * وليس صارخًا، والفوشي المضيء هو المقصود.
 */
const isBoldColor = (item: WardrobeItem): boolean => {
  const color = readColor(item.colorHex)
  return !color.neutral && color.saturation > 0.55 && color.lightness > 0.25
}

/**
 * القيود التي نقدر على فرضها فعلاً، وكيف.
 *
 * `short` مطبَّق **جزئيًا**: الشورت يُعرف من شكله، أما الفستان القصير فلا —
 * ما فيه حقل يقول طوله. والجزئي معلن في `PARTIAL` فيُقال للمستخدمة.
 */
const ENFORCERS: Partial<Record<AvoidRule, (item: WardrobeItem) => boolean>> = {
  heels: (item) => item.shape === 'heels',
  boldColor: isBoldColor,
  short: (item) => item.shape === 'shorts',
}

export const ENFORCEABLE: AvoidRule[] = Object.keys(ENFORCERS) as AvoidRule[]

/** قيود نطبّقها على ما نعرفه فقط — الباقي منها خارج بياناتنا. */
export const PARTIAL: AvoidRule[] = ['short']

/** ما لا نقدر عليه أصلاً — يُقال ولا يُدَّعى. */
export const unenforceable = (avoid: AvoidRule[]): AvoidRule[] =>
  avoid.filter((rule) => !ENFORCEABLE.includes(rule))

/** هل تخالف هذي القطعة قيدًا صريحًا؟ */
export function violatesConstraint(item: WardrobeItem, avoid: AvoidRule[]): boolean {
  return avoid.some((rule) => ENFORCERS[rule]?.(item) ?? false)
}

/**
 * يستبعد ما يخالف القيود.
 *
 * **والقطعة المثبَّتة تنجو دائمًا**: المستخدمة اختارتها بنفسها الآن، واختيارها
 * الحاضر يعلو على قيد اختارته قبل شهر. استبعادها يعني أن نردّ عليها طلبًا
 * صريحًا بصمت.
 */
export function applyConstraints(
  items: WardrobeItem[],
  avoid: AvoidRule[],
  anchorId?: string,
): WardrobeItem[] {
  if (avoid.length === 0) return items
  return items.filter((item) => item.id === anchorId || !violatesConstraint(item, avoid))
}
