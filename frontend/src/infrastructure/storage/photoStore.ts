/**
 * صور القطع التي ترفعها المستخدمة.
 *
 * تعيش في IndexedDB مو في localStorage: الصورة الواحدة عشرات الكيلوبايتات،
 * ومخزن Zustand يُكتب كاملاً مع كل تعديل — فحشو الصور فيه يبطّئ كل عملية
 * ويصطدم بسقف التخزين بسرعة.
 *
 * عند وصول الخادم (المرحلة ٢): يُستبدل هذا الملف برفع إلى Supabase Storage،
 * ولا يتغيّر أي مكوّن واجهة.
 */
const DB_NAME = 'dulabi'
const DB_VERSION = 1
const STORE = 'item-photos'

let connection: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
  return connection
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE))
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

export const savePhoto = (itemId: string, blob: Blob): Promise<IDBValidKey> =>
  withStore('readwrite', (store) => store.put(blob, itemId))

/** يقرأ بلوب قطعة وحدة — تحتاجه التجربة الافتراضية لتركيب المراجع. */
export const readPhoto = async (itemId: string): Promise<Blob | undefined> => {
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(itemId))
    return value instanceof Blob ? value : undefined
  } catch {
    return undefined
  }
}

export const deletePhoto = (itemId: string): Promise<undefined> =>
  withStore('readwrite', (store) => store.delete(itemId))

/** يفرّغ كل الصور — تستدعيه «تفريغ الخزانة» و«إرجاع الخزانة التجريبية». */
export const clearPhotos = (): Promise<undefined> =>
  withStore('readwrite', (store) => store.clear())

/** يقرأ كل الصور مرة وحدة عند إقلاع التطبيق ويحوّلها لروابط كائن. */
export async function loadAllPhotos(): Promise<Record<string, string>> {
  if (typeof indexedDB === 'undefined') return {}

  try {
    const db = await open()
    return await new Promise<Record<string, string>>((resolve, reject) => {
      const urls: Record<string, string> = {}
      // مؤشّر داخل معاملة واحدة: المفتاح وقيمته يُقرآن معًا.
      // قراءة المفاتيح والقيم في معاملتين منفصلتين تسمح بتعديل بينهما،
      // فتنزاح المصفوفتان وتنربط صورة القطعة بقطعة ثانية.
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor()

      request.addEventListener('success', () => {
        const cursor = request.result
        if (!cursor) {
          resolve(urls)
          return
        }
        if (cursor.value instanceof Blob) {
          urls[String(cursor.key)] = URL.createObjectURL(cursor.value)
        }
        cursor.continue()
      })
      request.addEventListener('error', () => reject(request.error))
    })
  } catch {
    // التخزين معطّل (تصفّح خاص مثلاً) — التطبيق يشتغل بلا صور
    return {}
  }
}
