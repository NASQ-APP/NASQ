/**
 * آخر إطلالة مولّدة.
 *
 * تعيش في IndexedDB لا في `localStorage`: الصورة الواحدة تقارب الميجابايت،
 * ومخزن Zustand يُكتب كاملاً مع كل تعديل — فحشوها فيه يبطّئ كل ضغطة ويصطدم
 * بسقف التخزين. وهذا كان سبب استثنائها من الحفظ أصلاً: الحجم، لا الحساسية.
 *
 * **لماذا تُحفظ**: التوليدة تكلّف وقتًا ومالاً، وضياعها بمجرد فتح صفحة ثانية
 * يعني دفع الثمن مرتين على نفس النتيجة.
 *
 * تُحفظ معها **بصمة الاختيار**، فترجع الصورة موسومة صحيحًا: مطابقة إن كانت
 * القطع نفسها، و«قديمة» إن تغيّرت. بدون البصمة ترجع صورة تدّعي أنها الحالية.
 *
 * قاعدة مستقلة عن قاعدة صور القطع عمدًا: لا ترقية نسخة على قاعدة تحمل صور
 * المستخدمة، ولا معاملة تتعطّل لو كان تبويب آخر ماسكًا لها.
 */
const DB_NAME = 'nasaq-look'
const DB_VERSION = 1
const STORE = 'last-look'
const KEY = 'current'
/** القوام المعدّل — سجلّ منفصل، لأنه يعيش أطول من الإطلالة ويتبع الموديل. */
const ADAPTED_KEY = 'adapted-model'

export type StoredLook = {
  /** الصورة المولّدة — data URL */
  image: string
  /** بصمة القطع التي وُلّدت منها — بها نعرف إن الصورة قدمت */
  signature: string
}

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

/** الفشل يمرّ بصمت: الحفظ راحة لا شرط، وتعطّله ما يمنع المستخدمة من شيء. */
export async function saveLook(look: StoredLook): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(look, KEY))
  } catch {
    // التخزين معطّل أو ممتلئ — الإطلالة تبقى في الذاكرة لهذي الجلسة
  }
}

export async function readLook(): Promise<StoredLook | undefined> {
  if (typeof indexedDB === 'undefined') return undefined
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(KEY))
    const look = value as StoredLook | undefined
    return look?.image && typeof look.signature === 'string' ? look : undefined
  } catch {
    return undefined
  }
}

export async function clearLook(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(KEY))
  } catch {
    // لا شيء نفعله — الحذف محاولة تنظيف لا عملية حرجة
  }
}

/**
 * القوام المعدّل بعد تطبيق القياسات.
 *
 * يُحفظ **بمعرّف موديله**: القوام يخصّ موديلاً بعينه، فعرضه على موديل آخر
 * يُري المستخدمة جسمًا ليس جسم من اختارت. وبدون الحفظ يرجع الموديل لصورته
 * الأساسية مع كل تنقّل بين الصفحات، فتضيع تعديلة كلّفت وقتًا ومالاً.
 */
export type StoredAdapted = { image: string; modelId: string }

export async function saveAdapted(adapted: StoredAdapted): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(adapted, ADAPTED_KEY))
  } catch {
    // التخزين معطّل — القوام يبقى في الذاكرة لهذي الجلسة
  }
}

export async function readAdapted(): Promise<StoredAdapted | undefined> {
  if (typeof indexedDB === 'undefined') return undefined
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(ADAPTED_KEY))
    const adapted = value as StoredAdapted | undefined
    return adapted?.image && adapted.modelId ? adapted : undefined
  } catch {
    return undefined
  }
}

export async function clearAdapted(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(ADAPTED_KEY))
  } catch {
    // محاولة تنظيف لا عملية حرجة
  }
}
