/**
 * إعداد التخزين المحلي لمخازن Zustand.
 *
 * مكان واحد يحدّد بادئة المفاتيح، ويهاجر بيانات الاسم القديم مرة وحدة عند أول
 * فتح — فما تضيع خزانة مستخدمة بسبب تغيير اسم المشروع.
 *
 * عند وصول الخادم (المرحلة ١): هذي الطبقة هي الوحيدة اللي تتغيّر، والمخازن
 * نفسها ما تتأثر.
 */
import { APP } from '@/shared/config'

export const storageKey = (name: string): string => `${APP.storagePrefix}.${name}`

const legacyKey = (name: string): string => `${APP.legacyStoragePrefix}.${name}`

/**
 * ينقل قيمة المفتاح القديم للمفتاح الجديد إن ما كان الجديد موجودًا.
 * يُنادى قبل تركيب التطبيق.
 */
export function migrateLegacyStorage(names: string[]): void {
  if (typeof window === 'undefined') return
  for (const name of names) {
    const next = storageKey(name)
    const previous = legacyKey(name)
    try {
      if (localStorage.getItem(next) === null) {
        const value = localStorage.getItem(previous)
        if (value !== null) localStorage.setItem(next, value)
      }
    } catch {
      // التخزين معطّل أو ممتلئ — التطبيق يشتغل بدونه
    }
  }
}

/**
 * المخازن اللي كانت موجودة تحت الاسم القديم — قائمة الهجرة لمرة واحدة.
 *
 * **لازم تشمل كل مخزن يُحفَظ**: أي اسم ناقص هنا معناه أن بيانات المستخدمة في
 * ذاك المخزن تبقى تحت المفتاح القديم ويبدأ التطبيق فاضيًا — تخرج من حسابها
 * أو تفقد لوحة الإلهام بلا ما تعرف السبب. عند إضافة مخزن جديد يُضاف اسمه هنا.
 */
export const LEGACY_STORES = [
  'wardrobe',
  'looks',
  'models',
  'studio',
  'travel',
  'profile',
  'inspiration',
  'local-account',
  'session',
  'sidebar',
  'weather',
  'try-pieces',
] as const

/**
 * تُنفَّذ عند تحميل هذا الملف، لا بنداء من `main.tsx`.
 *
 * كل مخزن يستورد `storageKey` من هنا، فهذا الملف ينتهي تنفيذه **قبل** أي
 * مخزن حتمًا — وهذا هو المطلوب: المخزن يقرأ localStorage لحظة إنشائه، فلو
 * جاءت الهجرة بعده قرأ المفتاح الجديد وهو فاضٍ وبدأ التطبيق بخزانة فارغة.
 *
 * النداء من `main.tsx` ما كان يكفي: `import { App }` قبله يحمّل كل المخازن
 * ويرطّبها، فتصير الهجرة متأخرة وتظهر البيانات بعد تحديث ثانٍ فقط.
 */
migrateLegacyStorage([...LEGACY_STORES])
