/**
 * أخطاء بلغة بشر (A-05).
 * الخطأ الخام من المزوّد ما يوصل الواجهة أبدًا — يُترجم هنا لرسالة وتلميح.
 */
import type { TryOnError, TryOnErrorCode } from './types'

export class TryOnFailure extends Error implements TryOnError {
  code: TryOnErrorCode
  hint?: string

  constructor(code: TryOnErrorCode, message: string, hint?: string) {
    super(message)
    this.name = 'TryOnFailure'
    this.code = code
    this.hint = hint
  }
}

const MESSAGES: Record<TryOnErrorCode, TryOnError> = {
  'invalid-image': {
    code: 'invalid-image',
    message: 'الصورة غير صالحة.',
    hint: 'ارفعي صورة JPG أو PNG.',
  },
  'poor-source-image': {
    code: 'poor-source-image',
    message: 'نحتاج صورة أوضح.',
    hint: 'صورة كاملة للجسم، إضاءة جيدة، وشخص واحد فقط.',
  },
  'unsupported-item': {
    code: 'unsupported-item',
    message: 'هذي القطعة ما نقدر نعرضها على الموديل حاليًا.',
  },
  'provider-timeout': {
    code: 'provider-timeout',
    message: 'أخذت وقت أطول من المتوقع.',
    hint: 'جرّبي مرة ثانية.',
  },
  'provider-failure': {
    code: 'provider-failure',
    message: 'ما قدرنا نجهّز الصورة الحين.',
    hint: 'جرّبي مرة ثانية بعد شوي.',
  },
  'limit-reached': {
    code: 'limit-reached',
    message: 'وصلتِ حد التجارب لهذي الساعة.',
    hint: 'ترى خزانتك موجودة — ارجعي بعد شوي.',
  },
  'not-supported-by-provider': {
    code: 'not-supported-by-provider',
    message: 'هذي الميزة تحتاج مزوّد التوليد في الخادم.',
    hint: 'الواجهة جاهزة ومربوطة — ينقص تفعيل المزوّد.',
  },
}

export function toTryOnError(error: unknown): TryOnError {
  if (error instanceof TryOnFailure) {
    return { code: error.code, message: error.message, hint: error.hint }
  }
  return MESSAGES['provider-failure']
}

export const describeError = (code: TryOnErrorCode): TryOnError => MESSAGES[code]
