/**
 * عقود التعامل مع صور القطع.
 *
 * منطق نقي: ما فيه React ولا شبكة ولا DOM — عشان يُختبر وحده، ويقدر يشتغل
 * في الخادم بنفس النتيجة لو احتجناه هناك.
 */

export type ImageErrorCode =
  | 'unsupported-type'
  | 'too-large'
  | 'unreadable'
  | 'removal-unavailable'
  | 'removal-failed'
  | 'removal-timeout'
  | 'removal-empty'
  | 'save-failed'

export type ImageError = {
  code: ImageErrorCode
  /** رسالة بلغة بشر — الخطأ الخام ما يوصل الواجهة أبدًا */
  message: string
  /** هل تقدر المستخدمة تكمّل بالصورة الأصلية بدل ما توقف؟ */
  canKeepOriginal: boolean
}

const ERRORS: Record<ImageErrorCode, Omit<ImageError, 'code'>> = {
  'unsupported-type': {
    message: 'صيغة الصورة غير مدعومة.',
    canKeepOriginal: false,
  },
  'too-large': {
    message: 'حجم الصورة أكبر من الحد المسموح.',
    canKeepOriginal: false,
  },
  unreadable: {
    message: 'تعذّر قراءة الصورة، حاولي رفع صورة أخرى.',
    canKeepOriginal: false,
  },
  'removal-unavailable': {
    message: 'إزالة الخلفية غير مفعّلة على الخادم حاليًا.',
    canKeepOriginal: true,
  },
  'removal-failed': {
    message: 'تعذّر إزالة الخلفية حاليًا، يمكنك الاحتفاظ بالصورة الأصلية أو إعادة المحاولة.',
    canKeepOriginal: true,
  },
  'removal-timeout': {
    message: 'انتهت مهلة معالجة الصورة، حاولي مرة أخرى.',
    canKeepOriginal: true,
  },
  'removal-empty': {
    message: 'ما قدرنا نميّز القطعة في الصورة. جرّبي صورة بخلفية أوضح.',
    canKeepOriginal: true,
  },
  'save-failed': {
    message: 'تعذّر حفظ الصورة. حاولي مرة أخرى.',
    canKeepOriginal: false,
  },
}

export const imageError = (code: ImageErrorCode): ImageError => ({ code, ...ERRORS[code] })
