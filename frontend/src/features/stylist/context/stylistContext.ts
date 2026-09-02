/**
 * ما يعرفه الستايليست عن صاحبته قبل أن يقترح شيئًا.
 *
 * **العطل الذي يعالجه هذا الملف**: التعارف الأول يسأل عن الألوان والمناسبات
 * والقيود ويحفظها كلها في `DeclaredStyle` — ثم لا يقرأ منها أحد إلا `gender`
 * و`tags`. المستخدمة تقول «أتجنّب الكعب» فيقترح عليها كعبًا، وتقول «أحب
 * البيج» فلا يفرّق. الإجابات محفوظة، والسؤال كان عبثًا.
 *
 * والطبقات مرتّبة بالأولوية عمدًا:
 *
 *   ١. القيد الصريح   — ما قالته صراحةً. لا يُخالَف أبدًا.
 *   ٢. تفضيلها        — ما اختارته. يعلو على القاعدة العامة.
 *   ٣. السياق         — المناسبة والطقس.
 *   ٤. توافق القطع    — هل تُلبس معًا أصلاً.
 *   ٥. نظرية الألوان  — إرشاد أخير يرجّح بين المتكافئات.
 *
 * وهذا الترتيب هو الفرق بين ستايليست يخدمها وآخر يملي عليها.
 */
import { EMPTY_DECLARED, type AvoidRule, type DeclaredStyle } from '@/domain/style/types'
import { EMPTY_STYLE_PROFILE, type UserStyleProfile } from '@/domain/style/types'
import type { WardrobeItem } from '@/domain/wardrobe'

/** المناسبة المطلوبة — تُشتقّ من الطلب أو من `contexts` المصرَّحة. */
export type StylistOccasion = 'work' | 'casual' | 'evening' | 'travel' | 'any'

export type StylistContext = {
  /** ما صرّحت به في التعارف — الأعلى أولوية */
  declared: DeclaredStyle
  /** ما لاحظناه من قطعها — يرجّح ولا يقيّد */
  observed: UserStyleProfile
  /** القطع المتاحة للتنسيق — خزانتها وقطع التجربة */
  wardrobe: WardrobeItem[]
  /** القطعة المثبَّتة، إن كان التنسيق حولها */
  anchor?: WardrobeItem
  occasion: StylistOccasion
  /** درجة الحرارة إن توفّرت — لا نخترعها */
  temperatureC?: number
}

export const EMPTY_CONTEXT: StylistContext = {
  declared: EMPTY_DECLARED,
  observed: EMPTY_STYLE_PROFILE,
  wardrobe: [],
  occasion: 'any',
}

/**
 * القيود التي نقدر على تطبيقها فعلاً.
 *
 * **لا ندّعي ما لا نملك بياناته.** `WardrobeItem` ما فيها `fit` ولا `material`
 * ولا طول الأكمام، فقيود «ضيّق» و«قصير» و«بدون أكمام» مخزَّنة ولا يمكن فرضها
 * — ادّعاء فرضها كذبة أسوأ من الاعتراف بالعجز.
 *
 * ما نقدر عليه اليوم:
 *   - `heels`      → من فئة القطعة (كعب فئة مستقلة عندنا)
 *   - `boldColor`  → من `colorHex` بالحساب لا بالاسم
 *
 * والباقي يبقى معلنًا في `unenforceable` فتعرف الواجهة أن تقوله بدل أن تصمت.
 */
export const ENFORCEABLE_AVOID: AvoidRule[] = ['heels', 'boldColor']

export const unenforceableAvoid = (avoid: AvoidRule[]): AvoidRule[] =>
  avoid.filter((rule) => !ENFORCEABLE_AVOID.includes(rule))

/**
 * المناسبة من `contexts` المصرَّحة حين لا يقولها الطلب.
 *
 * المستخدمة تختار مناسباتها الشائعة في التعارف، فهي أصدق افتراض من «أي شيء».
 */
export function defaultOccasion(declared: DeclaredStyle): StylistOccasion {
  const contexts = declared.contexts.map((value) => value.trim())

  if (contexts.some((value) => /دوام|عمل|جامعة|مكتب/.test(value))) return 'work'
  if (contexts.some((value) => /مناسب|عرس|حفل|سهرة|عشاء/.test(value))) return 'evening'
  if (contexts.some((value) => /سفر|رحل/.test(value))) return 'travel'
  if (contexts.length > 0) return 'casual'
  return 'any'
}

/** يجمع الطبقات في سياق واحد يُمرَّر لكل قرار. */
export function buildStylistContext(input: {
  declared: DeclaredStyle
  observed: UserStyleProfile
  wardrobe: WardrobeItem[]
  anchor?: WardrobeItem
  occasion?: StylistOccasion
  temperatureC?: number
}): StylistContext {
  return {
    declared: input.declared,
    observed: input.observed,
    wardrobe: input.wardrobe,
    anchor: input.anchor,
    occasion: input.occasion ?? defaultOccasion(input.declared),
    temperatureC: input.temperatureC,
  }
}
