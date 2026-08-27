/**
 * قراءة متغيّرات البيئة في مكان واحد ومحوّلة لأنواع صريحة.
 *
 * قاعدة أمنية (§17): المتصفح ما يشوف إلا `anon key`. مفتاح `service_role`
 * ومفاتيح مزوّدي الذكاء تعيش في الباك-إند حصريًا وما تنزل هنا أبدًا.
 */
const read = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback

export const env = {
  /** local = تركيب محلي في المتصفح · backend = مزوّد حقيقي خلف Edge Function */
  tryOnProvider: read(import.meta.env.VITE_TRYON_PROVIDER, 'local') as 'local' | 'backend',
  /** إزالة الخلفية: local = خوارزمية في المتصفح · backend = مزوّد خلف الخادم */
  backgroundRemoval: read(import.meta.env.VITE_BACKGROUND_REMOVAL, 'local') as 'local' | 'backend',
  /** الطقس: open-meteo = خدمة مفتوحة بلا مفتاح · off = الميزة مطفأة */
  weatherProvider: read(import.meta.env.VITE_WEATHER_PROVIDER, 'open-meteo') as 'open-meteo' | 'off',
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiBase: read(import.meta.env.VITE_API_BASE, '/api'),
} as const

/** هل الباك-إند مهيّأ فعلاً؟ الواجهة تشتغل محليًا لو لا. */
export const hasBackend = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey)
