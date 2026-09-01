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
  /** الستايليست: local = قواعد في المتصفح · backend = نموذج خلف الخادم */
  stylistProvider: read(import.meta.env.VITE_STYLIST_PROVIDER, 'local') as 'local' | 'backend',
  /**
   * عنوان دالة الوكيل وحدها.
   *
   * منفصل عن `apiBase` عن قصد: بقية الدوال منشورة على Supabase، أما الوكيل
   * فيمرّ بوسيط خادم التطوير (`/__dev`) حيث يُقرأ المفتاح بلا ما ينزل الحزمة.
   */
  agentBase: read(import.meta.env.VITE_AGENT_BASE, '/__dev'),
  /** الطقس: open-meteo = خدمة مفتوحة بلا مفتاح · off = الميزة مطفأة */
  weatherProvider: read(import.meta.env.VITE_WEATHER_PROVIDER, 'open-meteo') as 'open-meteo' | 'off',
  /*
    لا مفاتيح مزوّدي ذكاء هنا.

    أي متغيّر `VITE_` يُخبز في حزمة البناء ويقرأه أي زائر، فمكان المفاتيح
    بيئة دوال الحافة وحدها (§17). التوليد يمرّ بـ`images-generate`.
  */
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY),
  apiBase: read(import.meta.env.VITE_API_BASE, '/api'),
} as const

/** هل الباك-إند مهيّأ فعلاً؟ الواجهة تشتغل محليًا لو لا. */
export const hasBackend = (): boolean => Boolean(env.supabaseUrl && env.supabaseAnonKey)
