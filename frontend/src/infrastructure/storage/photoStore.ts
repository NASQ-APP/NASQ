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

export const deletePhoto = (itemId: string): Promise<undefined> =>
  withStore('readwrite', (store) => store.delete(itemId))

/** يفرّغ كل الصور — تستدعيه «تفريغ الخزانة» و«إرجاع الخزانة التجريبية». */
export const clearPhotos = (): Promise<undefined> =>
  withStore('readwrite', (store) => store.clear())

/** يقرأ كل الصور مرة وحدة عند إقلاع التطبيق ويحوّلها لروابط كائن. */
export async function loadAllPhotos(): Promise<Record<string, string>> {
  if (typeof indexedDB === 'undefined') return {}
  try {
    const keys = await withStore<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
    const blobs = await withStore<Blob[]>('readonly', (store) => store.getAll())
    return Object.fromEntries(
      keys.map((key, index) => [String(key), URL.createObjectURL(blobs[index])]),
    )
  } catch {
    // التخزين معطّل (تصفّح خاص مثلاً) — التطبيق يشتغل بالرسم المتّجه
    return {}
  }
}
