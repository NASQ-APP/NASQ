/**
 * قراءة متغيّرات البيئة في مكان واحد ومحوّلة لأنواع صريحة.
 *
 * قاعدة أمنية (§17): المتصفح ما يشوف إلا `anon key`. مفتاح `service_role`
 * ومفاتيح مزوّدي الذكاء تعيش في الباك-إند حصريًا وما تنزل هنا أبدًا.
 */
const read = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.length > 0 ? value : fallback

export const env = {
  /** إزالة الخلفية: local = خوارزمية في المتصفح · backend = مزوّد خلف الخادم */
  backgroundRemoval: read(import.meta.env.VITE_BACKGROUND_REMOVAL, 'local') as 'local' | 'backend',
  /** الطقس: open-meteo = خدمة مفتوحة بلا مفتاح · off = الميزة مطفأة */
  weatherProvider: read(import.meta.env.VITE_WEATHER_PROVIDER, 'open-meteo') as 'open-meteo' | 'off',
  /**
   * مفتاح OpenRouter — **نموذج أولي محلي فقط.**
   *
   * أي متغيّر `VITE_` يُخبز في حزمة البناء ويقدر أي أحد يقرأه، وهذا المفتاح
   * مربوط برصيد مدفوع فالكشف يعني استهلاك مال. غير صالح للنشر: عند الإنتاج
   * ينتقل النداء خلف خادم ويصير المفتاح في بيئته.
   */
  openRouterApiKey: read(import.meta.env.VITE_OPENROUTER_API_KEY),
  /** اسم نموذج الصور — مكان واحد، ما يتكرر في الملفات */
  openRouterImageModel: read(
    import.meta.env.VITE_OPENROUTER_IMAGE_MODEL,
    'google/gemini-3.1-flash-image',
  ),
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiBase: read(import.meta.env.VITE_API_BASE, '/api'),
} as const

/** هل الباك-إند مهيّأ فعلاً؟ الواجهة تشتغل محليًا لو لا. */
export const hasBackend = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey)
