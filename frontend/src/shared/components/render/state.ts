/**
 * أي حالة تُعرض — القرار وحده، بلا React.
 *
 * فُصل عن المكوّن عمدًا: هذا هو الجزء الذي يخطئ فعلاً (حالتان تظهران معًا، أو
 * فراغ يظهر فوق خطأ)، وهو الجزء الوحيد الذي يمكن اختباره في هذا المستودع —
 * اختباراته تعمل في بيئة `node` بلا DOM.
 */

export type RenderState = 'error' | 'loading' | 'empty' | 'content'

/**
 * الأولوية: خطأ ← تحميل ← فراغ ← محتوى.
 *
 * **الخطأ أولاً وإن بقي التحميل قائمًا**: إعادة المحاولة تُبقي `loading` مرفوعة
 * أحيانًا مع خطأ سابق لم يُمسح، فتقديم التحميل يخفي السبب ويترك المستخدمة
 * تنتظر شيئًا فشل. والفراغ آخر الثلاثة: «ما عندك شيء» جوابٌ لا يُقال إلا بعد
 * أن نعرف يقينًا — وقبل انتهاء التحميل ما نعرف.
 */
export function resolveRenderState({
  error,
  loading,
  empty,
}: {
  error?: unknown
  loading?: boolean
  empty?: boolean
}): RenderState {
  if (error) return 'error'
  if (loading) return 'loading'
  if (empty) return 'empty'
  return 'content'
}
