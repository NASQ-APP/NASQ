/**
 * روابط عرض الصور المرفوعة.
 *
 * الواجهة تسأل سؤالًا واحدًا: «وين صورة هذا الشيء؟» — وهذا المخزن يجيب برابط
 * جاهز، بلا انتظار غير متزامن في كل رسم.
 *
 * **من وين يجي الرابط**: مع خادم مهيّأ يُرفع الملف لسلّة المستخدمة الخاصة
 * ويُوقَّع رابطه، فتتبعها صورها لأي جهاز. وبلا خادم (تطوير بلا مفاتيح) تبقى
 * البلوبات في IndexedDB كما كانت. الواجهة ما تعرف الفرق.
 *
 * الرفع **متفائل**: نعرض رابط بلوب محلي في اللحظة، ونستبدله بالموقّع لما يصل
 * الخادم. المستخدمة صوّرت قطعتها الحين، فما تنتظر شبكة عشان تشوفها.
 */
import { create } from 'zustand'
import { clearPhotos, deletePhoto, loadAllPhotos, savePhoto } from '@/infrastructure/storage'
import {
  deleteAllPhotos,
  deletePhoto as deleteRemotePhoto,
  signAllPhotos,
  uploadPhoto,
} from '@/infrastructure/wardrobe/photos'
import { supabase } from '@/infrastructure/supabase'
import { hasBackend } from '@/shared/config'

type PhotoState = {
  urls: Record<string, string>
  /**
   * هل انتهت قراءة الروابط؟
   *
   * **الفرق بين «ما لها صورة» و«ما وصلتنا بعد»**. المخزن يبدأ فاضيًا،
   * والقطع تُرسم فورًا من التخزين المحلي بينما التوقيع يحتاج جولة شبكة —
   * فتظهر كل قطعة مصوّرة ككتلة لون، ثم تنقلب صورًا. الكتلة اللونية جواب
   * قاطع («ما لها صورة») يُقال قبل أن نعرف.
   *
   * تصير `true` عند الانتهاء **نجح التوقيع أو فشل**: الحالتان تعنيان أننا
   * عرفنا، والفشل يستحق الكتلة اللونية فعلاً.
   */
  hydrated: boolean
  hydrate: () => Promise<void>
  set: (itemId: string, blob: Blob) => Promise<void>
  remove: (itemId: string) => Promise<void>
  clear: () => Promise<void>
}

/** مُعرِّف الجلسة — كل مسارات التخزين تبدأ به. */
async function userId(): Promise<string | undefined> {
  if (!supabase) return undefined
  const { data } = await supabase.auth.getUser()
  return data.user?.id
}

const revoke = (url?: string) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const useItemPhotos = create<PhotoState>((set, get) => ({
  urls: {},
  hydrated: false,

  hydrate: async () => {
    if (!hasBackend()) {
      set({ urls: await loadAllPhotos(), hydrated: true })
      return
    }

    const id = await userId()
    // بلا جلسة ما فيه صور تُقرأ — والحارس يوجّه للدخول أصلاً
    if (!id) return set({ urls: {}, hydrated: true })

    try {
      set({ urls: await signAllPhotos(id), hydrated: true })
    } catch {
      // تعذّر توقيع الروابط: القطع ترجع لرسمها المتّجه بدل صور مكسورة
      set({ urls: {}, hydrated: true })
    }
  },

  set: async (itemId, blob) => {
    // الصورة تبين فورًا، والرفع يلحق
    const preview = URL.createObjectURL(blob)
    revoke(get().urls[itemId])
    set((state) => ({ urls: { ...state.urls, [itemId]: preview } }))

    if (!hasBackend()) {
      await savePhoto(itemId, blob)
      return
    }

    const id = await userId()
    if (!id) return

    await uploadPhoto(id, itemId, blob)

    // نستبدل رابط البلوب بالموقّع: البلوب يموت مع التبويب، والموقّع يعيش
    // على أي جهاز تفتح منه.
    try {
      const signed = await signAllPhotos(id)
      if (signed[itemId]) {
        revoke(get().urls[itemId])
        set((state) => ({ urls: { ...state.urls, [itemId]: signed[itemId] } }))
      }
    } catch {
      // التوقيع فشل بس الرفع نجح — البلوب المحلي يكفي لهذي الجلسة
    }
  },

  remove: async (itemId) => {
    revoke(get().urls[itemId])
    set((state) => {
      const { [itemId]: _dropped, ...rest } = state.urls
      return { urls: rest }
    })

    if (!hasBackend()) return deletePhoto(itemId)

    const id = await userId()
    if (id) await deleteRemotePhoto(id, itemId)
  },

  clear: async () => {
    for (const url of Object.values(get().urls)) revoke(url)
    set({ urls: {} })

    if (!hasBackend()) return clearPhotos()

    const id = await userId()
    if (id) await deleteAllPhotos(id)
  },
}))

/** الصورة المعروضة للقطعة: المرفوعة أولاً، ثم الصورة المرفقة مع القطعة. */
export const photoUrlFor = (itemId?: string): string | undefined =>
  itemId ? useItemPhotos.getState().urls[itemId] : undefined
