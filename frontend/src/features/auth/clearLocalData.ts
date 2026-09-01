/**
 * محو كل أثر للمستخدمة من هذا المتصفح.
 *
 * الحذف على الخادم لا يمسح ما في الجهاز: مخازن Zustand محفوظة في
 * `localStorage`، وصور القطع في IndexedDB. فبلا هذا المحو تفتح **المستخدمة
 * التالية على نفس الجهاز** فتلقى خزانة من سبقها وإطلالاتها ومقاساتها.
 *
 * والمسح **بالبادئة لا بقائمة أسماء**: القائمة تشيخ — يُضاف مخزن جديد وينسى
 * أحدهم إضافته هنا، فتبقى بياناته وحدها ولا يلاحظها أحد. البادئة تلتقط ما
 * يُضاف مستقبلًا بلا تعديل.
 *
 * ويُنادى **بعد نجاح الحذف على الخادم فقط**. محوٌ قبله يعني فقدان بيانات
 * لحساب ما زال قائمًا.
 */
import { APP } from '@/shared/config'

/** قواعد IndexedDB التي يملأها التطبيق. */
const DATABASES = ['dulabi', 'nasaq-look']

function clearPersistedStores(): void {
  try {
    const prefix = `${APP.storagePrefix}.`
    const legacy = `${APP.legacyStoragePrefix}.`
    /*
      المرور بـ`length`/`key(i)` لا بـ`Object.keys`.

      الأخيرة تعتمد على أن التنفيذ يعرض المفاتيح خصائصَ على الكائن — صحيح في
      المتصفح، وغير مضمون في أي تنفيذ آخر. و`Storage` تعرّف `length` و`key`
      صراحةً، فهي العقد الذي نبني عليه.

      ونجمع أولًا ثم نحذف: الحذف أثناء المرور يزحزح الفهارس فتفلت مفاتيح.
    */
    const doomed: string[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (key && (key.startsWith(prefix) || key.startsWith(legacy))) doomed.push(key)
    }
    for (const key of doomed) localStorage.removeItem(key)
  } catch {
    // التخزين معطّل (تصفّح خاص) — ما فيه شيء نمسحه أصلًا
  }
}

/** حذف قاعدة واحدة — لا ننتظر `blocked` إلى الأبد لو كان تبويب آخر ماسكًا لها. */
function dropDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(name)
      request.addEventListener('success', () => resolve(), { once: true })
      request.addEventListener('error', () => resolve(), { once: true })
      // تبويب آخر يمسك القاعدة: نمضي بدل ما نعلّق الواجهة
      request.addEventListener('blocked', () => resolve(), { once: true })
    } catch {
      resolve()
    }
  })
}

/**
 * يمسح المخازن المحفوظة وقواعد الصور.
 *
 * لا يرمي أبدًا: الحساب حُذف فعلًا على الخادم، وفشل تنظيف محلي لا يصح أن
 * يُظهر للمستخدمة أن الحذف فشل.
 */
export async function clearLocalUserData(): Promise<void> {
  clearPersistedStores()
  if (typeof indexedDB === 'undefined') return
  await Promise.all(DATABASES.map(dropDatabase))
}
