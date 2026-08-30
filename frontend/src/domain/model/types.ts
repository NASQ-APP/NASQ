/**
 * الموديل والصورة الشخصية.
 *
 * الموديل المحفوظ **هوية دائمة**: نفس المواصفات تعطي نفس الشخص دائمًا، فما
 * نخترع شخصًا جديدًا مع كل توليد. البذرة `seed` تقفل هذي الهوية عند المزوّد
 * الحقيقي كمان (المبدأ ٣).
 */
import type { Gender } from '@/domain/shared/types'
import type { BodyParameters } from '@/domain/tryon'

export type SkinTone = {
  id: string
  name: string
  hex: string
}

/**
 * مواصفات الموديل.
 *
 * **قياسات لا أوصاف**: كانت شكل جسم وبشرة وشعر وفئة عمرية — تصنيفات تقريبية
 * ما يعرف النموذج وش يسوي فيها، وتُجبر المستخدمة على اختيار خانة ما تشبهها.
 * القياس رقم تعرفه المستخدمة عن نفسها، ويقدر النموذج يقرّب التناسب منه.
 *
 * والحقول **كلها اختيارية عدا الجنس**: من تعرف طولها فقط تكتبه وتمشي. إجبار
 * سبعة حقول قبل البدء يقتل التدفّق، والقياسات أصلاً إرشاد لا شرط.
 *
 * نفس شكل `BodyParameters` في `domain/tryon` عمدًا: هي القياسات نفسها التي
 * تُرسل للمزوّد، فتوحيدها يمنع تحويلاً بين شكلين يتفرّقان مع الوقت.
 */
export type ModelCharacteristics = BodyParameters & {
  gender: Gender
  /** تعديل بكلمات المستخدمة — «أكتاف أعرض شوي» */
  refinement?: string
}

export type AiModel = {
  id: string
  name: string
  characteristics: ModelCharacteristics
  /** تقفل الهوية عبر كل إعادة توليد */
  seed: number
  /** معاينة ينتجها مزوّد التجربة لحظة الإنشاء */
  previewImageUrl: string
  isDefault: boolean
  createdAt: string
}

/** على وش يُعرض اللبس: موديل محفوظ، أو صورة المستخدمة الشخصية. */
export type ModelSource = 'model' | 'photo'

/** صورة المستخدمة محفوظة في المتصفح فقط — ما تُرفع لأي مكان في هذي النسخة (§17). */
export type UserPhoto = {
  id: string
  /** رابط كائن أو رابط بيانات يعيش في المتصفح فقط */
  url: string
  fileName: string
  width: number
  height: number
  createdAt: string
}

export type PhotoIssueCode =
  | 'too-small'
  | 'bad-aspect'
  | 'too-dark'
  | 'too-bright'
  | 'low-detail'
  | 'unsupported-type'
  | 'too-large'

export type PhotoIssue = {
  code: PhotoIssueCode
  message: string
  /** المشاكل المانعة توقف التوليد، والتنبيهية تنبّه فقط */
  severity: 'blocking' | 'advisory'
}

export type PhotoValidationResult = {
  ok: boolean
  issues: PhotoIssue[]
  meta: { width: number; height: number; brightness: number; sizeKb: number }
  /**
   * الفحوصات اللي تحتاج خادمًا حقيقيًا (كشف الشخص، اكتمال الجسم، عدد الوجوه)
   * تُذكر هنا صراحة بدل ما تُزيَّف في المتصفح (المبدأ ٤).
   */
  deferredChecks: string[]
}
