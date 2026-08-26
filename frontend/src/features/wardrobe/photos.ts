/**
 * روابط عرض صور القطع المرفوعة.
 *
 * البلوبات في IndexedDB (`infrastructure/storage`)، وهنا نحتفظ بروابط الكائن
 * الجاهزة عشان `ItemImage` تقرأها فورًا بدون انتظار غير متزامن في كل رسم.
 */
import { create } from 'zustand'
import { clearPhotos, deletePhoto, loadAllPhotos, savePhoto } from '@/infrastructure/storage'

type PhotoState = {
  urls: Record<string, string>
  hydrate: () => Promise<void>
  set: (itemId: string, blob: Blob) => Promise<void>
  remove: (itemId: string) => Promise<void>
  clear: () => Promise<void>
}

export const useItemPhotos = create<PhotoState>((set, get) => ({
  urls: {},

  hydrate: async () => {
    set({ urls: await loadAllPhotos() })
  },

  set: async (itemId, blob) => {
    await savePhoto(itemId, blob)
    const previous = get().urls[itemId]
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous)
    set((state) => ({ urls: { ...state.urls, [itemId]: URL.createObjectURL(blob) } }))
  },

  remove: async (itemId) => {
    await deletePhoto(itemId)
    const previous = get().urls[itemId]
    if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous)
    set((state) => {
      const { [itemId]: _dropped, ...rest } = state.urls
      return { urls: rest }
    })
  },

  clear: async () => {
    await clearPhotos()
    for (const url of Object.values(get().urls)) {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    }
    set({ urls: {} })
  },
}))

/** الصورة المعروضة للقطعة: المرفوعة أولاً، ثم الصورة المرفقة مع القطعة. */
export const photoUrlFor = (itemId?: string): string | undefined =>
  itemId ? useItemPhotos.getState().urls[itemId] : undefined
