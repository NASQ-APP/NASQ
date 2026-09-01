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

/**
 * وسوم جاهزة — تُختار بدل كتابة نصّ حرّ.
 *
 * **مشتركة وخاصة.** أكثر الأوصاف تصف ذوقًا لا جسدًا فتصلح للاثنين، لكن بعضها
 * يخصّ واحدًا: «مودست» وصفٌ لخزانة امرأة، و«سمارت كاجوال» مفردة تُستعمل في
 * ملابس الرجال. وعرض قائمة واحدة على الاثنين يجعل نصفها بلا معنى لأحدهما.
 */
export const SHARED_TAGS = [
  'كاجوال',
  'رسمي',
  'كلاسيكي',
  'رياضي',
  'سهرة',
  'مينيمال',
  'ستريت',
] as const

export const FEMALE_TAGS = ['مودست', 'بوهو'] as const
export const MALE_TAGS = ['سمارت كاجوال', 'سبور شيك'] as const


/* ---------------------- التعارف الأول ---------------------- */

/** ما يُختار ليُتجنَّب — قيد صارم، مب تفضيلًا. */
export type AvoidRule =
  | 'short'
  | 'tight'
  | 'sleeveless'
  | 'boldColor'
  | 'heels'
  | 'pattern'

const RULE_NAMES: Record<AvoidRule, string> = {
  short: 'قصير',
  tight: 'ضيّق',
  sleeveless: 'بدون أكمام',
  boldColor: 'ألوان قوية',
  heels: 'كعب',
  pattern: 'نقشات',
}

const rule = (id: AvoidRule) => ({ id, name: RULE_NAMES[id] })

/**
 * القيود المعروضة لكل جنس.
 *
 * «كعب» قيدٌ لا معنى لعرضه على رجل، و«نقشات» أكثر ما يُتجنّب في ملابس الرجال
 * ولا يخطر في قائمة امرأة. والقائمة الواحدة كانت تعرض الأولى للجميع وتُسقط
 * الثانية عن الجميع.
 */
export const FEMALE_AVOID = (['short', 'tight', 'sleeveless', 'boldColor', 'heels'] as const).map(rule)
export const MALE_AVOID = (['short', 'tight', 'sleeveless', 'boldColor', 'pattern'] as const).map(rule)

/** القائمة الكاملة — تُقرأ لترجمة مُعرِّف مخزَّن إلى اسمه أيًّا كان صاحبه. */
export const AVOID_RULES: { id: AvoidRule; name: string }[] =
  (Object.keys(RULE_NAMES) as AvoidRule[]).map(rule)

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
