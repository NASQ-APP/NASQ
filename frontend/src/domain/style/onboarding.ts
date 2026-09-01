/**
 * أسئلة التعارف الأول.
 *
 * ثلاث خطوات، وكل خيار فيها **من مفردات المشروع نفسها** — الوسوم والمناسبات
 * والقيود والألوان. ما نخترع قائمة جديدة تعيش بمعزل، فما يصير عندنا مفردتان
 * لنفس الشيء.
 *
 * ما فيه استنتاج هنا: اختيار المستخدمة **هو** المُصرَّح، بلا وسيط.
 */
import { ITEM_COLORS, OCCASIONS } from '@/domain/wardrobe'
import { FEMALE_AVOID, FEMALE_TAGS, MALE_AVOID, MALE_TAGS, SHARED_TAGS } from './types'
import type { ItemColor } from '@/domain/wardrobe'
import type { DeclaredStyle } from './types'
import type { Gender } from '@/domain/shared/types'

/**
 * الاختيار **مفتوح**، والحد الأدنى واحد.
 *
 * كان لكل سؤال سقف: ثلاثة أوصاف وأربعة ألوان. والسقف يحكم على ذوق لا نعرفه —
 * من ترتاح لستة ألوان تُجبَر على إسقاط اثنين، فيصير الملف أفقر مما هي عليه.
 * والحد الأدنى يبقى واحدًا لا اثنين: جواب واحد صادق خير من ثانٍ يُنتزع لتُفتح
 * الخطوة التالية.
 */
export const MIN_TAGS = 1

/**
 * خيارات السؤال حسب الجنس.
 *
 * المناسبات والألوان مشتركة — «العمل» و«الكحلي» لا يخصّان أحدًا دون آخر.
 * أما الأوصاف والقيود فتختلف، ولهذا تُطلب بدالة لا تُقرأ ثابتًا.
 */
export const tagsFor = (gender: Gender | undefined): readonly string[] => [
  ...SHARED_TAGS,
  ...(gender === 'male' ? MALE_TAGS : FEMALE_TAGS),
]

export const avoidFor = (gender: Gender | undefined) =>
  gender === 'male' ? MALE_AVOID : FEMALE_AVOID

export const CONTEXT_OPTIONS = OCCASIONS

/**
 * ألوان التعارف — تسعة تمثّل العائلات اللونية، مب الستة عشر كلها.
 *
 * عرض اللوحة كاملة يزحم أول شاشة ويحوّل سؤالًا سريعًا إلى مهمة. التسعة هنا
 * تغطي: داكن · فاتح · دافئ محايد · بارد محايد · كحلي · أخضر · بني · أحمر
 * عميق · وردي هادئ. وكلها أسماء موجودة في `ITEM_COLORS` حرفيًا، فما تحتاج
 * ترجمة عند الترجيح.
 */
const FAMILY_NAMES = [
  'أسود',
  'أبيض',
  'بيج',
  'رمادي',
  'كحلي',
  'زيتي',
  'بني',
  'عنّابي',
  'وردي هادئ',
]

export const COLOR_OPTIONS: ItemColor[] = FAMILY_NAMES.map(
  (name) => ITEM_COLORS.find((color) => color.name === name) as ItemColor,
)

/**
 * ثقة الملف: كم خطوة أجابت عنها فعلًا.
 *
 * تُستعمل عند الدمج لتقرّر ثقل المُصرَّح مقابل المُلاحَظ. الألوان اختيارية
 * فما تدخل الحساب — تخطّيها ما ينقص ثقة الإجابة.
 */
/** الجنس — سؤال أول يخصّص المفردات. خياران فقط، وبلا افتراض. */
export const GENDER_OPTIONS: { id: Gender; name: string }[] = [
  { id: 'female', name: 'أنثى' },
  { id: 'male', name: 'ذكر' },
]

/** حدّ الملاحظة الحرّة — قصيرة عن قصد: سطر أو سطران يكفيان النموذج. */
export const MAX_NOTE = 280

/**
 * إضافة أو إزالة من قائمة اختيارات — بحدّ أعلى اختياري.
 *
 * تعيش هنا لا في مخزن التعارف لأن **شاشتين** تعدّلان نفس القوائم: التعارف على
 * الحالة الحيّة، والإعدادات على مسودّة تنتظر زر الحفظ. منطق واحد لهما يمنع
 * اختلافهما في الحدّ الأعلى بصمت.
 *
 * وبلوغ الحد يُرجع القائمة **كما هي** لا نسخة منها: الرسم يقارن بالمرجع، فنسخة
 * جديدة بلا تغيير تعني رسمًا بلا سبب.
 */
export function toggleIn<T>(
  list: T[],
  value: T,
  same: (a: T, b: T) => boolean,
  max?: number,
): T[] {
  if (list.some((entry) => same(entry, value))) return list.filter((entry) => !same(entry, value))
  if (max !== undefined && list.length >= max) return list
  return [...list, value]
}

export function confidenceOf(declared: DeclaredStyle): number {
  const answered = [
    declared.tags.length >= MIN_TAGS,
    declared.contexts.length > 0,
    // «ما عندي قيود» جواب صحيح: الختم هو ما يميّزه عن التخطّي
    Boolean(declared.completedAt),
  ].filter(Boolean).length

  return answered / 3
}
