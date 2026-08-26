/**
 * وش يلبس الموديل الحين في الاستوديو — قائمة قطع من خزانة المستخدمة.
 * منفصلة عن الخزانة نفسها، فالتنسيق ما يعدّل الدولاب أبدًا.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/infrastructure/storage'

type StudioState = {
  selection: string[]
  add: (itemId: string) => void
  remove: (itemId: string) => void
  toggle: (itemId: string) => void
  replaceAll: (itemIds: string[]) => void
  clear: () => void
  has: (itemId: string) => boolean
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      selection: [],
      add: (itemId) =>
        set((s) => (s.selection.includes(itemId) ? s : { selection: [...s.selection, itemId] })),
      remove: (itemId) => set((s) => ({ selection: s.selection.filter((id) => id !== itemId) })),
      toggle: (itemId) =>
        set((s) => ({
          selection: s.selection.includes(itemId)
            ? s.selection.filter((id) => id !== itemId)
            : [...s.selection, itemId],
        })),
      replaceAll: (itemIds) => set({ selection: itemIds }),
      clear: () => set({ selection: [] }),
      has: (itemId) => get().selection.includes(itemId),
    }),
    { name: storageKey('studio') },
  ),
)
