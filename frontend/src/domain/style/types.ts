/**
 * الإلهام: لوك أعجب المستخدمة، مب قطعة تملكها.
 *
 * الفرق جوهري — القطعة تدخل الخزانة أو «قطع التجربة»، أما الإلهام فمرجع
 * بصري يفهم منه الستايليست ذوقها. ما يُلبس ولا يُنسّق ولا يُشترى.
 */
import type { ItemColor } from '@/domain/wardrobe'

/** من وين جاء الإلهام. */
export type InspirationSource = 'upload' | 'pinterest' | 'link'

/** قطعة داخل اللوك — تُدخل يدويًا الآن، وتُستنتج من الصورة لاحقًا. */
export type LookPiece = {
  /** فئة من فئات المشروع، لو عرفناها */
  categoryId?: string
  /** ما كتبته المستخدمة أو ما قرأه المحلّل: «بليزر بيج» */
  label: string
  colorName?: string
  colorHex?: string
}

export type StyleInspiration = {
  id: string
  source: InspirationSource
  /** صورة بعيدة (بنترست) — الصور المرفوعة تُقرأ من مخزن الصور بالمعرّف */
  imageUrl?: string
  /** رابط الـPin الأصلي، للرجوع إليه */
  sourceLink?: string
  note?: string

  /** ألوان اللوك، مستخرجة من بكسلات الصورة */
  palette: ItemColor[]
  /** مكوّنات اللوك */
  pieces: LookPiece[]
  /** وسوم تختارها المستخدمة: كاجوال · رسمي · مودست … */
  tags: string[]

  addedAt: string
}

/**
 * خلاصة ذوق المستخدمة، مشتقّة من كل إلهاماتها.
 *
 * ما تُكتب يدويًا ولا تُخزَّن منفصلة — تُحسب من `StyleInspiration[]`، فتبقى
 * مصدرًا واحدًا للحقيقة ولا تتناقض مع ما أضافته.
 */
export type UserStyleProfile = {
  /** الألوان الأكثر تكرارًا في إلهاماتها، الأكثر أولًا */
  colors: ItemColor[]
  /** الوسوم الأكثر تكرارًا */
  tags: string[]
  /** الفئات التي تظهر في لوكاتها */
  categoryIds: string[]
  /** عدد الإلهامات التي بُني منها — صفر يعني ما فيه ذوق محفوظ بعد */
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
