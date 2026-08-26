/**
 * الموديل والصورة الشخصية.
 *
 * الموديل المحفوظ **هوية دائمة**: نفس المواصفات تعطي نفس الشخص دائمًا، فما
 * نخترع شخصًا جديدًا مع كل توليد. البذرة `seed` تقفل هذي الهوية عند المزوّد
 * الحقيقي كمان (المبدأ ٣).
 */
import type { Gender } from '@/domain/shared/types'

export type BodyShape = 'slim' | 'straight' | 'athletic' | 'curvy' | 'plus'
export type HairStyle = 'long' | 'medium' | 'short' | 'tied' | 'covered' | 'bald'
export type AgeRange = '18-24' | '25-34' | '35-44' | '45+'

export type SkinTone = {
  id: string
  name: string
  hex: string
}

/** المطلوب: الجنس والطول وشكل الجسم ولون البشرة. والباقي اختياري (M-02). */
export type ModelCharacteristics = {
  gender: Gender
  heightCm: number
  bodyShape: BodyShape
  skinToneId: string

  weightKg?: number
  hairStyle?: HairStyle
  hairColorHex?: string
  ageRange?: AgeRange

  measurements?: {
    shoulders?: number
    chest?: number
    waist?: number
    hips?: number
  }
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
