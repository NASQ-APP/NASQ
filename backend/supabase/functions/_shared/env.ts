import { HandledError } from './response.ts'

/**
 * قراءة أسرار الخادم.
 *
 * قاعدة أمنية (§17): مفتاح `service_role` ومفاتيح مزوّدي الذكاء تعيش هنا
 * فقط — داخل بيئة الدالة — وما تنزل الفرونت-إند أبدًا.
 */
export const requireEnv = (key: string): string => {
  const value = Deno.env.get(key)
  if (!value) {
    throw new HandledError('not-supported-by-provider', 'الخدمة غير مفعّلة على الخادم.', 503)
  }
  return value
}

export const optionalEnv = (key: string, fallback = ''): string => Deno.env.get(key) ?? fallback

export const SUPABASE_URL = () => requireEnv('SUPABASE_URL')
export const SERVICE_ROLE_KEY = () => requireEnv('SUPABASE_SERVICE_ROLE_KEY')

/** المزوّد المفعَّل حاليًا واسمه — يُقرأ من البيئة، ما يُذكر في الواجهة. */
export const TRYON_PROVIDER = () => optionalEnv('TRYON_PROVIDER', 'none')

/** السقف اليومي للتوليد لكل مستخدمة (S-09). */
export const DAILY_RENDER_LIMIT = () => Number(optionalEnv('DAILY_RENDER_LIMIT', '20'))
