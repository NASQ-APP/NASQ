/**
 * الخزانة — المصدر الوحيد للحقيقة في التطبيق كله.
 *
 * تعيش على الجهاز: الخزانة شي شخصي، وفي هذي النسخة ما يُرفع شي لأي مكان.
 * كل ما بعدها (الاستوديو، الستايليست، السفر، الإطلالات) يقرأ القطع من هنا.
 *
 * عند وصول الخادم (المرحلة ١): طبقة الحفظ فقط هي اللي تتغيّر، والواجهة ثابتة.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_ITEMS, SEED_WARDROBES } from '@/data/seed'
import { storageKey } from '@/infrastructure/storage'
import { stamp, uid } from '@/shared/lib'
import { useItemPhotos } from './photos'
import type { Wardrobe, WardrobeItem } from '@/domain/wardrobe'

type WardrobeState = {
  wardrobes: Wardrobe[]
  items: WardrobeItem[]

  createWardrobe: (name: string, nameLatin?: string) => Wardrobe
  renameWardrobe: (id: string, name: string, nameLatin?: string) => void
  deleteWardrobe: (id: string) => void

  addItem: (item: Omit<WardrobeItem, 'id' | 'addedAt' | 'favorite'>) => WardrobeItem
  updateItem: (id: string, patch: Partial<WardrobeItem>) => void
  moveItem: (id: string, wardrobeId: string) => void
  deleteItem: (id: string) => void
  toggleFavorite: (id: string) => void

  resetToSeed: () => void
  clearAll: () => void
}

export const useWardrobe = create<WardrobeState>()(
  persist(
    (set) => ({
      wardrobes: SEED_WARDROBES,
      items: SEED_ITEMS,

      createWardrobe: (name, nameLatin) => {
        const wardrobe: Wardrobe = {
          id: uid('w'),
          name: name.trim(),
          nameLatin: nameLatin?.trim() || 'Wardrobe',
          createdAt: stamp(),
          updatedAt: stamp(),
        }
        set((state) => ({ wardrobes: [...state.wardrobes, wardrobe] }))
        return wardrobe
      },

      renameWardrobe: (id, name, nameLatin) =>
        set((state) => ({
          wardrobes: state.wardrobes.map((w) =>
            w.id === id
              ? { ...w, name, nameLatin: nameLatin ?? w.nameLatin, updatedAt: stamp() }
              : w,
          ),
        })),

      /** حذف الخزانة لا يحذف قطعها أبدًا — تنتقل لأول خزانة متبقية. */
      deleteWardrobe: (id) =>
        set((state) => {
          const remaining = state.wardrobes.filter((w) => w.id !== id)
          const fallback = remaining[0]?.id ?? null
          return {
            wardrobes: remaining,
            items: state.items.map((item) =>
              item.wardrobeId === id ? { ...item, wardrobeId: fallback } : item,
            ),
          }
        }),

      addItem: (input) => {
        const item: WardrobeItem = { ...input, id: uid('item'), favorite: false, addedAt: stamp() }
        set((state) => ({
          items: [item, ...state.items],
          wardrobes: state.wardrobes.map((w) =>
            w.id === item.wardrobeId ? { ...w, updatedAt: stamp() } : w,
          ),
        }))
        return item
      },

      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        })),

      /** نقل قطعة تجربة للخزانة = قرار يدوي صريح يحوّلها لقطعة مملوكة (I-03). */
      moveItem: (id, wardrobeId) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, wardrobeId, source: 'wardrobe' as const } : item,
          ),
          wardrobes: state.wardrobes.map((w) =>
            w.id === wardrobeId ? { ...w, updatedAt: stamp() } : w,
          ),
        })),

      /** حذف القطعة يحذف صورتها المرفوعة معها — ما نخلّي ملفات يتيمة. */
      deleteItem: (id) => {
        void useItemPhotos.getState().remove(id)
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
      },

      toggleFavorite: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, favorite: !item.favorite } : item,
          ),
        })),

      resetToSeed: () => {
        void useItemPhotos.getState().clear()
        set({ wardrobes: SEED_WARDROBES, items: SEED_ITEMS })
      },

      clearAll: () => {
        void useItemPhotos.getState().clear()
        set({ wardrobes: [SEED_WARDROBES[0]], items: [] })
      },
    }),
    { name: storageKey('wardrobe') },
  ),
)

/* ---------------- محدّدات خارج التفاعل ---------------- */

export const itemById = (id: string): WardrobeItem | undefined =>
  useWardrobe.getState().items.find((item) => item.id === id)

export const wardrobeById = (id?: string | null): Wardrobe | undefined =>
  useWardrobe.getState().wardrobes.find((wardrobe) => wardrobe.id === id)
