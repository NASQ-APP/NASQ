/**
 * ذوق المستخدمة: ما لاحظناه من سلوكها، وما صرّحت به بنفسها.
 *
 * الاثنان منفصلان عمدًا — المُلاحَظ يُحسب من قطع التجربة ويتغيّر معها، والمُصرَّح
 * قرارها هي فيُخزَّن كما قالته. الدمج شأن الستايليست، مب شأن النوع.
 */
import type { ItemColor } from '@/domain/wardrobe'
import type { Gender } from '@/domain/shared/types'

/**
 * خلاصة ذوق المستخدمة، مشتقّة من **قطع التجربة**.
 *
 * ما تُكتب يدويًا ولا تُخزَّن منفصلة — تُحسب في `features/try-pieces/taste`،
 * فتبقى مصدرًا واحدًا للحقيقة ولا تتناقض مع ما أضافته.
 */
export type UserStyleProfile = {
  /** الألوان الأكثر تكرارًا في قطعها، الأكثر أولًا */
  colors: ItemColor[]
  /** وسوم الأسلوب — من التعارف الأول، ما تنشتق من القطعة */
  tags: string[]
  /** الفئات التي تتكرّر في قطعها */
  categoryIds: string[]
  /** عدد قطع التجربة التي بُني منها — صفر يعني ما فيه ذوق ملاحَظ بعد */
  fromCount: number
}

export const EMPTY_STYLE_PROFILE: UserStyleProfile = {
  colors: [],
  tags: [],
  categoryIds: [],
  fromCount: 0,
}

/** وسوم جاهزة — تختار منها المستخدمة بدل ما تكتب نصًا حرًّا. */
export const STYLE_TAGS = [
  'كاجوال',
  'رسمي',
  'مودست',
  'كلاسيكي',
  'بوهو',
  'رياضي',
  'سهرة',
  'مينيمال',
  'ستريت',
] as const


/* ---------------------- التعارف الأول ---------------------- */

/** ما تختاره المستخدمة لتتجنّبه — قيد صارم، مب تفضيلًا. */
export type AvoidRule = 'short' | 'tight' | 'sleeveless' | 'boldColor' | 'heels'

export const AVOID_RULES: { id: AvoidRule; name: string }[] = [
  { id: 'short', name: 'قصير' },
  { id: 'tight', name: 'ضيّق' },
  { id: 'sleeveless', name: 'بدون أكمام' },
  { id: 'boldColor', name: 'ألوان قوية' },
  { id: 'heels', name: 'كعب' },
]

/**
 * ما صرّحت به المستخدمة في التعارف الأول. **يُخزَّن** — لأنه قرارها هي، ولا
 * يمكن اشتقاقه من سلوكها.
 */
export type DeclaredStyle = {
  gender?: Gender
  colors: ItemColor[]
  tags: string[]
  contexts: string[]
  avoid: AvoidRule[]
  /** ملاحظة حرّة — سياق ليّن، ما يتجاوز القيود */
  note?: string
  confidence: number
  completedAt?: string
}

export const EMPTY_DECLARED: DeclaredStyle = {
  colors: [],
  tags: [],
  contexts: [],
  avoid: [],
  confidence: 0,
}
