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

/** المخازن اللي كانت موجودة تحت الاسم القديم — قائمة الهجرة لمرة واحدة. */
export const LEGACY_STORES = [
  'wardrobe',
  'looks',
  'models',
  'studio',
  'travel',
  'profile',
  'try-pieces',
] as const
