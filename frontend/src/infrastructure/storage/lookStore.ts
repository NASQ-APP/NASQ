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
 *
 * **وكل سجلّ موسوم بصاحبه.** القاعدة تخصّ المتصفّح لا الحساب، فسجلٌّ بلا صاحب
 * يُعرض على كل من يفتح الاستوديو بعده: تخرج المستخدمة، تفتح زائرة الصفحة،
 * فتلقى الموديل لابسًا فستان من سبقها ومكتوبًا فوقه «إطلالتك المولّدة». وهذا
 * تسريب لا خلل عرض — صورة وُلّدت من خزانة أحدهم تُرى بلا حسابه.
 *
 * فالقراءة تطلب الصاحب وتردّ ما ليس له. والزائرة بلا صاحب، فما يُردّ لها شيء.
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
  /** معرّف من ولّدها. سجلّ بلا هذا الحقل من نسخة سابقة، فلا يُردّ لأحد. */
  owner?: string
}

/** هوية القارئ — `undefined` لزائرة بلا حساب، فلا تملك شيئًا هنا. */
export type Owner = string | undefined

/**
 * يردّ السجلّ لصاحبه وحده.
 *
 * مُصدَّرة ومُختبَرة لأنها **قاعدة القاعدة كلّها**، وقلبها سهل: `owner` مفقود
 * في الطرفين يتساوى بـ`undefined === undefined` فيمرّ السجلّ لمن لا يملكه.
 * فالشرطان صريحان: قارئ له هوية، وسجلّ يحمل نفس الهوية.
 */
export const ownedBy = <T extends { owner?: string }>(record: T | undefined, owner: Owner) =>
  owner && record?.owner === owner ? record : undefined

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

export async function readLook(owner: Owner): Promise<StoredLook | undefined> {
  if (typeof indexedDB === 'undefined' || !owner) return undefined
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(KEY))
    const look = value as StoredLook | undefined
    const valid = look?.image && typeof look.signature === 'string' ? look : undefined
    return ownedBy(valid, owner)
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
 *
 * وبمعرّف صاحبه كذلك، ولسبب أثقل: هذا **قوام جسد** بُني من مقاسات صاحبته.
 */
export type StoredAdapted = { image: string; modelId: string; owner?: string }

export async function saveAdapted(adapted: StoredAdapted): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(adapted, ADAPTED_KEY))
  } catch {
    // التخزين معطّل — القوام يبقى في الذاكرة لهذي الجلسة
  }
}

export async function readAdapted(owner: Owner): Promise<StoredAdapted | undefined> {
  if (typeof indexedDB === 'undefined' || !owner) return undefined
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(ADAPTED_KEY))
    const adapted = value as StoredAdapted | undefined
    const valid = adapted?.image && adapted.modelId ? adapted : undefined
    return ownedBy(valid, owner)
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

/**
 * يمحو ما لا يملكه القارئ الحالي.
 *
 * حجب السجلّ عند القراءة يكفي لمنع عرضه، ولا يكفي لمحوه: صورة بحجم ميجابايت
 * وُلّدت من خزانة أحدهم تبقى في متصفّح غيره إلى أن يُولَّد ما يستبدلها. فمع
 * كل حسم للجلسة نمرّ عليها — الزائرة (`undefined`) تمحو كل شيء، ومن دخل بحساب
 * يمحو ما ليس له ويُبقي سجلّه.
 *
 * ولا يرمي: تنظيف فشل لا يصح أن يوقف إقلاع التطبيق.
 */
export async function clearForeignRecords(owner: Owner): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const [look, adapted] = await Promise.all([
      withStore<unknown>('readonly', (store) => store.get(KEY)),
      withStore<unknown>('readonly', (store) => store.get(ADAPTED_KEY)),
    ])
    const foreign = (record: unknown) => {
      const owned = (record as { owner?: string } | undefined)?.owner
      return record !== undefined && (!owner || owned !== owner)
    }
    await Promise.all([
      foreign(look) ? clearLook() : Promise.resolve(),
      foreign(adapted) ? clearAdapted() : Promise.resolve(),
    ])
  } catch {
    // القاعدة غير متاحة — ما فيه شيء نمحوه
  }
}
